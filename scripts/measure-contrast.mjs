/**
 * Measures text contrast against the ACTUAL rendered pixels behind it.
 *
 * Hides the text, screenshots the region its glyphs occupy, then compares every
 * sampled background pixel with the text's computed colour. Reports the worst
 * case, because that is the pixel a reader actually struggles with.
 */
import { writeFileSync } from "node:fs";
import sharp from "sharp";

const CDP = "http://127.0.0.1:9222";
const list = await (await fetch(`${CDP}/json/list`)).json();
const page = list.find((t) => t.type === "page");
const ws = new WebSocket(page.webSocketDebuggerUrl);
await new Promise((r) => (ws.onopen = r));

let id = 0;
const pending = new Map();
ws.onmessage = (e) => {
  const m = JSON.parse(e.data);
  if (m.id && pending.has(m.id)) {
    const { resolve, reject } = pending.get(m.id);
    pending.delete(m.id);
    m.error ? reject(new Error(JSON.stringify(m.error))) : resolve(m.result);
  }
};
const send = (method, params = {}) =>
  new Promise((resolve, reject) => {
    const n = ++id;
    pending.set(n, { resolve, reject });
    ws.send(JSON.stringify({ id: n, method, params }));
  });

const evaluate = async (expression) => {
  const { result } = await send("Runtime.evaluate", {
    expression,
    returnByValue: true,
    // So the rAF flush below is actually waited on rather than returning a
    // pending promise handle.
    awaitPromise: true,
  });
  return result.value;
};

const lum = ([r, g, b]) => {
  const f = (v) => {
    const c = v / 255;
    return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  };
  return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
};
const ratio = (a, b) => {
  const [hi, lo] = lum(a) > lum(b) ? [lum(a), lum(b)] : [lum(b), lum(a)];
  return (hi + 0.05) / (lo + 0.05);
};
const parseColor = (css) => css.match(/\d+(\.\d+)?/g).slice(0, 3).map(Number);
const alphaOf = (css) => {
  const parts = css.match(/\d+(\.\d+)?/g);
  return parts.length > 3 ? Number(parts[3]) : 1;
};

await send("Page.enable");
await send("Runtime.enable");

const url = process.argv[2] ?? "http://localhost:3000/";
const width = Number(process.argv[3] ?? 1440);
const targets = JSON.parse(process.argv[4]);

await send("Emulation.setDeviceMetricsOverride", {
  width,
  height: 900,
  deviceScaleFactor: 1,
  mobile: false,
});
await send("Page.navigate", { url });
await new Promise((r) => setTimeout(r, 2200));

console.log(`\n${url}  @${width}px`);
console.log("ratio   need  verdict            selector");

let worstFail = null;
let measured = 0;

for (const { selector, label, large, scrollTo } of targets) {
  if (scrollTo) {
    /**
     * `html { scroll-behavior: smooth }` means `scrollIntoView` animates. A fixed
     * sleep is not enough: read an element's rect while the page is still moving
     * and the screenshot taken a moment later shows a different scroll offset, so
     * the crop lands on whatever has slid into that rectangle — a light section
     * above, in the case that sent me chasing this. Poll until the offset is
     * genuinely stable, then measure.
     */
    await evaluate(`(() => {
      document.querySelector(${JSON.stringify(scrollTo)})?.scrollIntoView({ block: "center" });
      return new Promise((resolve) => {
        let last = -1;
        let stable = 0;
        let elapsed = 0;
        const step = 40;
        const timer = setInterval(() => {
          const y = window.scrollY;
          stable = y === last ? stable + 1 : 0;
          last = y;
          elapsed += step;
          if (stable >= 5 || elapsed >= 4000) {
            clearInterval(timer);
            // One more beat for the parallax transform to catch up.
            setTimeout(resolve, 260);
          }
        }, step);
      });
    })()`);
  }

  /**
   * Read the rect only once it has stopped moving.
   *
   * Several things on this page move an element after it first has a rect:
   * smooth scrolling, the `Reveal` components' entry transform, and the parallax
   * transform. Measure against a rect that is still settling and the crop taken a
   * moment later samples whatever has moved into that rectangle — which produced
   * a confident 1.07:1 "failure" that was really a hairline rule two sections
   * away. Requiring two identical reads makes the tool trustworthy.
   */
  const info = await evaluate(`(() => {
    const el = document.querySelector(${JSON.stringify(selector)});
    if (!el) return null;
    const read = () => {
      const r = el.getBoundingClientRect();
      return { x: r.x, y: r.y, w: r.width, h: r.height };
    };
    const same = (a, b) =>
      Math.abs(a.x - b.x) < 0.5 && Math.abs(a.y - b.y) < 0.5 &&
      Math.abs(a.w - b.w) < 0.5 && Math.abs(a.h - b.h) < 0.5;
    // Timer-based rather than rAF-based: requestAnimationFrame can be throttled
    // to a standstill in a headless window with nothing animating, which hung
    // this loop indefinitely.
    return new Promise((resolve) => {
      let previous = read();
      let stable = 0;
      let elapsed = 0;
      const step = 40;
      const timer = setInterval(() => {
        const current = read();
        stable = same(previous, current) ? stable + 1 : 0;
        previous = current;
        elapsed += step;
        if (stable >= 5 || elapsed >= 2500) {
          clearInterval(timer);
          const cs = getComputedStyle(el);
          resolve({ ...current, color: cs.color,
                    size: parseFloat(cs.fontSize), weight: cs.fontWeight,
                    settled: stable >= 5 });
        }
      }, step);
    });
  })()`);

  if (!info) {
    console.log(`  --     --   NOT FOUND          ${selector}`);
    continue;
  }
  /**
   * Reject anything not *fully* inside the viewport, not just anything fully
   * outside it.
   *
   * The crop is clamped to the viewport, so an element half above the fold gets
   * its rectangle silently moved onto whatever is at the top of the screen — the
   * cream header, in the case that produced a confident 1.02:1 for light text
   * that actually sits on a dark ground. A partially visible element cannot be
   * measured honestly, so it is skipped and says so.
   */
  const viewportHeight = 900;
  if (info.w < 2 || info.h < 2) {
    console.log(`  --     --   ZERO SIZE          ${selector}`);
    continue;
  }
  if (info.y < 0 || info.y + info.h > viewportHeight) {
    console.log(`  --     --   NOT FULLY VISIBLE  ${selector}`);
    continue;
  }

  // Hide only this element's glyphs, so what remains is exactly its backdrop.
  const hidden = await evaluate(`(() => {
    const el = document.querySelector(${JSON.stringify(selector)});
    el.style.setProperty("visibility", "hidden", "important");
    return getComputedStyle(el).visibility;
  })()`);
  if (hidden !== "hidden") {
    console.log(`  --     --   COULD NOT HIDE     ${selector}`);
    continue;
  }

  /**
   * Wait for the compositor to actually produce a frame with the element hidden.
   *
   * At 120ms this sampled a stale frame often enough to matter: the screenshot
   * still contained the glyphs, so the "background" it measured was the text
   * colour and the ratio came back as 1.00 — a false failure that looks exactly
   * like a real one. Two animation frames plus a margin is reliable.
   */
  await evaluate(
    `new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)))`,
  );
  await new Promise((r) => setTimeout(r, 350));

  /**
   * Capture the whole viewport and crop with sharp, rather than passing `clip`.
   *
   * `Page.captureScreenshot`'s `clip` is in **page** coordinates, not viewport
   * ones. Feeding it a `getBoundingClientRect()` result works by coincidence at
   * `scrollY === 0` and silently samples a completely different part of the
   * document anywhere else — which is exactly the kind of quiet wrongness this
   * script exists to catch, so it does not get to have it.
   */
  const region = {
    left: Math.round(Math.max(0, info.x)),
    top: Math.round(Math.max(0, info.y)),
    width: Math.round(Math.max(1, Math.min(info.w, width - Math.max(0, info.x)))),
    height: Math.round(Math.max(1, Math.min(info.h, 900 - Math.max(0, info.y)))),
  };
  const { data } = await send("Page.captureScreenshot", { format: "png" });

  await evaluate(`(() => {
    const el = document.querySelector(${JSON.stringify(selector)});
    el.style.removeProperty("visibility");
  })()`);

  const png = Buffer.from(data, "base64");
  const { data: raw, info: meta } = await sharp(png)
    .extract(region)
    .removeAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  const textColor = parseColor(info.color);
  const alpha = alphaOf(info.color);

  let worst = Infinity;
  let worstPx = null;
  for (let i = 0; i < raw.length; i += meta.channels * 3) {
    const bg = [raw[i], raw[i + 1], raw[i + 2]];
    // Text drawn with alpha composites over its own backdrop.
    const effective = textColor.map((c, k) => c * alpha + bg[k] * (1 - alpha));
    const r = ratio(effective, bg);
    if (r < worst) {
      worst = r;
      worstPx = bg;
    }
  }

  measured += 1;
  const isLarge = large ?? (info.size >= 24 || (info.size >= 18.66 && Number(info.weight) >= 700));
  const need = isLarge ? 3 : 4.5;
  const pass = worst >= need;
  if (!pass && (!worstFail || worst < worstFail.worst)) {
    worstFail = { selector, worst, need };
  }

  console.log(
    `${worst.toFixed(2).padStart(6)}  ${String(need).padStart(4)}  ` +
      `${(pass ? "PASS" : "FAIL").padEnd(6)} ${isLarge ? "(large)" : "(small)"}  ` +
      `${label ?? selector}  bg≈rgb(${worstPx.join(",")})`,
  );
}

/**
 * Report what was measured, not just what failed.
 *
 * An earlier version printed "All sampled text clears WCAG AA" when every
 * selector had been NOT FOUND — because nothing failed, since nothing ran. A
 * check that reports success when it did no work is worse than no check.
 */
console.log(
  worstFail
    ? `\nWORST FAILURE: ${worstFail.selector} at ${worstFail.worst.toFixed(2)}:1, needs ${worstFail.need}:1\n`
    : measured === 0
      ? "\nNOTHING MEASURED — every selector was missing or off screen. This is not a pass.\n"
      : `\nAll ${measured} sampled element(s) clear WCAG AA against the real rendered pixels.\n`,
);

ws.close();
process.exit(worstFail || measured === 0 ? 1 : 0);

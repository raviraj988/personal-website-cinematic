#!/usr/bin/env node
/**
 * BRAND LINT — checks the site against the ESE kit.
 *
 * The kit lives in `scripts/brand/spec.json`, transcribed from
 * `ref_docs/brand/colors-and-fonts.jpg`. This file only tests against it.
 *
 *   npm run lint:brand           every check
 *   npm run lint:brand -- --fix  nothing; there is no autofix, the report is the point
 *
 * Every check that fails prints the offending selector and the value, so the
 * output is actionable rather than a score. Exits non-zero if anything fails,
 * which is what makes it usable in CI.
 *
 * It reads SOURCE CSS and resolves `var()` chains itself, so it runs without a
 * build. Where a check can only be answered by the shipped stylesheet it says so.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const SPEC = JSON.parse(fs.readFileSync(path.join(ROOT, "scripts/brand/spec.json"), "utf8"));

/* ------------------------------------------------------------------ colour */

const hex = (h) => {
  h = h.replace("#", "");
  if (h.length === 3) h = [...h].map((c) => c + c).join("");
  return [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16));
};
const toHex = (rgb) => "#" + rgb.map((v) => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, "0")).join("");
const lum = ([r, g, b]) => {
  const f = (c) => { c /= 255; return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4; };
  return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
};
const contrast = (a, b) => {
  const [x, y] = [lum(hex(a)) + 0.05, lum(hex(b)) + 0.05].sort((p, q) => q - p);
  return x / y;
};
const hue = (h) => {
  const [r, g, b] = hex(h).map((v) => v / 255);
  const max = Math.max(r, g, b), min = Math.min(r, g, b), d = max - min;
  if (!d) return 0;
  let x = max === r ? ((g - b) / d) % 6 : max === g ? (b - r) / d + 2 : (r - g) / d + 4;
  return ((x * 60) + 360) % 360;
};
const hueGap = (a, b) => { const d = Math.abs(a - b) % 360; return d > 180 ? 360 - d : d; };

const PALETTE = Object.entries(SPEC.palette).map(([name, v]) => ({ name, hex: v.hex.toLowerCase(), neutral: !!v.neutral }));
const KIT = new Set(PALETTE.map((p) => p.hex));
/**
 * An exception belongs to a SELECTOR, not to a colour. Granting #ffffff
 * globally would exempt every raw white on the site, which is exactly the rule
 * the kit cares about — so each one names the selectors that earned it.
 */
const EXC_BY_HEX = new Map(Object.entries(SPEC.allowedExceptions).map(([h, v]) => [h.toLowerCase(), v.selectors]));
const excused = (hexValue, selector) =>
  (EXC_BY_HEX.get(hexValue) ?? []).some((s) => selector.includes(s));
/** #fff and #ffffff are the same colour; the spec lists the long form. */
const norm = (h) => {
  h = h.toLowerCase();
  return h.length === 4 ? "#" + [...h.slice(1)].map((c) => c + c).join("") : h;
};

/* --------------------------------------------------------------- css model */

const CSS_FILES = [
  "src/app/globals.css",
  ...fs.readdirSync(path.join(ROOT, "src/styles")).filter((f) => f.endsWith(".css")).map((f) => `src/styles/${f}`),
];
const stripComments = (s) => s.replace(/\/\*[\s\S]*?\*\//g, "");
const sources = CSS_FILES.map((f) => ({ file: f, css: stripComments(fs.readFileSync(path.join(ROOT, f), "utf8")) }));
const ALL = sources.map((s) => s.css).join("\n");

const tokens = new Map();
for (const m of ALL.matchAll(/(--[\w-]+)\s*:\s*([^;}]+)/g)) if (!tokens.has(m[1])) tokens.set(m[1], m[2].trim());
const resolve = (v, depth = 0) => depth > 12 ? v : v.replace(/var\(\s*(--[\w-]+)\s*(?:,\s*([^()]*))?\)/g,
  (_, name, fb) => tokens.has(name) ? resolve(tokens.get(name), depth + 1) : (fb ? resolve(fb, depth + 1) : "?"));

/** Every flat rule as { file, selector, body }. */
const rules = [];
for (const { file, css } of sources)
  for (const m of css.matchAll(/([^{}]+)\{([^{}]*)\}/g))
    rules.push({ file, selector: m[1].trim().split("\n").pop().trim(), body: m[2] });

/** Colour literals inside a resolved value, ignoring gradients' structure. */
const coloursIn = (value) => {
  const out = [];
  for (const m of value.matchAll(/#[0-9a-fA-F]{3,8}\b/g)) out.push({ hex: norm(m[0].length === 4 ? m[0] : m[0].slice(0, 7)), alpha: 1 });
  for (const m of value.matchAll(/rgba?\(\s*(\d+)[\s,]+(\d+)[\s,]+(\d+)\s*(?:[,/]\s*([\d.]+))?/g))
    out.push({ hex: toHex([+m[1], +m[2], +m[3]]), alpha: m[4] === undefined ? 1 : +m[4] });
  return out;
};

/* ----------------------------------------------------------------- runner */

const results = [];
/**
 * `check` fails the run. `warn` reports and does not — for findings that need a
 * human to judge, where a machine cannot tell a real problem from a deliberate
 * choice. Keeping those out of the failure set is what stops the lint being
 * ignored.
 */
const check = (name, fn) => { const fails = []; fn((d) => fails.push(d)); results.push({ name, fails, level: "fail" }); };
const warn  = (name, fn) => { const fails = []; fn((d) => fails.push(d)); results.push({ name, fails, level: "warn" }); };

/* 1 — every painted colour is the kit, a documented exception, or a near tint */
check("colour: every painted value traces to the kit", (fail) => {
  const PROPS = /(?<![-\w])(color|background|background-color|border-color|outline-color|fill|stroke)\s*:\s*([^;}]+)/g;
  for (const { file, selector, body } of rules) {
    if (/mask|filter/.test(body)) continue;                 // mask paint is not a colour
    for (const m of body.matchAll(PROPS)) {
      for (const { hex: h } of coloursIn(resolve(m[2]))) {
        if (KIT.has(h) || excused(h, selector)) continue;
        const near = PALETTE.find((p) => hueGap(hue(h), hue(p.hex)) <= SPEC.hueTolerance);
        if (near) continue;
        fail(`${file}  ${selector.slice(0, 46)}  ${m[1]}: ${h}`);
      }
    }
  }
});

/* 2 — the kit's own instruction about black and white */
check("colour: no raw #ffffff or #000000 as a colour value", (fail) => {
  for (const { file, selector, body } of rules) {
    if (/mask|filter/.test(body)) continue;
    for (const m of body.matchAll(/(?<![-\w])(color|background|background-color|border-color|fill|stroke)\s*:\s*([^;}]+)/g)) {
      const v = resolve(m[2]);
      for (const c of coloursIn(v))
        if ((c.hex === "#ffffff" || c.hex === "#000000") && !excused(c.hex, selector))
          fail(`${file}  ${selector.slice(0, 46)}  ${m[1]}: ${c.hex}`);
    }
  }
});

/* 3 — the four type roles exist and name the kit face first */
check("type: each role names the kit face before its stand-in", (fail) => {
  for (const [role, r] of Object.entries(SPEC.type)) {
    const v = tokens.get(r.token);
    if (!v) { fail(`${r.token} is not defined (role: ${role})`); continue; }
    const first = v.split(",")[0].replace(/["']/g, "").trim();
    if (first.toLowerCase() !== r.face.toLowerCase())
      fail(`${r.token} starts with "${first}", the kit says "${r.face}"`);
  }
});

/* 4 — the sub-heading tracking the kit states */
check("type: sub-heading tracking is the kit's +25", (fail) => {
  const v = (tokens.get("--track-label") || "").trim();
  if (v !== SPEC.type.subheading.tracking)
    fail(`--track-label is "${v || "undefined"}", the kit says ${SPEC.type.subheading.tracking}`);
});

/* 5 — one treatment per caps role, which is what "uniform" means */
check("type: every caps rule uses one role's face and that role's tracking", (fail) => {
  for (const { file, selector, body } of rules) {
    const caps = /text-transform:\s*uppercase/.test(body);
    const disp = /font-family:\s*var\(--font-display\)/.test(body);
    if (!caps && !disp) continue;
    const fam = body.match(/font-family:\s*var\((--font-[\w-]+)\)/)?.[1];
    const track = body.match(/letter-spacing:\s*([^;}]+)/)?.[1]?.trim();
    if (disp) {
      if (fam !== "--font-display") fail(`${file}  ${selector.slice(0, 44)}  display face but font-family is ${fam ?? "unset"}`);
      if (track && track !== "0.01em") fail(`${file}  ${selector.slice(0, 44)}  headline tracking ${track}, expected 0.01em`);
    } else {
      if (fam !== "--font-label") fail(`${file}  ${selector.slice(0, 44)}  caps but font-family is ${fam ?? "unset"}`);
      if (track && track !== "var(--track-label)") fail(`${file}  ${selector.slice(0, 44)}  sub-heading tracking ${track}, expected var(--track-label)`);
    }
  }
});

/* 6 — contrast on every ground the theme blocks actually declare */
check("contrast: text on every declared ground clears 4.5:1", (fail) => {
  const grounds = [];
  for (const m of ALL.matchAll(/html\[data-scroll-theme="([\w-]+)"\][^{]*\{\s*--page-background:\s*([^;}]+)/g))
    grounds.push({ name: m[1], hex: coloursIn(resolve(m[2]))[0]?.hex });
  const over = (fg, bg, a) => toHex(hex(fg).map((c, i) => a * c + (1 - a) * hex(bg)[i]));
  const inks = [
    ["body ink", tokens.get("--color-ink")],
    ["body paper", tokens.get("--color-paper")],
    ["muted on light", tokens.get("--color-text-muted")],
    ["muted on dark", tokens.get("--color-muted-light")],
  ];
  for (const g of grounds) {
    if (!g.hex) continue;
    const dark = lum(hex(g.hex)) < 0.2;
    for (const [label, raw] of inks) {
      if (!raw) continue;
      const c = coloursIn(resolve(raw))[0];
      if (!c) continue;
      // only test the ink that belongs on this ground
      const belongs = dark ? /paper|dark/.test(label) : /ink|light/.test(label);
      if (!belongs) continue;
      const composited = c.alpha < 1 ? over(c.hex, g.hex, c.alpha) : c.hex;
      const ratio = contrast(composited, g.hex);
      if (ratio < SPEC.contrast.text)
        fail(`${label} on "${g.name}" ${g.hex}: ${ratio.toFixed(2)}:1 (needs ${SPEC.contrast.text})`);
    }
  }
});

/* 6b — ACCENT colours as text on the grounds they sit on.
 *
 * Check 6 only measured the ink tokens, so it reported 4.5:1 everywhere while
 * the eyebrow sat at 2.26:1 — a pass that was true of the thing it tested and
 * false of the page. An accent used as TEXT has to be measured like text.
 *
 * A WARNING rather than a failure. The kit's own specimen sets its sub-heading
 * in terracotta on white, and terracotta clears 4.5:1 on none of the light
 * grounds — no orange in the eight does. That is a standing trade between the
 * kit's look and WCAG, and it is the owner's to make; the lint's job is to keep
 * the number visible every run rather than to block on it or hide it. */
warn("contrast: accent colours used as text, measured on their grounds", (fail) => {
  const grounds = [];
  for (const m of ALL.matchAll(/html\[data-scroll-theme="([\w-]+)"\][^{]*\{\s*--page-background:\s*([^;}]+)/g))
    grounds.push({ name: m[1], hex: coloursIn(resolve(m[2]))[0]?.hex });
  // the light grounds carry a constant ink wash laid over them on `body`
  const wash = /background-image:\s*linear-gradient\(rgba\(8,\s*27,\s*35,\s*([\d.]+)/.exec(ALL);
  const a = wash ? Number(wash[1]) : 0;
  const over = (fg, bg, alpha) =>
    toHex(hex(fg).map((c, i) => alpha * c + (1 - alpha) * hex(bg)[i]));

  for (const [token, usedOn] of Object.entries(SPEC.accentUsage ?? {})) {
    if (token.startsWith("_")) continue;
    const raw = tokens.get(token);
    if (!raw) continue;
    const c = coloursIn(resolve(raw))[0];
    if (!c) continue;
    for (const g of grounds) {
      if (!g.hex) continue;
      const light = lum(hex(g.hex)) > 0.2;
      // only the pairings that actually occur — see `accentUsage` in the spec
      if (!usedOn.includes(light ? "light" : "dark")) continue;
      const ground = light && a ? over("#081b23", g.hex, a) : g.hex;
      const ratio = contrast(c.hex, ground);
      if (ratio < SPEC.contrast.text)
        fail(`${token} on "${g.name}" (${ground}): ${ratio.toFixed(2)}:1, under ${SPEC.contrast.text}`);
    }
  }
});

/* 7 — the bug this project keeps hitting: a class in markup with no rule.
 *
 * A WARNING, not a failure. A class with no rule of its own is often fine: it
 * may be a semantic hook (`.people-band` is styled through `.section-shell` and
 * its theme attribute) or reached by an ancestor selector (`.case-study__lede`
 * is styled by `.case-study__copy > p`). But it is also exactly how
 * `.serve-band__intro`, `.section-lede`, `footer-button--ghost` and
 * `.cinematic-footer__actions` each shipped with no styling at all. The list is
 * short enough to scan; the judgement is a person's. */
warn("css: classes in markup that no stylesheet names", (fail) => {
  const tsx = [];
  const walk = (d) => fs.readdirSync(d, { withFileTypes: true }).forEach((e) => {
    const p = path.join(d, e.name);
    if (e.isDirectory()) walk(p); else if (e.name.endsWith(".tsx")) tsx.push(p);
  });
  walk(path.join(ROOT, "src"));
  const used = new Set();
  for (const f of tsx) {
    const s = fs.readFileSync(f, "utf8");
    for (const m of s.matchAll(/className="([^"{}]+)"/g))
      for (const c of m[1].split(/\s+/)) if (/^[a-z][\w-]*$/.test(c)) used.add(c);
  }
  for (const c of [...used].sort()) {
    // a class counts as styled if it is named anywhere, OR reached by an
    // ancestor/element selector — so only test classes nothing mentions at all
    if (new RegExp(`\\.${c.replace(/[-]/g, "\\-")}(?![\\w-])`).test(ALL)) continue;
    fail(`.${c} appears in markup but no stylesheet names it`);
  }
});

/* 8 — absolute URLs must not point at a domain ESE does not own */
check("meta: no placeholder domain in absolute URLs", (fail) => {
  const f = "src/lib/data/ese-content.ts";
  const s = fs.readFileSync(path.join(ROOT, f), "utf8")
    .replace(/\/\*[\s\S]*?\*\//g, "")   // block comments describe the old value
    .replace(/^\s*\/\/.*$/gm, "");
  for (const m of s.matchAll(/https?:\/\/(example\.(com|org)|localhost)[^"'`\s]*/g)) fail(`${f}  ${m[0]}`);
  for (const m of s.matchAll(/[\w.+-]+@example\.(com|org)/g)) fail(`${f}  ${m[0]}`);
});

/* 9 — the logo assets exist and are the trimmed artwork, not a trace */
check("brand: the mark ships as artwork, at the declared ratio", (fail) => {
  const assets = ["ese-logo-light.webp", "ese-logo-dark.webp", "ese-emblem-light.webp", "ese-emblem-dark.webp"];
  for (const a of assets) {
    const p = path.join(ROOT, "public/brand", a);
    if (!fs.existsSync(p)) { fail(`public/brand/${a} is missing`); continue; }
    const kb = fs.statSync(p).size / 1024;
    if (kb > 120) fail(`public/brand/${a} is ${kb.toFixed(0)}KB — over the 120KB budget for a logo`);
  }
  for (const [cls, ratio] of [["--lockup", /aspect-ratio:\s*900\s*\/\s*315/], ["--emblem", /aspect-ratio:\s*520\s*\/\s*517/]])
    if (!ratio.test(ALL)) fail(`.ese-mark${cls} does not declare the trimmed artwork's ratio`);
});

/* 10 — a `var()` that resolves to nothing.
 *
 * THIS SHIPPED. `--heading-ink: var(--heading-navy)` went to production with
 * `--heading-navy` never defined, because the edit that removed two derived
 * shades spliced through the line that defined it. The rule parsed, the build
 * passed, the page rendered — and every heading on a light ground silently kept
 * the colour it had. A custom property that resolves to nothing fails silently
 * by design, which is exactly why it needs a check.
 *
 * Variables set from JavaScript are declared here rather than found, because
 * they legitimately never appear in a stylesheet. Anything else must either be
 * defined in CSS or carry a fallback. */
const RUNTIME_VARS = new Set([
  "--i", "--glow", "--glow-x", "--glow-y", "--reveal-delay", "--parallax-y",
  "--scroll-scale", "--page-progress", "--panel-count", "--menu-index",
  "--edge-colour", "--card-border", "--card-ground", "--card-ink", "--card-meta",
  "--card-muted",
  // next/font writes these onto <html> through the loader's `.variable` class,
  // so they are real at runtime and absent from every stylesheet by design.
  "--font-anton", "--font-montserrat", "--font-newsreader", "--font-caveat",
]);

check("css: no var() resolves to nothing", (fail) => {
  const defined = new Set([...ALL.matchAll(/(--[\w-]+)\s*:/g)].map((m) => m[1]));
  const seen = new Set();
  for (const { file, selector, body } of rules) {
    // `var(--x, fallback)` is safe even when --x is undefined; `var(--x)` is not
    for (const m of body.matchAll(/var\(\s*(--[\w-]+)\s*\)/g)) {
      const name = m[1];
      if (defined.has(name) || RUNTIME_VARS.has(name)) continue;
      const key = name + selector;
      if (seen.has(key)) continue;
      seen.add(key);
      fail(`${file}  ${selector.slice(0, 44)}  var(${name}) — never defined, no fallback`);
    }
  }
});

/* ---------------------------------------------------------------- report */

const pad = (s, n) => s + " ".repeat(Math.max(0, n - s.length));
let failed = 0;
console.log("\n  ESE BRAND LINT   spec: scripts/brand/spec.json\n");
let warned = 0;
for (const r of results) {
  const ok = r.fails.length === 0;
  const tag = ok ? "PASS" : r.level === "warn" ? "WARN" : "FAIL";
  if (!ok) (r.level === "warn" ? warned++ : failed++);
  console.log(`  ${tag}  ${pad(r.name, 60)}${ok ? "" : r.fails.length + " item" + (r.fails.length > 1 ? "s" : "")}`);
  if (!ok) {
    for (const d of r.fails.slice(0, 12)) console.log(`          ${d}`);
    if (r.fails.length > 12) console.log(`          … and ${r.fails.length - 12} more`);
  }
}
const hard = results.filter((r) => r.level !== "warn").length;
console.log(`\n  ${hard - failed}/${hard} required checks passed` + (warned ? `, ${warned} warning${warned > 1 ? "s" : ""}` : "") + "\n");
process.exit(failed ? 1 : 0);

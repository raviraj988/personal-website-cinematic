/**
 * One scroll loop for the whole page.
 *
 * Spec §9 asks us to avoid layout reads on every scroll frame. Every
 * scroll-linked component used to register its own `scroll` + `resize` listener
 * and its own `requestAnimationFrame` throttle, so a page with fourteen
 * parallax images and seven scrubbed headings ran twenty-odd independent
 * loops. They are now subscribers to a single rAF pass: one frame request, one
 * batch of reads, regardless of how many elements are animating.
 */

type Subscriber = () => void;

const subscribers = new Set<Subscriber>();
let frame = 0;
let listening = false;

function flush() {
  frame = 0;
  for (const subscriber of subscribers) subscriber();
}

function queue() {
  if (!frame) frame = window.requestAnimationFrame(flush);
}

function stopListening() {
  listening = false;
  window.removeEventListener("scroll", queue);
  window.removeEventListener("resize", queue);
  if (frame) {
    window.cancelAnimationFrame(frame);
    frame = 0;
  }
}

/**
 * Run `subscriber` once immediately and then on every scroll/resize frame.
 * Returns an unsubscribe function.
 */
export function onScrollFrame(subscriber: Subscriber): () => void {
  subscribers.add(subscriber);

  if (!listening) {
    listening = true;
    window.addEventListener("scroll", queue, { passive: true });
    window.addEventListener("resize", queue);
  }

  subscriber();

  return () => {
    subscribers.delete(subscriber);
    if (subscribers.size === 0) stopListening();
  };
}

/**
 * Call `onChange` with the current reduced-motion preference and again whenever
 * it changes. Previously each component read `matches` once at mount, so
 * toggling the OS setting after load left the animations running.
 */
export function watchReducedMotion(
  onChange: (reduced: boolean) => void,
): () => void {
  const query = window.matchMedia("(prefers-reduced-motion: reduce)");
  const handler = () => onChange(query.matches);

  handler();
  query.addEventListener("change", handler);
  return () => query.removeEventListener("change", handler);
}

/** Progress of an element through the viewport, clamped to 0–1. */
export function viewportProgress(rect: DOMRect): number {
  const travel = window.innerHeight + rect.height;
  return Math.max(0, Math.min(1, (window.innerHeight - rect.top) / travel));
}

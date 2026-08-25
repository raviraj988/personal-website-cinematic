/**
 * Resolve hook: teach Node the three module rules this repo relies on and Node
 * does not implement.
 *
 * Next compiles with bundler-style module resolution. Node's ESM resolver is
 * stricter in three specific ways, and each one is a rule about *this
 * repository* rather than about whatever script is being run — which is why they
 * all live here rather than in a per-script wrapper.
 *
 * Node strips TypeScript types natively, so nothing here compiles anything. Every
 * branch below still hands the work to `next()`, so Node keeps deciding format
 * and doing the type stripping; this file only ever rewrites *what* is being
 * asked for.
 *
 *   1. **Extensionless relative imports.** `import "./image"` finds `image.ts`
 *      under bundler resolution. Node requires the extension. Rather than
 *      writing `./image.ts` throughout the app to suit a test runner — which
 *      bundler resolution rejects without `allowImportingTsExtensions` — this
 *      teaches Node the one rule it is missing.
 *
 *   2. **The `@/*` path alias.** Mirrors `compilerOptions.paths` in
 *      `tsconfig.json` (`@/* -> ./src/*`) and must be edited together with it.
 *      Without this, anything reaching `src/lib/blog/config.ts` or
 *      `src/lib/data/ese-content.ts` from a plain `node` process dies with
 *      `ERR_MODULE_NOT_FOUND: Cannot find package '@/lib'` — and those two are
 *      the site's canonical origin and its entire content layer, so a tool that
 *      cannot read them ends up carrying a second copy of the brand. There is no
 *      collision risk: `@/` is not a legal npm scope, so a specifier starting
 *      with it was never going to resolve as a package.
 *
 *   3. **JSON import attributes.** `ese-content.ts` does
 *      `import manifest from "…/manifest.json"` with no `with { type: "json" }`,
 *      which webpack and Turbopack accept and Node refuses outright
 *      (`ERR_IMPORT_ATTRIBUTE_MISSING`). The attribute is validated against the
 *      *resolve* result's attributes inside Node's `defaultLoad`, so supplying it
 *      here fixes it with no `load` hook. Adding the attribute to the app file
 *      instead would mean editing application code to suit a test runner, which
 *      is the trade rule 1 already refused.
 *
 * This runs on the loader thread, so it may import Node builtins only — no repo
 * modules, no top-level await.
 */
import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";

/** `src/` as a directory URL. This file lives in `scripts/`, hence `../src/`. */
const SRC_URL = new URL("../src/", import.meta.url);

/**
 * Supply the `type: "json"` attribute Node requires and the repo's imports omit.
 *
 * Applied to every return path rather than one branch: a `.json` specifier can
 * arrive relative, aliased, or bare, and missing one route would fail only for
 * whichever file happened to use it.
 */
function withJsonAttributes(resolution) {
  if (!resolution?.url?.endsWith(".json")) return resolution;

  return {
    ...resolution,
    format: "json",
    importAttributes: { ...(resolution.importAttributes ?? {}), type: "json" },
  };
}

export async function resolve(specifier, context, next) {
  // Rule 2 — `@/foo` is `src/foo`. Checked before the extensionless branch
  // because an aliased specifier is not relative and would never reach it.
  if (specifier.startsWith("@/")) {
    const base = new URL(specifier.slice(2), SRC_URL);

    for (const suffix of ["", ".ts", ".tsx", "/index.ts", "/index.tsx"]) {
      const candidate = new URL(base.href + suffix);
      if (existsSync(fileURLToPath(candidate))) {
        return withJsonAttributes(await next(candidate.href, context));
      }
    }
    // Fall through, so an unresolvable alias fails with Node's own message
    // rather than one invented here.
  }

  // Rule 1 — extensionless relative imports.
  const extensionless =
    (specifier.startsWith("./") || specifier.startsWith("../")) &&
    !/\.[cm]?[jt]sx?$/i.test(specifier);

  if (extensionless) {
    for (const candidate of [`${specifier}.ts`, `${specifier}.tsx`, `${specifier}/index.ts`]) {
      try {
        const resolved = await next(candidate, context);
        if (existsSync(fileURLToPath(resolved.url))) return withJsonAttributes(resolved);
      } catch {
        // Try the next candidate.
      }
    }
  }

  return withJsonAttributes(await next(specifier, context));
}

/**
 * Resolve hook: let Node follow the repo's extensionless relative imports.
 *
 * Next compiles with bundler-style module resolution, where `import "./image"`
 * finds `image.ts`. Node's ESM resolver requires the extension. Rather than
 * writing `./image.ts` throughout the app to suit a test runner — which bundler
 * resolution rejects without `allowImportingTsExtensions` — this teaches Node the
 * one rule it is missing.
 *
 * Node strips TypeScript types natively, so nothing here compiles anything.
 */
import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";

export async function resolve(specifier, context, next) {
  const extensionless =
    (specifier.startsWith("./") || specifier.startsWith("../")) &&
    !/\.[cm]?[jt]sx?$/i.test(specifier);

  if (extensionless) {
    for (const candidate of [`${specifier}.ts`, `${specifier}.tsx`, `${specifier}/index.ts`]) {
      try {
        const resolved = await next(candidate, context);
        if (existsSync(fileURLToPath(resolved.url))) return resolved;
      } catch {
        // Try the next candidate.
      }
    }
  }

  return next(specifier, context);
}

/**
 * Installs the resolve hook in `ts-resolver-hooks.mjs`.
 *
 * Used as `node --import ./scripts/register-ts.mjs <script>`; see the `test`
 * script in package.json. Kept separate from the hooks themselves because
 * `register` loads hook modules on their own thread.
 */
import { register } from "node:module";

register("./ts-resolver-hooks.mjs", import.meta.url);

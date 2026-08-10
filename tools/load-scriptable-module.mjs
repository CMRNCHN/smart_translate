/**
 * Load a Scriptable module (CommonJS module.exports) in Node for tests.
 */
import fs from "fs";
import path from "path";
import vm from "vm";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");

export function loadScriptableModule(relativePath, extraGlobals = {}) {
  const absolutePath = path.join(root, relativePath);
  const code = fs.readFileSync(absolutePath, "utf8");
  const module = { exports: {} };

  const sandbox = {
    module,
    exports: module.exports,
    console,
    ...extraGlobals
  };

  vm.runInNewContext(code, sandbox, { filename: absolutePath });
  return module.exports;
}

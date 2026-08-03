# SmartTranslate

SmartTranslate is a [Scriptable](https://scriptable.app/) app (JavaScript that runs inside the Scriptable iOS app). The only local developer tooling is a Node.js bundler and a Bash DeepL key checker. See `README.md` for install/usage details.

## Cursor Cloud specific instructions

### What can and cannot run here
- The app scripts under `scripts/` target the Scriptable iOS runtime and use Scriptable-only globals (`Keychain`, `UITable`, `Speech`, `FileManager`, `importModule`, etc.). They **cannot be executed with plain `node`** in this environment — do not try to run them as a server or CLI. End-to-end product testing requires an actual iOS device with Scriptable, a DeepL key, and iCloud.
- What you *can* run here is the developer tooling: the bundler and the DeepL check script.

### Dependencies
- There is **no `package.json`, lockfile, or npm dependency**. The bundler (`tools/bundle.mjs`) uses only Node built-ins, so there is no install step. Node.js is the only requirement and is already present in the base image (v22.x).

### Core dev workflow (bundler)
- Edit the modular sources in `scripts/*.js`, then regenerate the paste-ready single-file bundles with `node tools/bundle.mjs`.
- The bundler is **deterministic**, and `scripts/dist/SmartTranslate.js` / `scripts/dist/SmartTranslatePro.js` are checked into git. After running the bundler with unchanged sources, `git diff` should be empty. Always commit regenerated bundles alongside source edits so `dist/` stays in sync.

### Syntax checking / lint / test
- There is **no ESLint/Prettier config and no automated test suite**.
- To syntax-check a script, treat it as an ES module because the sources/bundles use top-level `await`: `node --check --input-type=module < scripts/dist/SmartTranslate.js`. Plain `node --check <file>.js` parses as CommonJS and will falsely fail on the top-level `await`.

### DeepL key checker (optional)
- `tools/check-deepl.sh` verifies a DeepL key against the live DeepL API (needs network + a valid key). Pass the key as an argument or via `DEEPL_API_KEY`; free-tier keys end in `:fx`. With no key it just prints usage and exits 1.

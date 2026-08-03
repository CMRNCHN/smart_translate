# SmartTranslate distributable links

Branch: **cursor/scriptable-only-bundler**

## Easiest: Installer (recommended)

Paste **one small installer script** into Scriptable. It downloads and runs SmartTranslate for you — no manual copy/paste of the large bundle files.

- **Installer (raw):** https://raw.githubusercontent.com/CMRNCHN/smart_translate/cursor/scriptable-only-bundler/scripts/dist/SmartTranslateInstaller.js
- **Installer (GitHub page):** https://github.com/CMRNCHN/smart_translate/blob/cursor/scriptable-only-bundler/scripts/dist/SmartTranslateInstaller.js

1. Open the installer link on your iPhone → copy all → Scriptable → new script → paste → run.
2. Choose **Run SmartTranslate (v1)** or **Run SmartTranslate Pro**.

## Manual install (paste full bundle)

Paste either raw file into **one** Scriptable script (any name).

### SmartTranslate (v1)

- Raw: https://raw.githubusercontent.com/CMRNCHN/smart_translate/cursor/scriptable-only-bundler/scripts/dist/SmartTranslate.js
- jsDelivr: https://cdn.jsdelivr.net/gh/CMRNCHN/smart_translate@cursor/scriptable-only-bundler/scripts/dist/SmartTranslate.js

### SmartTranslate Pro

- Raw: https://raw.githubusercontent.com/CMRNCHN/smart_translate/cursor/scriptable-only-bundler/scripts/dist/SmartTranslatePro.js
- jsDelivr: https://cdn.jsdelivr.net/gh/CMRNCHN/smart_translate@cursor/scriptable-only-bundler/scripts/dist/SmartTranslatePro.js

## Rebuild

```bash
node tools/bundle.mjs
```

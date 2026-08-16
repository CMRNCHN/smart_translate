# SmartTranslate distributable links

Branch: **cursor/scriptable-only-bundler**

## Easiest: Installer (recommended)

Paste **one small installer** into Scriptable and run it **once**. It will:

1. Download the app from GitHub
2. Save it as a real Scriptable script (`SmartTranslate` or `SmartTranslatePro`)
3. **Delete this installer** from your script list
4. Open the installed app

### SmartTranslate installer

- **Raw:** https://raw.githubusercontent.com/CMRNCHN/smart_translate/cursor/scriptable-only-bundler/scripts/dist/install-smarttranslate.js
- **GitHub:** https://github.com/CMRNCHN/smart_translate/blob/cursor/scriptable-only-bundler/scripts/dist/install-smarttranslate.js

### Generic installer (for your own scripts)

Use [`ScriptInstall.js`](ScriptInstall.js) — edit `INSTALLER.items` with any `scriptName` + `url`, then paste and run once.

- **Raw:** https://raw.githubusercontent.com/CMRNCHN/smart_translate/cursor/scriptable-only-bundler/scripts/dist/ScriptInstall.js

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
node tools/build-installer.mjs
```

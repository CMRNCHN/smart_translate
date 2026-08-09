# Ship SmartTranslate to a friend

Use this when someone has **only an iPhone** — no Scriptable yet, no Cursor, no computer.

## What to send them

1. **Copy the message** from [`SHIP-TO-FRIEND.txt`](SHIP-TO-FRIEND.txt) into iMessage, WhatsApp, or email.
2. **Before sending:** replace `REPLACE_THIS_LINE_WITH_YOUR_DEEPL_KEY_BEFORE_SENDING` with your DeepL key **only in the message you send** — do not commit your real key to GitHub.
3. Optional: also send the full guide link:
   https://github.com/CMRNCHN/smart_translate/blob/cursor/scriptable-only-bundler/GET-STARTED-IPHONE.md

## Installer link (stable)

https://raw.githubusercontent.com/CMRNCHN/smart_translate/cursor/scriptable-only-bundler/scripts/dist/install-smarttranslate.js

## Why the DeepL key is not in the repo

- The installer is downloaded from a **public** GitHub URL. Anyone with the link could steal a key baked into it.
- Scriptable stores the key in **your friend’s iPhone Keychain** after they paste it once — that is the right place for it.
- **Best practice:** paste your key only in a **private message** to your friend (the txt template above), or ask them to create a free key at https://www.deepl.com/your-account/keys

## If you prefer they use their own key

Delete the key line from the message and tell them to sign up for a free DeepL key when the app prompts them.

## What they install

| Choice | What they get |
|--------|----------------|
| **SmartTranslate (v1)** | Translate, speak, conversation mode |
| **SmartTranslate Pro** | Above + library, people, exports |

Both are included in the one installer — they pick at install time.

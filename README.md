# SmartTranslate

Scriptable app for bidirectional translation with optional conversation transcripts.

## Install (easiest — installer script)

1. On your iPhone, open the installer raw link in [`scripts/dist/LINKS.md`](scripts/dist/LINKS.md) (`install-smarttranslate.js`).
2. In **Scriptable**, create one new script (any name), paste the installer, and **run it once**.
3. Choose **Install SmartTranslate (v1)** or **Install SmartTranslate Pro**.

The installer downloads the bundle, saves it as a real Scriptable script with the correct name, **removes itself**, and opens the app. Next time, run `SmartTranslate` or `SmartTranslatePro` directly from your script list.

### Generic installer for other scripts

[`scripts/ScriptInstall.js`](scripts/ScriptInstall.js) is a reusable installer — edit `INSTALLER.items` with any `scriptName` and download `url`, paste into Scriptable, run once. Rebuild preconfigured installers with `node tools/build-installer.mjs` (see `scripts/installers/*.json`).

## Install (manual — one script)

1. Open **Scriptable**.
2. Create one new script (any name, e.g. `SmartTranslate`).
3. Paste the entire contents of [`scripts/dist/SmartTranslate.js`](scripts/dist/SmartTranslate.js).
4. Run it and complete setup (DeepL key required).

For Pro, paste [`scripts/dist/SmartTranslatePro.js`](scripts/dist/SmartTranslatePro.js) instead.

Rebuild standalones after editing modular sources:

```bash
node tools/bundle.mjs
```

## Install (modular — multiple scripts)

`importModule` only works if each dependency exists as its **own Scriptable script** with the **exact** name (no spaces, matching capitalization). Scriptable does **not** load modules from this git repo folder automatically.

### v1 (3 scripts)

Create these scripts and paste the matching `scripts/*.js` files:

1. `SmartTranslateShared`
2. `SmartTranslateConversation`
3. `SmartTranslate` ← run this one

### Pro (4 scripts)

1. `SmartTranslateShared`
2. `SmartTranslateConversation`
3. `SmartTranslateProKit`
4. `SmartTranslatePro` ← run this one

If you only paste `SmartTranslate.js`, you get: **Error on line 28: no file to import at SmartTranslateShared**.

## Scripts

| Script | Role |
|--------|------|
| `scripts/dist/SmartTranslate.js` | **Recommended** — single-file v1 |
| `scripts/dist/SmartTranslatePro.js` | **Recommended** — single-file Pro |
| `SmartTranslateShared.js` | Shared config, iCloud storage, DeepL, TTS |
| `SmartTranslateConversation.js` | Conversation Mode engine |
| `SmartTranslate.js` | Modular v1 entry |
| `SmartTranslateProKit.js` | Pro intelligence + export |
| `SmartTranslatePro.js` | Modular Pro entry |

## v1 Menu

| Action | What it does |
|--------|----------------|
| **Type** | Type text → translate → speak |
| **Paste** | Clipboard → translate → speak |
| **Dictate** | Speech → translate → speak |
| **Conversation** | Multi-turn session with a person |
| **Settings** | Languages, API keys, speech engine |

One-shot modes do **not** save translation history.

## Pro Menu (lean)

| Action | What it does |
|--------|----------------|
| **Quick Translate ›** | Type / Paste / Dictate |
| **Conversation** | Multi-turn session + short save summary |
| **Library** | Search, favorites, browse, export |
| **People** | Profiles and past chats |
| **Settings** | Languages, API keys, speech |

Home stays open (UITable) until you dismiss it. Post-session only shows a short summary + optional favorite.

**Not in lean Pro UI:** Timeline, Statistics, Learning, Voice Profiles menu, OpenAI summaries, memory prompts, long tag/purpose wizards.

## Storage (iCloud)

```
SmartTranslate/
├── config.json
├── people.json
├── active_session.json
├── conversations/
│   └── session_<uuid>.json
└── exports/                    # Pro exports
    └── Person_sessionid.md
```

## Keychain

| Key | Purpose |
|-----|---------|
| `SMART_TRANSLATE_DEEPL_API_KEY` | DeepL (use `:fx` for free tier) |
| `SMART_TRANSLATE_ELEVENLABS_API_KEY` | Optional ElevenLabs TTS |
| `SMART_TRANSLATE_OPENAI_API_KEY` | Optional richer Pro summaries |

## Conversation Mode (v1 contract)

- Start / continue / end a session with a named person
- Optional title, context, notes (no automatic location)
- Each turn: capture → choose **Me** or **Person** → translate → **save** → speak
- Turns are written to `active_session.json` **before** speech
- After each turn: Continue / End / Pause
- History lists completed conversations
- Interrupted sessions resume from `active_session.json`

## Intentionally not included

Speaker diarization, embeddings / semantic vector search, SQLite, offline on-device models, always-on mic, audio archive, live custom chat UI.

## Translation behavior

DeepL two-pass: translate toward `defaultTarget`; if the source is already that language, translate to the other language in the pair (`primary` ↔ `conversation`).

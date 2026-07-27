# SmartTranslate

Scriptable app for bidirectional translation with optional conversation transcripts.

## Install (easiest — one script)

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

## Pro Menu

Everything in v1, plus:

| Action | What it does |
|--------|----------------|
| **Library** | Search, favorites, browse, filter by tag, export |
| **People** | Profiles, notes, languages, memory, per-person chats |
| **Timeline** | Today / Yesterday / Last 7 Days / This Month / Older |
| **Statistics** | Totals, average length, top language, longest chat |
| **Learning** | Vocabulary hints from a conversation |
| **Voice Profiles** | Review per-language TTS setup |

When you **end a conversation in Pro**, it runs intelligence automatically:

1. Summary (extractive, or OpenAI if configured)
2. Purpose + auto tags
3. Manual tag edit
4. Favorite prompt
5. Memory extraction → confirm save to person profile
6. Optional export (Markdown / JSON / TXT / HTML)

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

# SmartTranslate

Scriptable app for bidirectional translation with optional conversation transcripts.

## Scripts

| Script | Role |
|--------|------|
| `SmartTranslateShared.js` | Shared config, iCloud storage, DeepL, TTS |
| `SmartTranslateConversation.js` | Conversation Mode engine |
| `SmartTranslate.js` | **v1** entry — Type / Paste / Dictate / Conversation / Settings |
| `SmartTranslateProKit.js` | Pro intelligence + export |
| `SmartTranslatePro.js` | **Pro** entry — full feature menu |

## Install (v1)

1. Open **Scriptable** (enable iCloud sync for data).
2. Create scripts and paste from `scripts/` (names must match exactly):
   - `SmartTranslateShared.js`
   - `SmartTranslateConversation.js`
   - `SmartTranslate.js`
3. Run **SmartTranslate** and complete setup (DeepL key required).

## Install (Pro)

Same as v1, plus:

- `SmartTranslateProKit.js`
- `SmartTranslatePro.js` ← run this / add to Home Screen

Pro shares the same iCloud data and Keychain keys as v1.

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

// SmartTranslateUI.js
//
// WebView UI kit — mockup-style screens for all SmartTranslate menus.
//
// Version: 2.1.1

const LANGUAGE_FLAGS = {
  AR: "🇸🇦",
  ZH: "🇨🇳",
  NL: "🇳🇱",
  "EN-US": "🇺🇸",
  "EN-GB": "🇬🇧",
  FR: "🇫🇷",
  DE: "🇩🇪",
  HE: "🇮🇱",
  IT: "🇮🇹",
  JA: "🇯🇵",
  KO: "🇰🇷",
  PL: "🇵🇱",
  "PT-PT": "🇵🇹",
  "PT-BR": "🇧🇷",
  RU: "🇷🇺",
  ES: "🇪🇸",
  TR: "🇹🇷",
  UK: "🇺🇦"
};

const SYMBOL_EMOJI = {
  "magnifyingglass": "🔍",
  "star.fill": "⭐",
  star: "☆",
  "list.bullet": "📋",
  "square.and.arrow.up": "📤",
  "person.fill": "👤",
  "person.badge.plus": "➕",
  "person.crop.circle": "👤",
  "person.2": "💬",
  "play.fill": "▶️",
  clock: "🕐",
  "checkmark.circle": "✅",
  trash: "🗑️",
  "plus.bubble": "💬",
  "bubble.left.and.bubble.right": "💬",
  "text.bubble": "💬",
  "doc.text": "📄",
  "text.alignleft": "📝",
  keyboard: "⌨️",
  "doc.on.clipboard": "📋",
  mic: "🎤",
  gearshape: "⚙️",
  "books.vertical": "📚",
  globe: "🌐",
  key: "🔑",
  "checkmark.seal": "✓",
  pencil: "✏️",
  "character.bubble": "💬"
};

const TINT_CLASSES = ["blue", "green", "purple", "orange", "slate"];

let sessionWebView = null;
let sessionPresentPromise = null;

function flagForCode(code) {
  if (!code) {
    return "🌐";
  }
  if (LANGUAGE_FLAGS[code]) {
    return LANGUAGE_FLAGS[code];
  }
  const base = String(code).toUpperCase().split("-")[0];
  return LANGUAGE_FLAGS[base] || "🌐";
}

function escapeHtml(value) {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function iconForSymbol(symbol, index) {
  if (!symbol) {
    return "•";
  }
  return SYMBOL_EMOJI[symbol] || "•";
}

function tintClass(index) {
  return TINT_CLASSES[index % TINT_CLASSES.length];
}

function parseCompletion(raw) {
  if (raw == null || raw === "") {
    return null;
  }
  if (typeof raw === "object") {
    return raw;
  }
  if (String(raw).charAt(0) === "{") {
    try {
      return JSON.parse(raw);
    } catch (error) {
      return { a: raw };
    }
  }
  return { a: raw };
}

const UI_STYLES = `
  :root {
    --bg: #070b14;
    --card: rgba(22, 30, 48, 0.92);
    --card-border: rgba(255, 255, 255, 0.08);
    --text: #f4f7ff;
    --text-secondary: rgba(235, 240, 255, 0.62);
    --text-tertiary: rgba(235, 240, 255, 0.42);
    --hero-start: #3b4fd8;
    --hero-end: #7c3aed;
    --accent-blue: #4f8cff;
    --accent-green: #34d399;
    --accent-orange: #fb923c;
    --accent-purple: #a78bfa;
    --danger: #f87171;
    --radius-lg: 20px;
    --radius-md: 16px;
    --shadow: 0 18px 48px rgba(0, 0, 0, 0.38);
  }
  * { box-sizing: border-box; -webkit-tap-highlight-color: transparent; }
  html, body {
    margin: 0; padding: 0; min-height: 100%;
    background: #070b14; background: var(--bg, #070b14);
    color: #f4f7ff; color: var(--text, #f4f7ff);
    font-family: -apple-system, BlinkMacSystemFont, "SF Pro Text", "Helvetica Neue", sans-serif;
    -webkit-font-smoothing: antialiased;
  }
  body {
    padding: calc(env(safe-area-inset-top, 12px) + 12px) 16px calc(env(safe-area-inset-bottom, 12px) + 24px);
  }
  .app { max-width: 440px; margin: 0 auto; }
  .topbar { display: flex; align-items: center; justify-content: space-between; margin-bottom: 14px; padding: 0 2px; }
  .brand { font-size: 13px; font-weight: 700; letter-spacing: 0.14em; text-transform: uppercase; color: var(--text-tertiary); }
  .badge-pill {
    font-size: 11px; font-weight: 700; letter-spacing: 0.08em; text-transform: uppercase;
    color: #c4b5fd; background: rgba(124, 58, 237, 0.22);
    border: 1px solid rgba(167, 139, 250, 0.28); padding: 5px 10px; border-radius: 999px;
  }
  .badge-pill.plain { color: var(--text-secondary); background: rgba(255,255,255,0.06); border-color: var(--card-border); }
  .page-header { margin-bottom: 18px; padding: 0 2px; }
  .page-title { margin: 0 0 4px; font-size: 28px; font-weight: 700; letter-spacing: -0.03em; }
  .page-subtitle { margin: 0; font-size: 15px; color: var(--text-secondary); line-height: 1.4; }
  .hero {
    position: relative; overflow: hidden; border-radius: var(--radius-lg);
    padding: 22px 20px 20px; margin-bottom: 22px;
    background: linear-gradient(135deg, var(--hero-start) 0%, var(--hero-end) 100%);
    box-shadow: var(--shadow); border: 1px solid rgba(255, 255, 255, 0.12);
  }
  .hero::before {
    content: ""; position: absolute; inset: 0;
    background: radial-gradient(circle at 85% 15%, rgba(255,255,255,0.22), transparent 42%),
      radial-gradient(circle at 10% 90%, rgba(255,255,255,0.08), transparent 35%);
    pointer-events: none;
  }
  .hero-inner { position: relative; z-index: 1; }
  .hero-icon {
    width: 42px; height: 42px; border-radius: 14px; display: flex; align-items: center; justify-content: center;
    background: rgba(255, 255, 255, 0.16); border: 1px solid rgba(255, 255, 255, 0.18); margin-bottom: 14px; font-size: 22px;
  }
  .lang-pair { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; margin-bottom: 12px; }
  .lang-chip { display: inline-flex; align-items: center; gap: 8px; font-size: 22px; font-weight: 700; letter-spacing: -0.02em; }
  .lang-chip .flag { font-size: 24px; }
  .lang-arrow { color: rgba(255, 255, 255, 0.72); font-size: 18px; font-weight: 600; }
  .voice-pill {
    display: inline-flex; align-items: center; gap: 6px; font-size: 12px; font-weight: 600;
    color: rgba(255, 255, 255, 0.92); background: rgba(0, 0, 0, 0.18);
    border: 1px solid rgba(255, 255, 255, 0.14); padding: 6px 12px; border-radius: 999px;
  }
  .section { margin-bottom: 18px; }
  .section-title { margin: 0 0 10px 4px; font-size: 13px; font-weight: 600; color: var(--text-tertiary); }
  .tiles { display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; }
  .tile {
    appearance: none; border: 1px solid var(--card-border); background: var(--card); border-radius: var(--radius-md);
    padding: 14px 10px 12px; color: var(--text); text-align: center;
    box-shadow: 0 10px 24px rgba(0, 0, 0, 0.22);
  }
  .tile:active { transform: scale(0.97); }
  .tile-icon {
    width: 42px; height: 42px; margin: 0 auto 10px; border-radius: 14px;
    display: flex; align-items: center; justify-content: center; font-size: 20px;
  }
  .tile-icon.blue { color: #93c5fd; background: rgba(79, 140, 255, 0.16); }
  .tile-icon.green { color: #6ee7b7; background: rgba(52, 211, 153, 0.14); }
  .tile-icon.orange { color: #fdba74; background: rgba(251, 146, 60, 0.16); }
  .tile-icon.purple { color: #c4b5fd; background: rgba(167, 139, 250, 0.14); }
  .tile-label { display: block; font-size: 14px; font-weight: 650; }
  .list { display: flex; flex-direction: column; gap: 8px; }
  .list-row, .continue-card, .btn-row, .msg-card {
    width: 100%; appearance: none; border: 1px solid var(--card-border); background: var(--card);
    color: inherit; border-radius: var(--radius-md); display: flex; align-items: center; gap: 12px;
    padding: 14px; text-align: left; box-shadow: 0 10px 24px rgba(0, 0, 0, 0.18);
  }
  .list-row:active, .continue-card:active, .btn-row:active { transform: scale(0.99); }
  .row-icon {
    width: 38px; height: 38px; border-radius: 12px; display: flex; align-items: center;
    justify-content: center; flex-shrink: 0; font-size: 18px;
  }
  .row-icon.blue { background: rgba(79, 140, 255, 0.14); }
  .row-icon.green { background: rgba(52, 211, 153, 0.14); }
  .row-icon.purple { background: rgba(167, 139, 250, 0.14); }
  .row-icon.orange { background: rgba(251, 146, 60, 0.14); }
  .row-icon.slate { background: rgba(148, 163, 184, 0.14); }
  .row-text, .continue-text { flex: 1; min-width: 0; }
  .row-title, .continue-title { display: block; font-size: 16px; font-weight: 650; margin-bottom: 2px; }
  .row-sub, .continue-sub {
    display: block; font-size: 13px; color: var(--text-secondary);
    white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
  }
  .chevron { color: var(--text-tertiary); font-size: 22px; flex-shrink: 0; }
  .continue-dot {
    width: 10px; height: 10px; border-radius: 50%; background: var(--accent-orange);
    box-shadow: 0 0 0 4px rgba(251, 146, 60, 0.18); flex-shrink: 0;
  }
  .msg-card { flex-direction: column; align-items: stretch; gap: 10px; }
  .msg-card.error { border-color: rgba(248, 113, 113, 0.35); }
  .msg-card.success { border-color: rgba(52, 211, 153, 0.35); }
  .msg-body { font-size: 15px; line-height: 1.45; color: var(--text-secondary); white-space: pre-wrap; }
  .btn-stack { display: flex; flex-direction: column; gap: 8px; width: 100%; }
  .btn-row { justify-content: center; font-size: 16px; font-weight: 650; }
  .btn-row.destructive { color: #fecaca; border-color: rgba(248, 113, 113, 0.3); }
  .btn-row.primary { background: linear-gradient(135deg, var(--hero-start), var(--hero-end)); border: none; justify-content: center; }
  .prompt-card { flex-direction: column; align-items: stretch; gap: 12px; padding: 16px; }
  .prompt-input {
    width: 100%; border: 1px solid var(--card-border); background: rgba(0,0,0,0.25);
    color: var(--text); border-radius: 12px; padding: 12px 14px; font-size: 16px; outline: none;
  }
  .prompt-actions { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
  .key-card {
    border: 1px solid var(--card-border); background: var(--card); border-radius: var(--radius-md);
    padding: 14px; margin-bottom: 10px; box-shadow: 0 10px 24px rgba(0, 0, 0, 0.18);
  }
  .key-card-head { display: flex; align-items: center; justify-content: space-between; gap: 10px; margin-bottom: 8px; }
  .key-card-title { font-size: 17px; font-weight: 700; }
  .status-pill {
    font-size: 11px; font-weight: 700; letter-spacing: 0.04em; text-transform: uppercase;
    padding: 4px 9px; border-radius: 999px; border: 1px solid var(--card-border);
  }
  .status-pill.ok { color: #6ee7b7; background: rgba(52, 211, 153, 0.12); border-color: rgba(52, 211, 153, 0.28); }
  .status-pill.missing { color: #fdba74; background: rgba(251, 146, 60, 0.12); border-color: rgba(251, 146, 60, 0.28); }
  .key-card-sub { font-size: 13px; color: var(--text-secondary); line-height: 1.4; margin: 0 0 10px; }
  .key-meta {
    font-size: 12px; color: var(--text-tertiary); font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
    word-break: break-all; margin-bottom: 12px;
  }
  .key-actions { display: flex; flex-direction: column; gap: 8px; }
`;

function wrapDocument(pageTitle, bodyHtml) {
  const bootScript = `<script>
(function () {
  function send(action) {
    if (typeof completion === "function") {
      completion(action);
    }
  }
  function bind() {
    document.addEventListener("click", function (event) {
      var target = event.target.closest("[data-action]");
      if (!target) return;
      event.preventDefault();
      send(target.getAttribute("data-action"));
    }, true);
  }
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", bind, { once: true });
  } else {
    bind();
  }
})();
</script>`;

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover, user-scalable=no">
<meta name="color-scheme" content="dark">
<title>${escapeHtml(pageTitle || "SmartTranslate")}</title>
<style>${UI_STYLES}</style>
</head>
<body>${bodyHtml}${bootScript}</body>
</html>`;
}

function renderTopbar(brand, badge) {
  const badgeHtml = badge
    ? `<div class="badge-pill${badge === "plain" ? " plain" : ""}">${escapeHtml(badge)}</div>`
    : "";
  return `<div class="topbar"><div class="brand">${escapeHtml(brand || "SmartTranslate")}</div>${badgeHtml}</div>`;
}

function renderPageHeader(title, subtitle) {
  return `<header class="page-header">
    <h1 class="page-title">${escapeHtml(title || "")}</h1>
    ${subtitle ? `<p class="page-subtitle">${escapeHtml(subtitle)}</p>` : ""}
  </header>`;
}

function renderListRow(item, index) {
  const tint = tintClass(index);
  const emoji = iconForSymbol(item.symbol, index);
  const chevron = item.disclosure !== false ? `<span class="chevron">›</span>` : "";
  return `<button type="button" class="list-row" data-action="${escapeHtml(item.id)}">
    <span class="row-icon ${tint}">${emoji}</span>
    <span class="row-text">
      <span class="row-title">${escapeHtml(item.title)}</span>
      ${item.subtitle ? `<span class="row-sub">${escapeHtml(item.subtitle)}</span>` : ""}
    </span>
    ${chevron}
  </button>`;
}

function buildListMenuHTML({ title, subtitle, sections, brand, badge }) {
  let sectionsHtml = "";
  let rowIndex = 0;

  for (const section of sections || []) {
    let rowsHtml = "";
    for (const item of section.rows || []) {
      rowsHtml += renderListRow(item, rowIndex);
      rowIndex += 1;
    }
    sectionsHtml += `<section class="section">
      ${section.header ? `<h2 class="section-title">${escapeHtml(section.header)}</h2>` : ""}
      <div class="list">${rowsHtml}</div>
    </section>`;
  }

  const body = `<div class="app">
    ${renderTopbar(brand, badge)}
    ${renderPageHeader(title, subtitle)}
    ${sectionsHtml}
  </div>`;

  return wrapDocument(title, body);
}

function buildMessageHTML({ title, message, variant, actions }) {
  const acts = actions || [{ id: "ok", label: "OK" }];
  const buttons = acts
    .map((action) => {
      const cls = action.destructive ? "btn-row destructive" : action.primary ? "btn-row primary" : "btn-row";
      return `<button type="button" class="${cls}" data-action="${escapeHtml(action.id)}">${escapeHtml(action.label)}</button>`;
    })
    .join("");

  const body = `<div class="app">
    ${renderTopbar("SmartTranslate", null)}
    ${renderPageHeader(title, null)}
    <div class="msg-card ${escapeHtml(variant || "info")}">
      <div class="msg-body">${escapeHtml(message)}</div>
      <div class="btn-stack">${buttons}</div>
    </div>
  </div>`;

  return wrapDocument(title, body);
}

function buildPromptHTML({ title, message, defaultValue, placeholder, secure }) {
  const inputType = secure ? "password" : "text";
  const body = `<div class="app">
    ${renderTopbar("SmartTranslate", null)}
    ${renderPageHeader(title, message)}
    <div class="prompt-card list-row" style="flex-direction:column;align-items:stretch;">
      <input class="prompt-input" id="st-input" type="${inputType}" autocomplete="off" autocapitalize="off" spellcheck="false" value="${escapeHtml(defaultValue || "")}" placeholder="${escapeHtml(placeholder || "Enter text…")}" />
      <div class="prompt-actions">
        <button type="button" class="btn-row" data-action="cancel">Cancel</button>
        <button type="button" class="btn-row primary" data-action="submit">Continue</button>
      </div>
    </div>
  </div>`;

  return wrapDocument(title, body);
}

function buildApiKeyWizardHTML(status) {
  const s = status || {};
  const deepl = s.deepl || {};
  const eleven = s.elevenlabs || {};

  const deeplPill = deepl.saved
    ? `<span class="status-pill ok">Saved</span>`
    : `<span class="status-pill missing">Not set</span>`;
  const elevenPill = eleven.saved
    ? `<span class="status-pill ok">Saved</span>`
    : `<span class="status-pill missing">Optional</span>`;

  const body = `<div class="app">
    ${renderTopbar("SmartTranslate", "Keys")}
    ${renderPageHeader("API Keys", "Stored in Scriptable Keychain on your iPhone.")}
    <section class="section">
      <div class="key-card">
        <div class="key-card-head">
          <div class="key-card-title">DeepL</div>
          ${deeplPill}
        </div>
        <p class="key-card-sub">Required for translation.${deepl.saved ? ` Showing ${escapeHtml(deepl.masked || "")}.` : " Get a free key at deepl.com."}</p>
        <div class="key-actions">
          <button type="button" class="btn-row primary" data-action="deepl_manage">${deepl.saved ? "View / Update DeepL Key" : "Set Up DeepL Key"}</button>
          <button type="button" class="btn-row" data-action="deepl_signup">Get DeepL API Key</button>
        </div>
      </div>
      <div class="key-card">
        <div class="key-card-head">
          <div class="key-card-title">ElevenLabs</div>
          ${elevenPill}
        </div>
        <p class="key-card-sub">Optional premium voices.${eleven.saved ? ` Showing ${escapeHtml(eleven.masked || "")}.` : " Skip if you use Apple voice."}</p>
        <div class="key-actions">
          <button type="button" class="btn-row primary" data-action="eleven_manage">${eleven.saved ? "View / Update ElevenLabs Key" : "Set Up ElevenLabs Key"}</button>
          <button type="button" class="btn-row" data-action="eleven_signup">Get ElevenLabs API Key</button>
        </div>
      </div>
      <button type="button" class="btn-row" data-action="done">Done</button>
    </section>
  </div>`;

  return wrapDocument("API Keys", body);
}

function buildApiKeyDetailHTML(service) {
  const s = service || {};
  const saved = !!s.saved;
  const body = `<div class="app">
    ${renderTopbar("SmartTranslate", "Keys")}
    ${renderPageHeader(s.label || "API Key", saved ? "Saved on this iPhone" : "Not saved yet")}
    <section class="section">
      <div class="key-card">
        <div class="key-card-head">
          <div class="key-card-title">${escapeHtml(s.label || "API Key")}</div>
          <span class="status-pill ${saved ? "ok" : "missing"}">${saved ? "Saved" : "Not set"}</span>
        </div>
        <p class="key-card-sub">${escapeHtml(s.hint || "")}</p>
        ${saved ? `<div class="key-meta">Masked: ${escapeHtml(s.masked || "")}<br>Keychain: ${escapeHtml(s.keychainKey || "")}</div>` : ""}
        <div class="key-actions">
          ${saved ? `<button type="button" class="btn-row primary" data-action="copy">Copy Full Key</button>` : ""}
          <button type="button" class="btn-row ${saved ? "" : "primary"}" data-action="paste">${saved ? "Replace Key" : "Paste API Key"}</button>
          ${saved ? `<button type="button" class="btn-row" data-action="test">Test Key</button>` : ""}
          <button type="button" class="btn-row" data-action="signup">Open ${escapeHtml(s.label || "Provider")} Keys Page</button>
          ${saved ? `<button type="button" class="btn-row destructive" data-action="remove">Remove Key</button>` : ""}
          <button type="button" class="btn-row" data-action="back">Back</button>
        </div>
      </div>
    </section>
  </div>`;

  return wrapDocument(s.label || "API Key", body);
}

async function bindPromptHandlers(webView, includeEmptySubmit) {
  return webView.evaluateJavaScript(
    `(function () {
      document.querySelector('[data-action="submit"]').addEventListener("click", function () {
        completion(JSON.stringify({
          a: "submit",
          v: document.getElementById("st-input").value
        }));
      });
      document.querySelector('[data-action="cancel"]').addEventListener("click", function () {
        completion(JSON.stringify({ a: "cancel" }));
      });
      ${includeEmptySubmit ? "" : `document.getElementById("st-input").addEventListener("keydown", function (e) {
        if (e.key === "Enter") {
          document.querySelector('[data-action="submit"]').click();
        }
      });`}
    })();`,
    true
  );
}

function buildProHomeHTML(context) {
  const c = context || {};
  const primaryFlag = escapeHtml(c.primaryFlag || "🌐");
  const conversationFlag = escapeHtml(c.conversationFlag || "🌐");
  const primaryLang = escapeHtml(c.primaryLang || "Language A");
  const conversationLang = escapeHtml(c.conversationLang || "Language B");
  const engine = escapeHtml(c.engine || "Apple Voice");
  const libraryMeta = escapeHtml(c.libraryMeta || "Browse saved chats");
  const peopleMeta = escapeHtml(c.peopleMeta || "Profiles and memory");

  const continueBlock = c.activeSession
    ? `<section class="section">
      <h2 class="section-title">Continue</h2>
      <button type="button" class="continue-card" data-action="continue">
        <span class="continue-dot"></span>
        <span class="continue-text">
          <span class="continue-title">${escapeHtml(c.activeSession.name)}</span>
          <span class="continue-sub">${c.activeSession.turns} turn${c.activeSession.turns === 1 ? "" : "s"} · tap to resume</span>
        </span>
        <span class="chevron">›</span>
      </button>
    </section>`
    : "";

  const body = `<div class="app">
    ${renderTopbar("SmartTranslate", "Pro")}
    <header class="hero"><div class="hero-inner">
      <div class="hero-icon">🌐</div>
      <div class="lang-pair">
        <span class="lang-chip"><span class="flag">${primaryFlag}</span>${primaryLang}</span>
        <span class="lang-arrow">↔</span>
        <span class="lang-chip"><span class="flag">${conversationFlag}</span>${conversationLang}</span>
      </div>
      <span class="voice-pill">🔊 ${engine}</span>
    </div></header>
    <section class="section">
      <h2 class="section-title">Quick actions</h2>
      <div class="tiles">
        <button type="button" class="tile" data-action="type"><div class="tile-icon blue">⌨️</div><span class="tile-label">Type</span></button>
        <button type="button" class="tile" data-action="paste"><div class="tile-icon green">📋</div><span class="tile-label">Paste</span></button>
        <button type="button" class="tile" data-action="dictate"><div class="tile-icon orange">🎤</div><span class="tile-label">Dictate</span></button>
      </div>
    </section>
    ${continueBlock}
    <section class="section">
      <h2 class="section-title">Saved</h2>
      <div class="list">
        <button type="button" class="list-row" data-action="library"><span class="row-icon blue">📚</span><span class="row-text"><span class="row-title">Library</span><span class="row-sub">${libraryMeta}</span></span><span class="chevron">›</span></button>
        <button type="button" class="list-row" data-action="people"><span class="row-icon purple">👥</span><span class="row-text"><span class="row-title">People</span><span class="row-sub">${peopleMeta}</span></span><span class="chevron">›</span></button>
        <button type="button" class="list-row" data-action="conversation"><span class="row-icon green">💬</span><span class="row-text"><span class="row-title">Conversation</span><span class="row-sub">Multi-turn with a person</span></span><span class="chevron">›</span></button>
        <button type="button" class="list-row" data-action="settings"><span class="row-icon slate">⚙️</span><span class="row-text"><span class="row-title">Settings</span><span class="row-sub">Languages, keys, speech</span></span><span class="chevron">›</span></button>
      </div>
    </section>
  </div>`;

  return wrapDocument("SmartTranslate Pro", body);
}

function buildV1HomeHTML(context) {
  const c = context || {};
  const body = `<div class="app">
    ${renderTopbar("SmartTranslate", null)}
    <header class="hero"><div class="hero-inner">
      <div class="hero-icon">🌐</div>
      <div class="lang-pair">
        <span class="lang-chip"><span class="flag">${escapeHtml(c.primaryFlag || "🌐")}</span>${escapeHtml(c.primaryLang || "")}</span>
        <span class="lang-arrow">↔</span>
        <span class="lang-chip"><span class="flag">${escapeHtml(c.conversationFlag || "🌐")}</span>${escapeHtml(c.conversationLang || "")}</span>
      </div>
      <span class="voice-pill">🔊 ${escapeHtml(c.engine || "Apple Voice")}</span>
    </div></header>
    <section class="section">
      <h2 class="section-title">Quick actions</h2>
      <div class="tiles">
        <button type="button" class="tile" data-action="type"><div class="tile-icon blue">⌨️</div><span class="tile-label">Type</span></button>
        <button type="button" class="tile" data-action="paste"><div class="tile-icon green">📋</div><span class="tile-label">Paste</span></button>
        <button type="button" class="tile" data-action="dictate"><div class="tile-icon orange">🎤</div><span class="tile-label">Dictate</span></button>
      </div>
    </section>
    <section class="section">
      <h2 class="section-title">More</h2>
      <div class="list">
        <button type="button" class="list-row" data-action="conversation"><span class="row-icon green">💬</span><span class="row-text"><span class="row-title">Conversation</span><span class="row-sub">Multi-turn sessions</span></span><span class="chevron">›</span></button>
        <button type="button" class="list-row" data-action="settings"><span class="row-icon slate">⚙️</span><span class="row-text"><span class="row-title">Settings</span><span class="row-sub">Languages and API keys</span></span><span class="chevron">›</span></button>
      </div>
    </section>
  </div>`;
  return wrapDocument("SmartTranslate", body);
}

function resetSession() {
  sessionWebView = null;
  sessionPresentPromise = null;
}

function pauseMs(ms) {
  return new Promise((resolve) => {
    Timer.schedule(ms / 1000, false, () => {
      resolve();
    });
  });
}

async function waitForTapAction(webView) {
  return webView.evaluateJavaScript(
    `new Promise(function (resolve) {
      function finish(action) {
        resolve(action);
      }
      function handler(event) {
        var target = event.target.closest("[data-action]");
        if (!target) return;
        event.preventDefault();
        document.removeEventListener("click", handler, true);
        finish(target.getAttribute("data-action"));
      }
      document.addEventListener("click", handler, true);
    })`,
    true
  );
}

async function presentScreen(html) {
  if (typeof WebView === "undefined") {
    return null;
  }

  const isNewSession = !sessionWebView;
  if (!sessionWebView) {
    sessionWebView = new WebView();
  }

  await sessionWebView.loadHTML(html);

  let dismissPromise = sessionPresentPromise;
  if (isNewSession) {
    dismissPromise = sessionWebView.present(false).then(() => {
      resetSession();
      return null;
    });
    sessionPresentPromise = dismissPromise;
    // Scriptable can render a blank WebView if evaluateJavaScript runs before present().
    await pauseMs(300);
  } else {
    await pauseMs(80);
  }

  const actionPromise = waitForTapAction(sessionWebView);
  return Promise.race([actionPromise, dismissPromise]);
}

async function presentTableMenu(options) {
  const html = buildListMenuHTML({
    title: options.title,
    subtitle: options.subtitle,
    sections: options.sections,
    brand: options.brand || "SmartTranslate",
    badge: options.badge || null
  });
  const raw = await presentScreen(html);
  const parsed = parseCompletion(raw);
  return parsed ? parsed.a : null;
}

async function presentMessage(title, message, options) {
  const opts = options || {};
  const html = buildMessageHTML({
    title,
    message,
    variant: opts.variant || "info",
    actions: opts.actions || [{ id: "ok", label: "OK", primary: true }]
  });
  await presentScreen(html);
}

async function presentConfirm(title, message) {
  const html = buildMessageHTML({
    title,
    message,
    variant: "info",
    actions: [
      { id: "yes", label: "Yes", primary: true },
      { id: "no", label: "No" }
    ]
  });
  const raw = await presentScreen(html);
  const parsed = parseCompletion(raw);
  return parsed && parsed.a === "yes";
}

async function presentPicker(title, items, message) {
  if (!items || items.length === 0) {
    return -1;
  }
  const rows = items.map((label, index) => ({
    id: String(index),
    title: label,
    subtitle: "",
    symbol: "list.bullet"
  }));
  const choice = await presentTableMenu({
    title,
    subtitle: message || `${items.length} option${items.length === 1 ? "" : "s"}`,
    sections: [{ rows }]
  });
  if (choice == null) {
    return -1;
  }
  return Number(choice);
}

async function presentBoolean(title, message, currentValue) {
  const choice = await presentTableMenu({
    title,
    subtitle: message,
    sections: [
      {
        rows: [
          {
            id: "yes",
            title: currentValue ? "Yes (Keep Enabled)" : "Yes (Enable)",
            symbol: "checkmark.circle"
          },
          {
            id: "no",
            title: currentValue ? "No (Disable)" : "No (Keep Disabled)",
            symbol: "trash"
          }
        ]
      }
    ]
  });
  if (!choice) {
    return currentValue;
  }
  return choice === "yes";
}

async function presentPrompt(title, message, defaultText, options) {
  const opts = options || {};
  const html = buildPromptHTML({
    title,
    message,
    defaultValue: defaultText || "",
    placeholder: opts.placeholder || "Enter text…",
    secure: !!opts.secure
  });

  if (typeof WebView === "undefined") {
    return null;
  }

  const isNewSession = !sessionWebView;
  if (!sessionWebView) {
    sessionWebView = new WebView();
  }

  await sessionWebView.loadHTML(html);

  let dismissPromise = sessionPresentPromise;
  if (isNewSession) {
    dismissPromise = sessionWebView.present(false).then(() => {
      resetSession();
      return null;
    });
    sessionPresentPromise = dismissPromise;
    await pauseMs(300);
  } else {
    await pauseMs(80);
  }

  const raw = await Promise.race([
    bindPromptHandlers(sessionWebView, true),
    dismissPromise
  ]);

  const parsed = parseCompletion(raw);
  if (!parsed || parsed.a === "cancel") {
    return null;
  }
  return String(parsed.v || "").trim();
}

async function presentSecurePrompt(title, message, placeholder) {
  return presentPrompt(title, message, "", {
    secure: true,
    placeholder: placeholder || "Paste API key here…"
  });
}

async function presentApiKeyWizardHub(status) {
  const raw = await presentScreen(buildApiKeyWizardHTML(status));
  const parsed = parseCompletion(raw);
  return parsed ? parsed.a : null;
}

async function presentApiKeyDetail(service) {
  const raw = await presentScreen(buildApiKeyDetailHTML(service));
  const parsed = parseCompletion(raw);
  return parsed ? parsed.a : null;
}

async function presentProHome(context) {
  const raw = await presentScreen(buildProHomeHTML(context));
  const parsed = parseCompletion(raw);
  if (!parsed) {
    return null;
  }
  if (parsed.a === "continue") {
    return "conversation";
  }
  return parsed.a;
}

async function presentV1Home(context) {
  const raw = await presentScreen(buildV1HomeHTML(context));
  const parsed = parseCompletion(raw);
  return parsed ? parsed.a : null;
}

module.exports = {
  flagForCode,
  buildProHomeHTML,
  buildV1HomeHTML,
  buildListMenuHTML,
  presentScreen,
  presentTableMenu,
  presentMessage,
  presentConfirm,
  presentPicker,
  presentBoolean,
  presentPrompt,
  presentSecurePrompt,
  presentApiKeyWizardHub,
  presentApiKeyDetail,
  presentProHome,
  presentV1Home,
  resetSession
};

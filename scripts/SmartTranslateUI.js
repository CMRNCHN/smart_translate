// SmartTranslateUI.js
//
// WebView-based home screen for SmartTranslate Pro (mockup-style UI).
//
// Version: 1.0.0

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

let homeWebView = null;
let homePresentPromise = null;

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
    ? `
    <section class="section">
      <h2 class="section-title">Continue</h2>
      <button type="button" class="continue-card" data-action="continue">
        <span class="continue-dot" aria-hidden="true"></span>
        <span class="continue-text">
          <span class="continue-title">${escapeHtml(c.activeSession.name)}</span>
          <span class="continue-sub">${c.activeSession.turns} turn${c.activeSession.turns === 1 ? "" : "s"} · tap to resume</span>
        </span>
        <span class="chevron" aria-hidden="true">›</span>
      </button>
    </section>`
    : "";

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover, user-scalable=no">
<meta name="color-scheme" content="dark">
<title>SmartTranslate Pro</title>
<style>
  :root {
    --bg: #070b14;
    --bg-elevated: #111827;
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
    --radius-lg: 20px;
    --radius-md: 16px;
    --radius-sm: 12px;
    --shadow: 0 18px 48px rgba(0, 0, 0, 0.38);
  }

  * { box-sizing: border-box; -webkit-tap-highlight-color: transparent; }

  html, body {
    margin: 0;
    padding: 0;
    min-height: 100%;
    background: var(--bg);
    color: var(--text);
    font-family: -apple-system, BlinkMacSystemFont, "SF Pro Text", "SF Pro Display", "Helvetica Neue", sans-serif;
    -webkit-font-smoothing: antialiased;
  }

  body {
    padding:
      calc(env(safe-area-inset-top, 12px) + 12px)
      16px
      calc(env(safe-area-inset-bottom, 12px) + 24px);
  }

  .app {
    max-width: 440px;
    margin: 0 auto;
  }

  .topbar {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 14px;
    padding: 0 2px;
  }

  .brand {
    font-size: 13px;
    font-weight: 700;
    letter-spacing: 0.14em;
    text-transform: uppercase;
    color: var(--text-tertiary);
  }

  .pro-pill {
    font-size: 11px;
    font-weight: 700;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    color: #c4b5fd;
    background: rgba(124, 58, 237, 0.22);
    border: 1px solid rgba(167, 139, 250, 0.28);
    padding: 5px 10px;
    border-radius: 999px;
  }

  .hero {
    position: relative;
    overflow: hidden;
    border-radius: var(--radius-lg);
    padding: 22px 20px 20px;
    margin-bottom: 22px;
    background: linear-gradient(135deg, var(--hero-start) 0%, var(--hero-end) 100%);
    box-shadow: var(--shadow);
    border: 1px solid rgba(255, 255, 255, 0.12);
  }

  .hero::before {
    content: "";
    position: absolute;
    inset: 0;
    background:
      radial-gradient(circle at 85% 15%, rgba(255,255,255,0.22), transparent 42%),
      radial-gradient(circle at 10% 90%, rgba(255,255,255,0.08), transparent 35%);
    pointer-events: none;
  }

  .hero-inner { position: relative; z-index: 1; }

  .hero-icon {
    width: 42px;
    height: 42px;
    border-radius: 14px;
    display: flex;
    align-items: center;
    justify-content: center;
    background: rgba(255, 255, 255, 0.16);
    border: 1px solid rgba(255, 255, 255, 0.18);
    margin-bottom: 14px;
    font-size: 22px;
  }

  .lang-pair {
    display: flex;
    align-items: center;
    gap: 10px;
    flex-wrap: wrap;
    margin-bottom: 12px;
  }

  .lang-chip {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    font-size: 22px;
    font-weight: 700;
    letter-spacing: -0.02em;
  }

  .lang-chip .flag { font-size: 24px; line-height: 1; }

  .lang-arrow {
    color: rgba(255, 255, 255, 0.72);
    font-size: 18px;
    font-weight: 600;
  }

  .voice-pill {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    font-size: 12px;
    font-weight: 600;
    color: rgba(255, 255, 255, 0.92);
    background: rgba(0, 0, 0, 0.18);
    border: 1px solid rgba(255, 255, 255, 0.14);
    padding: 6px 12px;
    border-radius: 999px;
  }

  .section { margin-bottom: 18px; }

  .section-title {
    margin: 0 0 10px 4px;
    font-size: 13px;
    font-weight: 600;
    color: var(--text-tertiary);
    letter-spacing: 0.02em;
  }

  .tiles {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 10px;
  }

  .tile {
    appearance: none;
    border: 1px solid var(--card-border);
    background: var(--card);
    border-radius: var(--radius-md);
    padding: 14px 10px 12px;
    color: var(--text);
    text-align: center;
    box-shadow: 0 10px 24px rgba(0, 0, 0, 0.22);
    transition: transform 0.12s ease, border-color 0.12s ease;
  }

  .tile:active {
    transform: scale(0.97);
    border-color: rgba(255, 255, 255, 0.16);
  }

  .tile-icon {
    width: 42px;
    height: 42px;
    margin: 0 auto 10px;
    border-radius: 14px;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .tile-icon svg {
    width: 22px;
    height: 22px;
    stroke: currentColor;
    fill: none;
    stroke-width: 1.8;
    stroke-linecap: round;
    stroke-linejoin: round;
  }

  .tile-icon.blue { color: #93c5fd; background: rgba(79, 140, 255, 0.16); }
  .tile-icon.green { color: #6ee7b7; background: rgba(52, 211, 153, 0.14); }
  .tile-icon.orange { color: #fdba74; background: rgba(251, 146, 60, 0.16); }

  .tile-label {
    display: block;
    font-size: 14px;
    font-weight: 650;
    letter-spacing: -0.01em;
  }

  .continue-card,
  .list-row {
    width: 100%;
    appearance: none;
    border: 1px solid var(--card-border);
    background: var(--card);
    color: inherit;
    border-radius: var(--radius-md);
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 14px 14px;
    text-align: left;
    box-shadow: 0 10px 24px rgba(0, 0, 0, 0.18);
    transition: transform 0.12s ease, border-color 0.12s ease;
  }

  .continue-card:active,
  .list-row:active {
    transform: scale(0.99);
    border-color: rgba(255, 255, 255, 0.14);
  }

  .continue-dot {
    width: 10px;
    height: 10px;
    border-radius: 50%;
    background: var(--accent-orange);
    box-shadow: 0 0 0 4px rgba(251, 146, 60, 0.18);
    flex-shrink: 0;
  }

  .continue-text,
  .row-text { flex: 1; min-width: 0; }

  .continue-title,
  .row-title {
    display: block;
    font-size: 16px;
    font-weight: 650;
    letter-spacing: -0.02em;
    margin-bottom: 2px;
  }

  .continue-sub,
  .row-sub {
    display: block;
    font-size: 13px;
    color: var(--text-secondary);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .list {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  .row-icon {
    width: 38px;
    height: 38px;
    border-radius: 12px;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
    font-size: 18px;
  }

  .row-icon.library { background: rgba(79, 140, 255, 0.14); }
  .row-icon.people { background: rgba(167, 139, 250, 0.14); }
  .row-icon.conversation { background: rgba(52, 211, 153, 0.14); }
  .row-icon.settings { background: rgba(148, 163, 184, 0.14); }

  .chevron {
    color: var(--text-tertiary);
    font-size: 22px;
    line-height: 1;
    font-weight: 300;
    flex-shrink: 0;
  }
</style>
</head>
<body>
  <div class="app">
    <div class="topbar">
      <div class="brand">SmartTranslate</div>
      <div class="pro-pill">Pro</div>
    </div>

    <header class="hero">
      <div class="hero-inner">
        <div class="hero-icon" aria-hidden="true">🌐</div>
        <div class="lang-pair">
          <span class="lang-chip"><span class="flag">${primaryFlag}</span>${primaryLang}</span>
          <span class="lang-arrow">↔</span>
          <span class="lang-chip"><span class="flag">${conversationFlag}</span>${conversationLang}</span>
        </div>
        <span class="voice-pill">🔊 ${engine}</span>
      </div>
    </header>

    <section class="section">
      <h2 class="section-title">Quick actions</h2>
      <div class="tiles">
        <button type="button" class="tile" data-action="type">
          <div class="tile-icon blue" aria-hidden="true">
            <svg viewBox="0 0 24 24"><rect x="3" y="5" width="18" height="14" rx="2"></rect><path d="M7 15h0"></path><path d="M10 15h4"></path><path d="M7 11h10"></path></svg>
          </div>
          <span class="tile-label">Type</span>
        </button>
        <button type="button" class="tile" data-action="paste">
          <div class="tile-icon green" aria-hidden="true">
            <svg viewBox="0 0 24 24"><path d="M9 5h6a2 2 0 0 1 2 2v2H7V7a2 2 0 0 1 2-2z"></path><rect x="5" y="9" width="14" height="12" rx="2"></rect></svg>
          </div>
          <span class="tile-label">Paste</span>
        </button>
        <button type="button" class="tile" data-action="dictate">
          <div class="tile-icon orange" aria-hidden="true">
            <svg viewBox="0 0 24 24"><path d="M12 14a3 3 0 0 0 3-3V6a3 3 0 1 0-6 0v5a3 3 0 0 0 3 3z"></path><path d="M19 11a7 7 0 0 1-14 0"></path><path d="M12 18v3"></path></svg>
          </div>
          <span class="tile-label">Dictate</span>
        </button>
      </div>
    </section>

    ${continueBlock}

    <section class="section">
      <h2 class="section-title">Saved</h2>
      <div class="list">
        <button type="button" class="list-row" data-action="library">
          <span class="row-icon library" aria-hidden="true">📚</span>
          <span class="row-text">
            <span class="row-title">Library</span>
            <span class="row-sub">${libraryMeta}</span>
          </span>
          <span class="chevron" aria-hidden="true">›</span>
        </button>
        <button type="button" class="list-row" data-action="people">
          <span class="row-icon people" aria-hidden="true">👥</span>
          <span class="row-text">
            <span class="row-title">People</span>
            <span class="row-sub">${peopleMeta}</span>
          </span>
          <span class="chevron" aria-hidden="true">›</span>
        </button>
        <button type="button" class="list-row" data-action="conversation">
          <span class="row-icon conversation" aria-hidden="true">💬</span>
          <span class="row-text">
            <span class="row-title">Conversation</span>
            <span class="row-sub">Multi-turn with a person</span>
          </span>
          <span class="chevron" aria-hidden="true">›</span>
        </button>
        <button type="button" class="list-row" data-action="settings">
          <span class="row-icon settings" aria-hidden="true">⚙️</span>
          <span class="row-text">
            <span class="row-title">Settings</span>
            <span class="row-sub">Languages, keys, speech</span>
          </span>
          <span class="chevron" aria-hidden="true">›</span>
        </button>
      </div>
    </section>
  </div>
</body>
</html>`;
}

function resetProHomeSession() {
  homeWebView = null;
  homePresentPromise = null;
}

async function waitForHomeAction(webView) {
  return webView.evaluateJavaScript(
    `
    (function () {
      function handler(event) {
        var target = event.target.closest("[data-action]");
        if (!target) {
          return;
        }
        event.preventDefault();
        document.removeEventListener("click", handler, true);
        completion(target.getAttribute("data-action"));
      }
      document.addEventListener("click", handler, true);
    })();
    `,
    true
  );
}

async function presentProHome(context) {
  if (typeof WebView === "undefined") {
    return null;
  }

  const html = buildProHomeHTML(context);

  if (!homeWebView) {
    homeWebView = new WebView();
    await homeWebView.loadHTML(html);
    homePresentPromise = homeWebView.present(true).then(() => {
      resetProHomeSession();
      return null;
    });
  } else {
    await homeWebView.loadHTML(html);
  }

  const actionPromise = waitForHomeAction(homeWebView);
  const result = await Promise.race([actionPromise, homePresentPromise]);

  if (!result) {
    return null;
  }

  if (result === "continue") {
    return "conversation";
  }

  return result;
}

module.exports = {
  flagForCode,
  buildProHomeHTML,
  presentProHome,
  resetProHomeSession
};

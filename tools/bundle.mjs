#!/usr/bin/env node
/**
 * Bundle modular Scriptable sources into single-file standalones
 * with Tampermonkey-compatible update metadata.
 *
 * Output:
 *   scripts/dist/SmartTranslate.js
 *   scripts/dist/SmartTranslate.user.js
 *   scripts/dist/SmartTranslatePro.js
 *   scripts/dist/SmartTranslatePro.user.js
 *
 * Usage: node tools/bundle.mjs
 */

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");
const scriptsDir = path.join(root, "scripts");
const distDir = path.join(scriptsDir, "dist");

// Public hosting — update if the GitHub owner/repo changes.
const GITHUB_OWNER = "CMRNCHN";
const GITHUB_REPO = "smart_translate";
const GITHUB_REF = "main";
const VERSION = "1.0.1";

const RAW_BASE = `https://raw.githubusercontent.com/${GITHUB_OWNER}/${GITHUB_REPO}/${GITHUB_REF}/scripts/dist`;
const JSDELIVR_BASE = `https://cdn.jsdelivr.net/gh/${GITHUB_OWNER}/${GITHUB_REPO}@${GITHUB_REF}/scripts/dist`;

function read(name) {
  return fs.readFileSync(path.join(scriptsDir, name), "utf8");
}

function stripImportModule(source) {
  return source.replace(
    /^\s*(?:let|const)\s+\w+\s*=\s*importModule\([^)]+\);\s*$/gm,
    ""
  );
}

function stripTryImportBlocks(source) {
  return source.replace(
    /let Shared;[\s\S]*?if \(modulesLoaded\) \{\s*await main\(\);\s*\}\s*Script\.complete\(\);\s*/m,
    ""
  );
}

function toConstExport(source, constName) {
  let out = stripImportModule(source);
  out = out.replace(
    /module\.exports\s*=\s*\{/,
    `const ${constName} = {`
  );
  return out.trim() + "\n";
}

function stripTopLevelAwaitMain(source) {
  return source
    .replace(/^\s*await main\(\);\s*$/gm, "")
    .replace(/^\s*Script\.complete\(\);\s*$/gm, "");
}

function prepareEntry(source) {
  let out = stripTryImportBlocks(source);
  out = stripImportModule(out);
  out = stripTopLevelAwaitMain(out);
  return out;
}

function userscriptHeader({ name, description, fileBase }) {
  const downloadURL = `${RAW_BASE}/${fileBase}.user.js`;
  const updateURL = downloadURL;
  const cdnURL = `${JSDELIVR_BASE}/${fileBase}.user.js`;
  return `// ==UserScript==
// @name         ${name}
// @namespace    https://github.com/${GITHUB_OWNER}/${GITHUB_REPO}
// @version      ${VERSION}
// @description  ${description}
// @author       ${GITHUB_OWNER}
// @match        https://raw.githubusercontent.com/${GITHUB_OWNER}/${GITHUB_REPO}/*
// @match        https://cdn.jsdelivr.net/gh/${GITHUB_OWNER}/${GITHUB_REPO}@*
// @grant        none
// @downloadURL  ${downloadURL}
// @updateURL    ${updateURL}
// @homepageURL  https://github.com/${GITHUB_OWNER}/${GITHUB_REPO}
// @supportURL   https://github.com/${GITHUB_OWNER}/${GITHUB_REPO}/issues
// ==/UserScript==
//
// Install / auto-update (Tampermonkey):
//   ${downloadURL}
// Mirror (jsDelivr):
//   ${cdnURL}
//
// Scriptable: paste this entire file into one Scriptable script (any name).
// Browser Tampermonkey install is for updates only — this script runs in Scriptable.
`;
}

function wrapForRuntime(body) {
  return `
(async function SmartTranslateStandalone() {
  const isScriptable =
    typeof Alert !== "undefined" &&
    typeof Script !== "undefined" &&
    typeof FileManager !== "undefined";

  if (!isScriptable) {
    console.info(
      "[SmartTranslate] Userscript installed for auto-updates. Open/paste this file in Scriptable to run."
    );
    return;
  }

${body}

  await main();
  Script.complete();
})();
`;
}

function bundleV1Body() {
  const shared = toConstExport(read("SmartTranslateShared.js"), "Shared");
  const conversation = toConstExport(
    read("SmartTranslateConversation.js"),
    "Conversation"
  );
  const entry = prepareEntry(read("SmartTranslate.js"));
  return `${shared}\n${conversation}\n${entry.trim()}`;
}

function bundleProBody() {
  const shared = toConstExport(read("SmartTranslateShared.js"), "Shared");
  const conversation = toConstExport(
    read("SmartTranslateConversation.js"),
    "Conversation"
  );
  const proKit = toConstExport(read("SmartTranslateProKit.js"), "Pro");
  const entry = prepareEntry(read("SmartTranslatePro.js"));
  return `${shared}\n${conversation}\n${proKit}\n${entry.trim()}`;
}

function writeBundle({ fileBase, name, description, body }) {
  const header = userscriptHeader({ name, description, fileBase });
  const content = `${header}${wrapForRuntime(body)}\n`;
  const jsPath = path.join(distDir, `${fileBase}.js`);
  const userPath = path.join(distDir, `${fileBase}.user.js`);
  fs.writeFileSync(jsPath, content);
  fs.writeFileSync(userPath, content);
  return {
    jsPath,
    userPath,
    raw: `${RAW_BASE}/${fileBase}.user.js`,
    cdn: `${JSDELIVR_BASE}/${fileBase}.user.js`
  };
}

fs.mkdirSync(distDir, { recursive: true });

const v1 = writeBundle({
  fileBase: "SmartTranslate",
  name: "SmartTranslate (Scriptable)",
  description:
    "Scriptable bidirectional translator + conversation mode (standalone bundle)",
  body: bundleV1Body()
});

const pro = writeBundle({
  fileBase: "SmartTranslatePro",
  name: "SmartTranslate Pro (Scriptable)",
  description:
    "Scriptable translator Pro: library, people, stats, export, intelligence",
  body: bundleProBody()
});

const linksPath = path.join(distDir, "LINKS.md");
fs.writeFileSync(
  linksPath,
  `# SmartTranslate distributable links

Version: **${VERSION}**  
Branch/ref: **${GITHUB_REF}**

## Tampermonkey (auto-update)

Install either URL in Tampermonkey (or Violentmonkey). Updates use \`@updateURL\`.

### SmartTranslate (v1)

- Raw: ${v1.raw}
- jsDelivr: ${v1.cdn}

### SmartTranslate Pro

- Raw: ${pro.raw}
- jsDelivr: ${pro.cdn}

## Scriptable

Paste the same file into one Scriptable script. Prefer the raw or jsDelivr URL contents.

## Rebuild

\`\`\`bash
node tools/bundle.mjs
\`\`\`
`
);

console.log("Wrote bundles + LINKS.md");
console.log("V1:", v1.raw);
console.log("Pro:", pro.raw);

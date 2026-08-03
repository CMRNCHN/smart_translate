// SmartTranslateInstaller.js
//
// Paste this ONE small script into Scriptable (name it "SmartTranslate Installer").
// It downloads SmartTranslate from GitHub, caches it in iCloud, and runs it —
// no manual copy/paste of the big bundle files.
//
// Version: 1.0.0

const INSTALLER_VERSION = "1.0.0";

const CONFIG = {
  repo: "CMRNCHN/smart_translate",
  branch: "cursor/scriptable-only-bundler",
  cacheHours: 24,
  variants: {
    v1: {
      label: "SmartTranslate (v1)",
      scriptName: "SmartTranslate",
      file: "SmartTranslate.js"
    },
    pro: {
      label: "SmartTranslate Pro",
      scriptName: "SmartTranslatePro",
      file: "SmartTranslatePro.js"
    }
  }
};

// ============================================================
// DOWNLOAD + CACHE
// ============================================================

function getFileManager() {
  return FileManager.iCloud();
}

function getCacheDirectory() {
  const fm = getFileManager();
  const directory = fm.joinPath(fm.documentsDirectory(), "SmartTranslate", "installer");
  if (!fm.fileExists(directory)) {
    fm.createDirectory(directory, true);
  }
  return directory;
}

function getCachePath(file) {
  return getFileManager().joinPath(getCacheDirectory(), file);
}

function rawUrl(file) {
  return `https://raw.githubusercontent.com/${CONFIG.repo}/${CONFIG.branch}/scripts/dist/${file}`;
}

function githubPageUrl(file) {
  return `https://github.com/${CONFIG.repo}/blob/${CONFIG.branch}/scripts/dist/${file}`;
}

function readBundleVersion(source) {
  const match = source.match(/Version:\s*([^\n]+)/);
  return match ? match[1].trim() : "unknown";
}

function validateBundle(source, label) {
  if (!source || source.length < 5000) {
    throw new Error(`${label} download looks too small. Check your connection.`);
  }
  if (!source.includes("async function main")) {
    throw new Error(`${label} download does not look like a SmartTranslate bundle.`);
  }
}

async function downloadBundle(file) {
  const request = new Request(rawUrl(file));
  request.timeoutInterval = 90;
  request.headers = {
    "User-Agent": `SmartTranslateInstaller/${INSTALLER_VERSION}`
  };
  const text = await request.loadString();
  validateBundle(text, file);
  return text;
}

function readCacheMeta(path) {
  const fm = getFileManager();
  if (!fm.fileExists(path)) {
    return null;
  }
  const modified = fm.modificationDate(path);
  const source = fm.readString(path);
  return {
    path,
    modified,
    ageMs: Date.now() - modified.getTime(),
    bytes: source.length,
    version: readBundleVersion(source),
    source
  };
}

async function ensureBundle(file, forceRefresh) {
  const path = getCachePath(file);
  const meta = readCacheMeta(path);
  const maxAgeMs = CONFIG.cacheHours * 60 * 60 * 1000;

  if (!forceRefresh && meta && meta.ageMs < maxAgeMs) {
    return meta.source;
  }

  const text = await downloadBundle(file);
  getFileManager().writeString(path, text);
  return text;
}

// ============================================================
// RUN / INSTALL ACTIONS
// ============================================================

async function runBundle(source) {
  const runner = new Function(`return (async () => {\n${source}\n})()`);
  await runner();
}

async function runVariant(key, forceRefresh) {
  const variant = CONFIG.variants[key];
  await showInfo("Downloading…", `Fetching ${variant.label} from GitHub.`);
  const source = await ensureBundle(variant.file, forceRefresh);
  await runBundle(source);
}

async function copyVariantToClipboard(key, forceRefresh) {
  const variant = CONFIG.variants[key];
  await showInfo("Downloading…", `Fetching ${variant.label} for clipboard install.`);
  const source = await ensureBundle(variant.file, forceRefresh);
  Pasteboard.copy(source);

  const alert = new Alert();
  alert.title = "Copied to clipboard";
  alert.message =
    `${variant.label} is on your clipboard.\n\n` +
    `To install as its own script:\n` +
    `1. Tap + in Scriptable\n` +
    `2. Name it "${variant.scriptName}"\n` +
    `3. Paste and save\n` +
    `4. Run "${variant.scriptName}" directly next time\n\n` +
    `Or just keep using this installer — it caches the app locally.`;
  alert.addAction("OK");
  await alert.presentAlert();
}

async function showCacheStatus() {
  const lines = [`Installer v${INSTALLER_VERSION}`, `Branch: ${CONFIG.branch}`, ""];

  for (const key of Object.keys(CONFIG.variants)) {
    const variant = CONFIG.variants[key];
    const meta = readCacheMeta(getCachePath(variant.file));
    if (!meta) {
      lines.push(`${variant.label}: not downloaded yet`);
      continue;
    }
    const hours = Math.round(meta.ageMs / (60 * 60 * 1000));
    lines.push(`${variant.label}: ${meta.version}`);
    lines.push(`  cached ${hours}h ago (${meta.bytes} bytes)`);
  }

  lines.push("");
  lines.push(`Cache folder: SmartTranslate/installer/`);
  lines.push(`(Files app → iCloud Drive → Scriptable → SmartTranslate/installer)`);

  await showInfo("Cache status", lines.join("\n"));
}

async function openDownloadLinks() {
  const alert = new Alert();
  alert.title = "Download links";
  alert.message = "Opens in Safari. On GitHub pages, tap Raw before copying.";
  alert.addAction("Open v1 on GitHub");
  alert.addAction("Open Pro on GitHub");
  alert.addAction("Open v1 raw file");
  alert.addAction("Open Pro raw file");
  alert.addAction("Cancel");

  const choice = await alert.presentAlert();
  if (choice === 0) {
    Safari.open(githubPageUrl(CONFIG.variants.v1.file));
  } else if (choice === 1) {
    Safari.open(githubPageUrl(CONFIG.variants.pro.file));
  } else if (choice === 2) {
    Safari.open(rawUrl(CONFIG.variants.v1.file));
  } else if (choice === 3) {
    Safari.open(rawUrl(CONFIG.variants.pro.file));
  }
}

// ============================================================
// UI HELPERS
// ============================================================

async function showInfo(title, message) {
  const alert = new Alert();
  alert.title = title;
  alert.message = message;
  alert.addAction("OK");
  await alert.presentAlert();
}

async function showError(title, error) {
  const alert = new Alert();
  alert.title = title;
  alert.message = String(error && error.message ? error.message : error);
  alert.addAction("OK");
  await alert.presentAlert();
}

async function presentMainMenu() {
  const alert = new Alert();
  alert.title = "SmartTranslate Installer";
  alert.message =
    `Downloads and runs SmartTranslate from GitHub.\n` +
    `No copy/paste of large files needed.\n\n` +
    `Branch: ${CONFIG.branch}`;
  alert.addAction("Run SmartTranslate (v1)");
  alert.addAction("Run SmartTranslate Pro");
  alert.addAction("Update & Run v1");
  alert.addAction("Update & Run Pro");
  alert.addAction("Copy v1 to clipboard");
  alert.addAction("Copy Pro to clipboard");
  alert.addAction("Cache status");
  alert.addAction("Open download links");
  alert.addAction("Cancel");

  const choice = await alert.presentAlert();
  return choice;
}

// ============================================================
// MAIN
// ============================================================

async function main() {
  const choice = await presentMainMenu();

  try {
    if (choice === 0) {
      await runVariant("v1", false);
    } else if (choice === 1) {
      await runVariant("pro", false);
    } else if (choice === 2) {
      await runVariant("v1", true);
    } else if (choice === 3) {
      await runVariant("pro", true);
    } else if (choice === 4) {
      await copyVariantToClipboard("v1", false);
    } else if (choice === 5) {
      await copyVariantToClipboard("pro", false);
    } else if (choice === 6) {
      await showCacheStatus();
    } else if (choice === 7) {
      await openDownloadLinks();
    }
  } catch (error) {
    await showError("Installer failed", error);
  }
}

await main();
Script.complete();

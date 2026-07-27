// SmartTranslateShared.js
//
// Shared config, storage, DeepL, Keychain, and TTS for SmartTranslate v1.
// Imported by SmartTranslate.js and SmartTranslateConversation.js.
//
// Version: 1.0.0

const APP_DIRECTORY = "SmartTranslate";
const CONFIG_FILE = "config.json";
const PEOPLE_FILE = "people.json";
const ACTIVE_SESSION_FILE = "active_session.json";
const CONVERSATIONS_DIRECTORY = "conversations";

const DEEPL_KEYCHAIN_KEY = "SMART_TRANSLATE_DEEPL_API_KEY";
const ELEVENLABS_KEYCHAIN_KEY = "SMART_TRANSLATE_ELEVENLABS_API_KEY";

const DEEPL_TIMEOUT = 15;
const ELEVENLABS_TIMEOUT = 30;

const MAX_INPUT_LENGTH = 5000;
const MAX_VOICE_RESULTS = 50;

const DEFAULT_CONFIG = {
  version: 1,
  languages: {
    primary: "EN-US",
    conversation: "ES",
    defaultTarget: "EN-US"
  },
  input: {
    dictationLanguage: "auto"
  },
  speech: {
    engine: "apple",
    apple: {
      rate: 0.45,
      pitch: 1.0
    },
    elevenlabs: {
      enabled: false,
      modelId: "eleven_multilingual_v2",
      voices: {}
    }
  }
};

const LANGUAGE_OPTIONS = [
  { code: "AR", name: "Arabic" },
  { code: "ZH", name: "Chinese (Simplified)" },
  { code: "NL", name: "Dutch" },
  { code: "EN-US", name: "English (US)" },
  { code: "EN-GB", name: "English (UK)" },
  { code: "FR", name: "French" },
  { code: "DE", name: "German" },
  { code: "HE", name: "Hebrew" },
  { code: "IT", name: "Italian" },
  { code: "JA", name: "Japanese" },
  { code: "KO", name: "Korean" },
  { code: "PL", name: "Polish" },
  { code: "PT-PT", name: "Portuguese" },
  { code: "PT-BR", name: "Portuguese (Brazil)" },
  { code: "RU", name: "Russian" },
  { code: "ES", name: "Spanish" },
  { code: "TR", name: "Turkish" },
  { code: "UK", name: "Ukrainian" }
];

// ============================================================
// iCLOUD STORAGE
// ============================================================

function getFileManager() {
  return FileManager.iCloud();
}

function getAppDirectory() {
  const fm = getFileManager();
  const directory = fm.joinPath(fm.documentsDirectory(), APP_DIRECTORY);
  if (!fm.fileExists(directory)) {
    fm.createDirectory(directory, true);
  }
  return directory;
}

function getConversationsDirectory() {
  const fm = getFileManager();
  const directory = fm.joinPath(getAppDirectory(), CONVERSATIONS_DIRECTORY);
  if (!fm.fileExists(directory)) {
    fm.createDirectory(directory, true);
  }
  return directory;
}

function resolveAppPath(filenameOrPath) {
  if (filenameOrPath.startsWith("/")) {
    return filenameOrPath;
  }
  return getFileManager().joinPath(getAppDirectory(), filenameOrPath);
}

async function ensureDownloaded(path) {
  const fm = getFileManager();
  if (!fm.fileExists(path)) {
    return false;
  }
  if (fm.isFileStoredIniCloud(path) && !fm.isFileDownloaded(path)) {
    await fm.downloadFileFromiCloud(path);
  }
  return true;
}

async function loadJSON(filenameOrPath) {
  const fm = getFileManager();
  const path = resolveAppPath(filenameOrPath);
  if (!(await ensureDownloaded(path))) {
    return null;
  }
  try {
    return JSON.parse(fm.readString(path));
  } catch {
    return null;
  }
}

async function saveJSON(filenameOrPath, value) {
  const fm = getFileManager();
  const path = resolveAppPath(filenameOrPath);
  const parent = path.substring(0, path.lastIndexOf("/"));
  if (parent && !fm.fileExists(parent)) {
    fm.createDirectory(parent, true);
  }
  fm.writeString(path, JSON.stringify(value, null, 2));
}

async function deleteFile(filenameOrPath) {
  const fm = getFileManager();
  const path = resolveAppPath(filenameOrPath);
  if (await ensureDownloaded(path)) {
    fm.remove(path);
  }
}

async function listConversationFiles() {
  const fm = getFileManager();
  const directory = getConversationsDirectory();
  if (fm.isFileStoredIniCloud(directory) && !fm.isFileDownloaded(directory)) {
    await fm.downloadFileFromiCloud(directory);
  }
  const names = fm.listContents(directory) || [];
  const paths = [];
  for (const name of names) {
    if (!name.endsWith(".json")) {
      continue;
    }
    const path = fm.joinPath(directory, name);
    await ensureDownloaded(path);
    paths.push(path);
  }
  return paths;
}

// ============================================================
// CONFIG
// ============================================================

async function loadConfig() {
  const stored = await loadJSON(CONFIG_FILE);
  if (!stored) {
    return null;
  }
  return deepMerge(DEFAULT_CONFIG, stored);
}

async function saveConfig(config) {
  await saveJSON(CONFIG_FILE, config);
}

// ============================================================
// KEYCHAIN
// ============================================================

function getRequiredKey(keychainKey, serviceName) {
  if (!Keychain.contains(keychainKey)) {
    throw new Error(
      `${serviceName} API key is missing.\n\nExpected Keychain entry:\n${keychainKey}`
    );
  }
  const key = Keychain.get(keychainKey);
  if (!key || !key.trim()) {
    throw new Error(`${serviceName} API key is empty.`);
  }
  return key.trim();
}

async function configureSecret(title, keychainKey, message) {
  const existing = Keychain.contains(keychainKey) ? Keychain.get(keychainKey) : "";
  const alert = new Alert();
  alert.title = title;
  alert.message = existing
    ? `${message}\n\nA key is already configured. Enter a new key to replace it.`
    : message;
  alert.addSecureTextField(
    existing ? "Enter new API key..." : "Paste API key here...",
    ""
  );
  alert.addAction(existing ? "Replace Key" : "Save Key");
  if (existing) {
    alert.addAction("Keep Existing");
  }
  alert.addCancelAction("Cancel");

  const choice = await alert.presentAlert();
  if (choice === -1) {
    return null;
  }
  if (existing && choice === 1) {
    return existing;
  }
  if (existing && choice === 2) {
    return null;
  }

  const newKey = alert.textFieldValue(0).trim();
  if (!newKey) {
    await showError(`${title} cannot be empty.`);
    return null;
  }
  Keychain.set(keychainKey, newKey);
  return newKey;
}

// ============================================================
// DEEPL
// ============================================================

async function translateWithDeepL(text, apiKey, languages) {
  const initialTarget = languages.defaultTarget;
  const firstResult = await requestDeepLTranslation(text, initialTarget, apiKey);
  const detectedLanguage = firstResult.translations[0].detected_source_language;

  let finalTranslation = firstResult.translations[0].text;
  let finalTarget = initialTarget;

  if (
    normalizeLanguage(detectedLanguage) === normalizeLanguage(initialTarget)
  ) {
    const alternateTarget = getAlternateTarget(languages);
    if (
      alternateTarget &&
      normalizeLanguage(alternateTarget) !== normalizeLanguage(detectedLanguage)
    ) {
      const secondResult = await requestDeepLTranslation(
        text,
        alternateTarget,
        apiKey
      );
      finalTranslation = secondResult.translations[0].text;
      finalTarget = alternateTarget;
    }
  }

  return {
    translation: finalTranslation,
    detectedLanguage,
    targetLanguage: finalTarget
  };
}

async function requestDeepLTranslation(text, targetLanguage, apiKey) {
  const isFree = apiKey.endsWith(":fx");
  const deeplUrl = isFree
    ? "https://api-free.deepl.com/v2/translate"
    : "https://api.deepl.com/v2/translate";
  const request = new Request(deeplUrl);
  request.method = "POST";
  request.timeoutInterval = DEEPL_TIMEOUT;
  request.headers = {
    Authorization: `DeepL-Auth-Key ${apiKey}`,
    "Content-Type": "application/x-www-form-urlencoded"
  };
  request.body = `text=${encodeURIComponent(text)}&target_lang=${encodeURIComponent(targetLanguage)}`;

  const response = await request.loadJSON();
  if (!response?.translations?.[0]?.text) {
    throw new Error("DeepL returned an invalid response.");
  }
  return response;
}

function getAlternateTarget(languages) {
  const { primary, conversation, defaultTarget } = languages;
  if (normalizeLanguage(primary) !== normalizeLanguage(defaultTarget)) {
    return primary;
  }
  if (normalizeLanguage(conversation) !== normalizeLanguage(defaultTarget)) {
    return conversation;
  }
  return null;
}

// ============================================================
// TTS
// ============================================================

async function speakTranslation(text, targetLanguage, config) {
  if (
    config.speech.engine === "elevenlabs" &&
    config.speech.elevenlabs.enabled
  ) {
    const voice = config.speech.elevenlabs.voices[targetLanguage];
    if (voice?.voiceId) {
      try {
        const elevenLabsKey = getRequiredKey(
          ELEVENLABS_KEYCHAIN_KEY,
          "ElevenLabs"
        );
        await speakWithElevenLabs(text, voice.voiceId, elevenLabsKey, config);
        return;
      } catch (error) {
        console.error(
          `ElevenLabs failed: ${error.message}. Falling back to Apple speech.`
        );
      }
    }
  }
  await speakWithApple(text, targetLanguage, config);
}

async function speakWithApple(text, targetLanguage, config) {
  // Official API is Speech.speak(text) only. Rate/language options are not
  // documented; keep rate in config for future use / ElevenLabs parity.
  await Speech.speak(text);
}

async function speakWithElevenLabs(text, voiceId, apiKey, config) {
  const url = `https://api.elevenlabs.io/v1/text-to-speech/${encodeURIComponent(voiceId)}`;
  const request = new Request(url);
  request.method = "POST";
  request.timeoutInterval = ELEVENLABS_TIMEOUT;
  request.headers = {
    "xi-api-key": apiKey,
    "Content-Type": "application/json",
    Accept: "audio/mpeg"
  };
  request.body = JSON.stringify({
    text,
    model_id: config.speech.elevenlabs.modelId
  });

  const audioData = await request.load();
  if (!audioData || audioData.byteLength === 0) {
    throw new Error("Received empty audio data from ElevenLabs.");
  }

  const fm = FileManager.local();
  const audioPath = fm.joinPath(
    fm.temporaryDirectory(),
    `smart_translate_${Date.now()}.mp3`
  );
  fm.write(audioPath, audioData);

  // Prefer Sound.play when available; fall back to QuickLook (documented).
  if (typeof Sound !== "undefined" && typeof Sound.play === "function") {
    await Sound.play(audioPath);
  } else {
    await QuickLook.present(audioPath);
  }

  if (fm.fileExists(audioPath)) {
    fm.remove(audioPath);
  }
}

async function fetchElevenLabsVoices(apiKey) {
  const request = new Request("https://api.elevenlabs.io/v1/voices");
  request.method = "GET";
  request.timeoutInterval = ELEVENLABS_TIMEOUT;
  request.headers = { "xi-api-key": apiKey };
  const response = await request.loadJSON();
  if (!response?.voices) {
    throw new Error("ElevenLabs returned an invalid voice list.");
  }
  return response.voices;
}

// ============================================================
// ONE-SHOT TRANSLATE
// ============================================================

async function runOneShot(text, config) {
  const trimmed = (text || "").trim();
  if (!trimmed) {
    await showError("Please enter some text to translate.");
    return null;
  }
  if (trimmed.length > MAX_INPUT_LENGTH) {
    await showError(
      `Input is too long.\n\nMaximum: ${MAX_INPUT_LENGTH.toLocaleString()} characters.`
    );
    return null;
  }

  try {
    const deeplKey = getRequiredKey(DEEPL_KEYCHAIN_KEY, "DeepL");
    const result = await translateWithDeepL(
      trimmed,
      deeplKey,
      config.languages
    );
    Script.setShortcutOutput(result.translation);
    await speakTranslation(result.translation, result.targetLanguage, config);
    return result;
  } catch (error) {
    await showError(
      `Translation failed.\n\n${error?.message || "Unknown error."}`
    );
    return null;
  }
}

async function dictateText(config) {
  // Official Scriptable API is Dictation.start(locale), not Speech.dictate.
  // Locale should be a language id like "en" or "es" (not DeepL codes like EN-US).
  if (config.input.dictationLanguage === "auto") {
    return await Dictation.start();
  }
  const locale = normalizeLanguage(config.input.dictationLanguage).toLowerCase();
  return await Dictation.start(locale);
}

// ============================================================
// UI HELPERS
// ============================================================

async function showError(message) {
  const alert = new Alert();
  alert.title = "SmartTranslate Error";
  alert.message = message;
  alert.addAction("OK");
  await alert.presentAlert();
}

async function showSuccess(title, message) {
  const alert = new Alert();
  alert.title = title;
  alert.message = message;
  alert.addAction("OK");
  await alert.presentAlert();
}

async function promptForText(title, message, defaultText = "") {
  const alert = new Alert();
  alert.title = title;
  alert.message = message;
  alert.addTextField("Enter text...", defaultText);
  alert.addAction("Continue");
  alert.addCancelAction("Cancel");
  const choice = await alert.presentAlert();
  return choice === -1 ? null : alert.textFieldValue(0).trim();
}

async function confirm(title, message) {
  const alert = new Alert();
  alert.title = title;
  alert.message = message;
  alert.addAction("Yes");
  alert.addAction("No");
  return (await alert.presentAlert()) === 0;
}

async function chooseFromList(title, items, message = null) {
  const alert = new Alert();
  alert.title = title;
  if (message) {
    alert.message = message;
  }
  for (const item of items) {
    alert.addAction(item);
  }
  alert.addCancelAction("Cancel");
  return await alert.presentSheet();
}

async function chooseBoolean(title, message, currentValue) {
  const alert = new Alert();
  alert.title = title;
  alert.message = message;
  alert.addAction(currentValue ? "Yes (Keep Enabled)" : "Yes (Enable)");
  alert.addAction(currentValue ? "No (Disable)" : "No (Keep Disabled)");
  alert.addCancelAction("Cancel");
  const choice = await alert.presentAlert();
  if (choice === -1) {
    return currentValue;
  }
  return choice === 0;
}

async function chooseSlider(title, currentValue, min, max) {
  const alert = new Alert();
  alert.title = title;
  alert.message = `Current value: ${currentValue.toFixed(2)}. Enter a new value between ${min} and ${max}.`;
  alert.addTextField("New value", String(currentValue));
  alert.addAction("Set");
  alert.addCancelAction("Cancel");
  const choice = await alert.presentAlert();
  if (choice === -1) {
    return currentValue;
  }

  const newValue = parseFloat(alert.textFieldValue(0));
  if (isNaN(newValue) || newValue < min || newValue > max) {
    await showError(
      `Invalid value. Please enter a number between ${min} and ${max}.`
    );
    return currentValue;
  }
  return newValue;
}

async function chooseLanguage(title, message, currentCode, excludedCodes = []) {
  const available = LANGUAGE_OPTIONS.filter(
    (lang) => !excludedCodes.includes(lang.code)
  );
  const labels = available.map((lang) => lang.name);
  const choice = await chooseFromList(title, labels, message);
  return choice === -1 ? null : available[choice].code;
}

// ============================================================
// UTILITIES
// ============================================================

function deepMerge(defaults, overrides) {
  const result = JSON.parse(JSON.stringify(defaults));
  for (const key in overrides) {
    if (!Object.prototype.hasOwnProperty.call(overrides, key)) {
      continue;
    }
    if (
      overrides[key] &&
      typeof overrides[key] === "object" &&
      !Array.isArray(overrides[key]) &&
      result[key] &&
      typeof result[key] === "object"
    ) {
      result[key] = deepMerge(result[key], overrides[key]);
    } else {
      result[key] = overrides[key];
    }
  }
  return result;
}

function normalizeLanguage(language) {
  return String(language || "")
    .toUpperCase()
    .split("-")[0];
}

function getLanguageDisplayName(code, includeCode = false) {
  const language = LANGUAGE_OPTIONS.find((item) => item.code === code);
  if (!language) {
    return code;
  }
  return includeCode ? `${language.name} (${language.code})` : language.name;
}

function unique(values) {
  return [...new Set(values.filter((v) => v))];
}

function generateUUID() {
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, function (c) {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

function formatDate(value) {
  return new Date(value).toLocaleString();
}

function formatDuration(seconds) {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const remainingSeconds = seconds % 60;
  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }
  if (minutes > 0) {
    return `${minutes}m ${remainingSeconds}s`;
  }
  return `${remainingSeconds}s`;
}

module.exports = {
  APP_DIRECTORY,
  CONFIG_FILE,
  PEOPLE_FILE,
  ACTIVE_SESSION_FILE,
  CONVERSATIONS_DIRECTORY,
  DEEPL_KEYCHAIN_KEY,
  ELEVENLABS_KEYCHAIN_KEY,
  MAX_INPUT_LENGTH,
  MAX_VOICE_RESULTS,
  DEFAULT_CONFIG,
  LANGUAGE_OPTIONS,
  getFileManager,
  getAppDirectory,
  getConversationsDirectory,
  loadJSON,
  saveJSON,
  deleteFile,
  listConversationFiles,
  loadConfig,
  saveConfig,
  getRequiredKey,
  configureSecret,
  translateWithDeepL,
  speakTranslation,
  fetchElevenLabsVoices,
  runOneShot,
  dictateText,
  showError,
  showSuccess,
  promptForText,
  confirm,
  chooseFromList,
  chooseBoolean,
  chooseSlider,
  chooseLanguage,
  deepMerge,
  normalizeLanguage,
  getLanguageDisplayName,
  unique,
  generateUUID,
  formatDate,
  formatDuration
};

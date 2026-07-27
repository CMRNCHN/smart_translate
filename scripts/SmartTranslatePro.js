// SmartTranslatePro.js
//
// SmartTranslate Pro — full feature entry for Scriptable.
//
// Includes everything in v1 plus:
//   Library (search, favorites, tags, export)
//   People directory + memory
//   Statistics · Timeline · Learning Mode · Voice Profiles
//   Post-conversation intelligence (summary, tags, memory, export)
//
// Requires (same Scriptable folder):
//   SmartTranslateShared.js
//   SmartTranslateConversation.js
//   SmartTranslateProKit.js
//
// Storage: same iCloud SmartTranslate/ tree as v1, plus:
//   SmartTranslate/exports/
//
// Keychain:
//   SMART_TRANSLATE_DEEPL_API_KEY
//   SMART_TRANSLATE_ELEVENLABS_API_KEY
//   SMART_TRANSLATE_OPENAI_API_KEY   (optional, richer summaries)
//
// Version: 1.0.0-pro

const Shared = importModule("SmartTranslateShared");
const Conversation = importModule("SmartTranslateConversation");
const Pro = importModule("SmartTranslateProKit");

await main();
Script.complete();

async function main() {
  let config = await Shared.loadConfig();

  if (!config || !config.version) {
    const isFirstRun = !config;
    config = await runSetupWizard(isFirstRun, null);
    if (!config) {
      return;
    }
    await Shared.saveConfig(config);
    if (isFirstRun) {
      await Shared.showSuccess(
        "Setup Complete",
        "SmartTranslate Pro is ready. Run again to open the full menu."
      );
      return;
    }
  }

  const action = await showMainMenu(config);

  switch (action) {
    case "type":
      await runType(config);
      break;
    case "paste":
      await runPaste(config);
      break;
    case "dictate":
      await runDictate(config);
      break;
    case "conversation":
      await Conversation.runConversation(config, {
        onCompleted: Pro.processCompletedSession
      });
      break;
    case "library":
      await Pro.runLibrary(config);
      break;
    case "people":
      await Pro.runPeopleDirectory(config);
      break;
    case "timeline":
      await Pro.runTimeline();
      break;
    case "stats":
      await Pro.runStatistics();
      break;
    case "learning":
      await Pro.runLearningMode();
      break;
    case "voices":
      await Pro.runVoiceProfiles(config);
      break;
    case "settings": {
      const newConfig = await runSetupWizard(false, config);
      if (newConfig) {
        await Shared.saveConfig(newConfig);
      }
      break;
    }
    default:
      break;
  }
}

// ============================================================
// MAIN MENU
// ============================================================

async function showMainMenu(config) {
  const alert = new Alert();
  alert.title = "SmartTranslate Pro";
  const engine = config.speech.engine === "apple" ? "Apple" : "ElevenLabs";
  alert.message = `Speech: ${engine}\n${Shared.getLanguageDisplayName(config.languages.primary)} ↔ ${Shared.getLanguageDisplayName(config.languages.conversation)}`;
  alert.addAction("Type");
  alert.addAction("Paste");
  alert.addAction("Dictate");
  alert.addAction("Conversation");
  alert.addAction("Library");
  alert.addAction("People");
  alert.addAction("Timeline");
  alert.addAction("Statistics");
  alert.addAction("Learning");
  alert.addAction("Voice Profiles");
  alert.addAction("Settings");
  alert.addCancelAction("Cancel");

  const choice = await alert.presentSheet();
  switch (choice) {
    case 0:
      return "type";
    case 1:
      return "paste";
    case 2:
      return "dictate";
    case 3:
      return "conversation";
    case 4:
      return "library";
    case 5:
      return "people";
    case 6:
      return "timeline";
    case 7:
      return "stats";
    case 8:
      return "learning";
    case 9:
      return "voices";
    case 10:
      return "settings";
    default:
      return "cancel";
  }
}

// ============================================================
// ONE-SHOT WORKFLOWS
// ============================================================

async function runType(config) {
  const text = await Shared.promptForText(
    "Type",
    "Enter the text to translate."
  );
  if (text === null) {
    return;
  }
  await Shared.runOneShot(text, config);
}

async function runPaste(config) {
  const text = Pasteboard.paste() || "";
  if (!text.trim()) {
    await Shared.showError("Clipboard is empty.");
    return;
  }
  await Shared.runOneShot(text, config);
}

async function runDictate(config) {
  try {
    const text = await Shared.dictateText(config);
    if (!text || !text.trim()) {
      await Shared.showError("No speech was captured.");
      return;
    }
    await Shared.runOneShot(text, config);
  } catch (error) {
    await Shared.showError(
      `Dictation failed.\n\n${error?.message || "Unknown error."}`
    );
  }
}

// ============================================================
// SETUP / SETTINGS
// ============================================================

async function runSetupWizard(isFirstRun, existingConfig) {
  let config = Shared.deepMerge(Shared.DEFAULT_CONFIG, existingConfig || {});

  if (isFirstRun) {
    const welcome = new Alert();
    welcome.title = "Welcome to SmartTranslate Pro";
    welcome.message =
      "Configure languages and API keys. Pro adds library, people, stats, learning, and export on top of v1.";
    welcome.addAction("Start Setup");
    await welcome.present();
  }

  const deeplKey = await Shared.configureSecret(
    "DeepL API Key",
    Shared.DEEPL_KEYCHAIN_KEY,
    "Enter your DeepL API key (use a key ending in :fx for the free tier)."
  );
  if (!deeplKey) {
    return null;
  }

  await Shared.configureSecret(
    "OpenAI API Key (Optional)",
    Pro.OPENAI_KEYCHAIN_KEY,
    "Optional. Enables richer conversation summaries. Leave empty / Keep Existing to skip."
  );

  config.languages.primary = await Shared.chooseLanguage(
    "Your Primary Language",
    "What is your primary language?",
    config.languages.primary
  );
  if (!config.languages.primary) {
    return null;
  }

  config.languages.conversation = await Shared.chooseLanguage(
    "Conversation Language",
    "What language are you translating with?",
    config.languages.conversation,
    [config.languages.primary]
  );
  if (!config.languages.conversation) {
    return null;
  }

  config.languages.defaultTarget = await Shared.chooseLanguage(
    "Default Translation Target",
    "When the input is not already this language, translate to:",
    config.languages.defaultTarget
  );
  if (!config.languages.defaultTarget) {
    return null;
  }

  const dictationOptions = [
    "Automatic",
    ...Shared.LANGUAGE_OPTIONS.map((lang) => `${lang.name} (${lang.code})`)
  ];
  const dictationChoice = await Shared.chooseFromList(
    "Dictation Language",
    dictationOptions,
    "Language hint for Dictate."
  );
  if (dictationChoice === -1) {
    return null;
  }
  config.input.dictationLanguage =
    dictationChoice === 0
      ? "auto"
      : Shared.LANGUAGE_OPTIONS[dictationChoice - 1].code;

  const engineChoice = await Shared.chooseFromList(
    "Speech Engine",
    ["Apple Native Voice", "ElevenLabs (requires API key)"],
    "Choose how translations are spoken."
  );
  if (engineChoice === -1) {
    return null;
  }
  config.speech.engine = engineChoice === 0 ? "apple" : "elevenlabs";

  if (config.speech.engine === "apple") {
    config.speech.apple.rate = await Shared.chooseSlider(
      "Apple Speech Rate",
      config.speech.apple.rate,
      0.1,
      1.0
    );
    config.speech.apple.pitch = await Shared.chooseSlider(
      "Apple Speech Pitch",
      config.speech.apple.pitch,
      0.5,
      2.0
    );
  } else {
    const elevenLabsKey = await Shared.configureSecret(
      "ElevenLabs API Key",
      Shared.ELEVENLABS_KEYCHAIN_KEY,
      "Enter your ElevenLabs API key."
    );
    config.speech.elevenlabs.enabled = !!elevenLabsKey;

    if (config.speech.elevenlabs.enabled) {
      const voiceResult = await configureElevenLabsVoices(
        config,
        elevenLabsKey
      );
      if (!voiceResult) {
        return null;
      }
      config.speech.elevenlabs.voices = voiceResult;
    }
  }

  const shouldTest = await Shared.chooseBoolean(
    "Test Configuration",
    "Test translation and speech now?",
    true
  );
  if (shouldTest) {
    await testConfiguration(config);
  }

  return config;
}

async function configureElevenLabsVoices(config, elevenLabsKey) {
  const languages = Shared.unique([
    config.languages.primary,
    config.languages.conversation,
    config.languages.defaultTarget
  ]);
  const newVoices = { ...config.speech.elevenlabs.voices };

  let allApiVoices;
  try {
    allApiVoices = await Shared.fetchElevenLabsVoices(elevenLabsKey);
  } catch (error) {
    await Shared.showError(
      `Could not load ElevenLabs voices.\n\n${error?.message || "Unknown error."}`
    );
    return null;
  }

  for (const langCode of languages) {
    const langName = Shared.getLanguageDisplayName(langCode);
    const compatibleVoices = allApiVoices
      .filter((v) => {
        const supported =
          v.labels?.language?.toLowerCase() ===
          langCode.slice(0, 2).toLowerCase();
        const isMultilingual =
          v.category === "premade" &&
          v.name.toLowerCase().includes("multilingual");
        return supported || isMultilingual;
      })
      .slice(0, Shared.MAX_VOICE_RESULTS);

    if (compatibleVoices.length === 0) {
      await Shared.showError(
        `No compatible ElevenLabs voices were found for ${langName}. Apple speech can still be used as fallback.`
      );
      continue;
    }

    const labels = compatibleVoices.map((v) => v.name);
    const choice = await Shared.chooseFromList(`${langName} AI Voice`, labels);
    if (choice === -1) {
      continue;
    }

    const selected = compatibleVoices[choice];
    newVoices[langCode] = {
      voiceId: selected.voice_id,
      name: selected.name
    };
  }

  return newVoices;
}

async function testConfiguration(config) {
  const testText = await Shared.promptForText(
    "Configuration Test",
    "Enter a short sentence to test translation and speech.",
    "Hello, world!"
  );
  if (!testText) {
    return;
  }

  try {
    const deeplKey = Shared.getRequiredKey(
      Shared.DEEPL_KEYCHAIN_KEY,
      "DeepL"
    );
    const { translation, detectedLanguage, targetLanguage } =
      await Shared.translateWithDeepL(testText, deeplKey, config.languages);

    const summary = `Detected: ${detectedLanguage}\nTarget: ${targetLanguage}\n\n${translation}`;
    const alert = new Alert();
    alert.title = "Translation Test";
    alert.message = summary;
    alert.addAction("OK");
    alert.addAction("Speak");
    const choice = await alert.presentAlert();
    if (choice === 1) {
      await Shared.speakTranslation(translation, targetLanguage, config);
    }
  } catch (error) {
    await Shared.showError(
      `Configuration test failed.\n\n${error?.message || "Unknown error."}`
    );
  }
}

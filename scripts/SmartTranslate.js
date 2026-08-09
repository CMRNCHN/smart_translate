// SmartTranslate.js
//
// SmartTranslate v1 entry script for Scriptable.
//
// Menu:
//   Type         → type text, translate once, speak
//   Paste        → clipboard → translate once → speak
//   Dictate      → speech → translate once → speak
//   Conversation → multi-turn session (separate module)
//   Settings     → languages, API keys, speech engine
//
// Requires (same Scriptable folder):
//   SmartTranslateShared.js
//   SmartTranslateConversation.js
//
// Storage (iCloud documents):
//   SmartTranslate/config.json
//   SmartTranslate/people.json
//   SmartTranslate/active_session.json
//   SmartTranslate/conversations/session_<uuid>.json
//
// Keychain:
//   SMART_TRANSLATE_DEEPL_API_KEY
//   SMART_TRANSLATE_ELEVENLABS_API_KEY
//
// Version: 1.0.0
//
// IMPORTANT (Scriptable):
// Create THREE scripts with these EXACT names (no spaces, same capitalization):
//   SmartTranslateShared
//   SmartTranslateConversation
//   SmartTranslate
// Or paste the single-file bundle from scripts/dist/SmartTranslate.js instead.

let Shared;
let Conversation;
let UI;
let modulesLoaded = false;
try {
  Shared = importModule("SmartTranslateShared");
  Conversation = importModule("SmartTranslateConversation");
  UI = importModule("SmartTranslateUI");
  modulesLoaded = true;
} catch (error) {
  const alert = new Alert();
  alert.title = "Missing Scriptable Modules";
  alert.message =
    "Could not import SmartTranslateShared / SmartTranslateConversation.\n\n" +
    "Fix: In Scriptable, create separate scripts named EXACTLY:\n" +
    "• SmartTranslateShared\n" +
    "• SmartTranslateConversation\n" +
    "• SmartTranslateUI\n" +
    "• SmartTranslate\n\n" +
    "Paste each matching file from the repo scripts/ folder.\n\n" +
    "Easier option: paste scripts/dist/SmartTranslate.js as ONE script.";
  alert.addAction("OK");
  await alert.presentAlert();
}

if (modulesLoaded) {
  await main();
}
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
        "SmartTranslate is ready. Run the script again to translate."
      );
      return;
    }
  }

  while (true) {
    const action = await showMainMenu(config);
    if (!action || action === "cancel") {
      break;
    }

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
        await Conversation.runConversation(config);
        break;
      case "settings": {
        const updated = await runSettingsMenu(config);
        if (updated) {
          config = updated;
        }
        break;
      }
      default:
        break;
    }
  }
}

// ============================================================
// MAIN MENU
// ============================================================

async function showMainMenu(config) {
  const engine = config.speech.engine === "apple" ? "Apple Voice" : "ElevenLabs";
  const context = {
    primaryLang: Shared.getLanguageDisplayName(config.languages.primary),
    conversationLang: Shared.getLanguageDisplayName(config.languages.conversation),
    primaryFlag: UI.flagForCode(config.languages.primary),
    conversationFlag: UI.flagForCode(config.languages.conversation),
    engine
  };

  if (UI?.presentV1Home) {
    const action = await UI.presentV1Home(context);
    return action || "cancel";
  }

  const choice = await Shared.presentTableMenu({
    title: "SmartTranslate",
    subtitle: `${context.primaryLang} ↔ ${context.conversationLang} · ${engine}`,
    sections: [
      {
        header: "Translate",
        rows: [
          { id: "type", title: "Type", subtitle: "Enter text", symbol: "keyboard" },
          { id: "paste", title: "Paste", subtitle: "From clipboard", symbol: "doc.on.clipboard" },
          { id: "dictate", title: "Dictate", subtitle: "Speak to translate", symbol: "mic" }
        ]
      },
      {
        header: "More",
        rows: [
          { id: "conversation", title: "Conversation", subtitle: "Multi-turn sessions", symbol: "person.2" },
          { id: "settings", title: "Settings", subtitle: "Languages and keys", symbol: "gearshape" }
        ]
      }
    ]
  });

  return choice || "cancel";
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

async function runSettingsMenu(config) {
  while (true) {
    const deeplSaved = Shared.hasSecret(Shared.DEEPL_KEYCHAIN_KEY);
    const elevenSaved = Shared.hasSecret(Shared.ELEVENLABS_KEYCHAIN_KEY);
    const choice = await Shared.presentTableMenu({
      title: "Settings",
      subtitle: deeplSaved
        ? `DeepL saved ${Shared.maskSecret(Shared.getOptionalKey(Shared.DEEPL_KEYCHAIN_KEY))}`
        : "DeepL key missing",
      sections: [
        {
          rows: [
            {
              id: "preferences",
              title: "Languages & Speech",
              subtitle: "Targets, dictation, voice engine",
              symbol: "globe"
            },
            {
              id: "keys",
              title: "API Keys",
              subtitle: deeplSaved
                ? `DeepL ${Shared.maskSecret(Shared.getOptionalKey(Shared.DEEPL_KEYCHAIN_KEY))}${elevenSaved ? " · ElevenLabs saved" : ""}`
                : "Set up DeepL and ElevenLabs",
              symbol: "key"
            },
            {
              id: "test",
              title: "Test Translation",
              subtitle: "Verify DeepL + speech",
              symbol: "checkmark.seal"
            }
          ]
        }
      ]
    });

    if (!choice) {
      return config;
    }

    if (choice === "preferences") {
      const newConfig = await runSetupWizard(false, config, {
        promptForKeys: false
      });
      if (newConfig) {
        await Shared.saveConfig(newConfig);
        config = newConfig;
      }
    } else if (choice === "keys") {
      await Shared.runApiKeyWizard({ mode: "hub" });
    } else if (choice === "test") {
      await testConfiguration(config);
    }
  }
}

async function runSetupWizard(isFirstRun, existingConfig, options = {}) {
  const promptForKeys = options.promptForKeys !== false;
  let config = Shared.deepMerge(Shared.DEFAULT_CONFIG, existingConfig || {});

  if (isFirstRun) {
    const welcome = new Alert();
    welcome.title = "Welcome to SmartTranslate";
    welcome.message =
      "This wizard configures languages and API keys. Data is stored in iCloud under Scriptable/SmartTranslate.";
    welcome.addAction("Start Setup");
    await welcome.present();
  }

  if (promptForKeys) {
    const keysOk = await Shared.runApiKeyWizard({
      mode: "deepl",
      required: true,
      isFirstRun: !!isFirstRun
    });
    if (!keysOk) {
      return null;
    }
  }

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
    const elevenLabsKey = await Shared.runApiKeyWizard({
      mode: "elevenlabs",
      required: false
    });
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
    const choice = await Shared.chooseFromList(
      `${langName} AI Voice`,
      labels
    );
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

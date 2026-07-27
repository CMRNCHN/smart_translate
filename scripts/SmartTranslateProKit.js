// SmartTranslateProKit.js
//
// Pro intelligence + export layer for SmartTranslate.
// Works on the same iCloud SmartTranslate/ data as v1.
//
// Features:
//   Summaries · Keyword search · Tags · Favorites
//   People directory · Memory extraction · Statistics
//   Timeline · Export (Markdown / JSON / TXT / HTML)
//   Learning hints · Context tags · Voice profile review
//
// Optional Keychain:
//   SMART_TRANSLATE_OPENAI_API_KEY  (richer summaries; optional)
//
// Version: 1.0.0

const Shared = importModule("SmartTranslateShared");
const Conversation = importModule("SmartTranslateConversation");

const OPENAI_KEYCHAIN_KEY = "SMART_TRANSLATE_OPENAI_API_KEY";
const OPENAI_TIMEOUT = 45;
const EXPORTS_DIRECTORY = "exports";

const AUTO_TAG_RULES = [
  { tag: "Travel", words: ["hotel", "airport", "flight", "train", "passport", "visa", "taxi", "luggage", "tourist"] },
  { tag: "Restaurant", words: ["menu", "restaurant", "food", "eat", "drink", "coffee", "dinner", "lunch", "waiter", "bill"] },
  { tag: "Medical", words: ["doctor", "hospital", "pharmacy", "pain", "medicine", "sick", "appointment"] },
  { tag: "Work", words: ["meeting", "office", "project", "deadline", "client", "boss", "email"] },
  { tag: "Family", words: ["family", "mom", "dad", "wife", "husband", "kids", "son", "daughter", "brother", "sister"] },
  { tag: "Shopping", words: ["buy", "price", "store", "shop", "market", "sale", "cash", "card"] },
  { tag: "Emergency", words: ["help", "emergency", "police", "lost", "urgent", "danger"] }
];

const PURPOSE_OPTIONS = [
  "Travel",
  "Business",
  "Vacation",
  "Medical",
  "Emergency",
  "Restaurant",
  "Meeting",
  "Interview",
  "General"
];

module.exports = {
  OPENAI_KEYCHAIN_KEY,
  runLibrary,
  runPeopleDirectory,
  runStatistics,
  runTimeline,
  runLearningMode,
  runVoiceProfiles,
  processCompletedSession,
  ensureProFields
};

// ============================================================
// POST-SESSION PIPELINE
// ============================================================

async function processCompletedSession(session, filePath) {
  const path = filePath || Conversation.getConversationFilePath(session);
  let current = ensureProFields(session);

  current.intelligence.autoTags = detectAutoTags(current);
  current.intelligence.summary = await buildSummary(current);
  current.intelligence.learning = buildLearningHints(current);
  current.intelligence.processedAt = new Date().toISOString();

  const purposeChoice = await Shared.chooseFromList(
    "Conversation Purpose",
    PURPOSE_OPTIONS,
    "Optional context label for this conversation."
  );
  if (purposeChoice !== -1) {
    current.metadata.purpose = PURPOSE_OPTIONS[purposeChoice];
    if (!current.intelligence.autoTags.includes(current.metadata.purpose)) {
      current.intelligence.autoTags.push(current.metadata.purpose);
    }
  }

  await saveSession(current, path);

  await Shared.showSuccess(
    "Pro Summary",
    current.intelligence.summary.slice(0, 900)
  );

  const tags = await Shared.unique([
    ...(current.intelligence.autoTags || []),
    ...(current.intelligence.tags || [])
  ]);
  const tagEdit = await Shared.promptForText(
    "Tags",
    "Comma-separated tags (auto tags prefilled).",
    tags.join(", ")
  );
  if (tagEdit !== null) {
    current.intelligence.tags = tagEdit
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean);
  }

  const favorite = await Shared.confirm(
    "Favorite?",
    "Pin this conversation to favorites?"
  );
  current.intelligence.favorite = favorite;

  const memories = extractMemoryCandidates(current);
  if (memories.length > 0) {
    const saveMemory = await Shared.confirm(
      "Save Memory?",
      `Suggested notes for ${current.person.name}:\n\n${memories.join("\n")}\n\nSave to their profile?`
    );
    if (saveMemory) {
      await appendPersonMemory(current.person.id, memories);
    }
  }

  await touchPersonFromSession(current);
  await saveSession(current, path);

  const exportNow = await Shared.confirm(
    "Export?",
    "Export this conversation now?"
  );
  if (exportNow) {
    await exportSessionInteractive(current);
  }
}

function ensureProFields(session) {
  const copy = JSON.parse(JSON.stringify(session));
  if (!copy.intelligence) {
    copy.intelligence = {
      summary: "",
      tags: [],
      autoTags: [],
      favorite: false,
      learning: null,
      processedAt: null
    };
  }
  if (!copy.metadata) {
    copy.metadata = { title: "", context: "", notes: "" };
  }
  return copy;
}

async function saveSession(session, path) {
  const clean = JSON.parse(JSON.stringify(session));
  delete clean._filePath;
  await Shared.saveJSON(path, clean);
}

// ============================================================
// LIBRARY MENU
// ============================================================

async function runLibrary(config) {
  const choice = await Shared.chooseFromList("Library", [
    "Search",
    "Favorites",
    "Browse All",
    "By Tag",
    "Export Conversation"
  ]);
  if (choice === -1) {
    return;
  }

  switch (choice) {
    case 0:
      await runSearch();
      break;
    case 1:
      await browseFiltered(
        "Favorites",
        (s) => ensureProFields(s).intelligence.favorite
      );
      break;
    case 2:
      await browseFiltered("All Conversations", () => true);
      break;
    case 3:
      await browseByTag();
      break;
    case 4:
      await exportFromLibrary();
      break;
  }
}

async function runSearch() {
  const query = await Shared.promptForText(
    "Search",
    "Search people, titles, tags, and transcript text."
  );
  if (!query) {
    return;
  }
  const needle = query.toLowerCase();
  const sessions = await Conversation.loadAllSessions();
  const hits = [];

  for (const session of sessions) {
    const pro = ensureProFields(session);
    const haystack = [
      pro.person.name,
      pro.metadata.title,
      pro.metadata.context,
      pro.metadata.notes,
      pro.intelligence.summary,
      ...(pro.intelligence.tags || []),
      ...(pro.intelligence.autoTags || []),
      ...(pro.turns || []).flatMap((t) => [t.sourceText, t.translatedText])
    ]
      .join("\n")
      .toLowerCase();

    if (!haystack.includes(needle)) {
      continue;
    }

    const snippet = findSnippet(haystack, needle, session);
    hits.push({ session: pro, snippet });
  }

  if (hits.length === 0) {
    await Shared.showError(`No results for “${query}”.`);
    return;
  }

  const labels = hits.map(
    (h) =>
      `${h.session.person.name} — ${Shared.formatDate(h.session.session.startedAt)}\n…${h.snippet}…`
  );
  const choice = await Shared.chooseFromList(
    `${hits.length} result${hits.length === 1 ? "" : "s"}`,
    labels.map((l) => l.replace(/\n/g, " · "))
  );
  if (choice === -1) {
    return;
  }
  await openSessionActions(hits[choice].session);
}

function findSnippet(haystack, needle, session) {
  const turns = session.turns || [];
  for (const turn of turns) {
    const blob = `${turn.sourceText} ${turn.translatedText}`;
    if (blob.toLowerCase().includes(needle)) {
      const idx = blob.toLowerCase().indexOf(needle);
      const start = Math.max(0, idx - 24);
      return blob.slice(start, start + 72).replace(/\s+/g, " ").trim();
    }
  }
  return (session.metadata?.title || session.person.name).slice(0, 72);
}

async function browseFiltered(title, predicate) {
  const sessions = (await Conversation.loadAllSessions())
    .map(ensureProFields)
    .filter(predicate);
  if (sessions.length === 0) {
    await Shared.showError(`No conversations in ${title}.`);
    return;
  }
  const labels = sessions.map(sessionLabel);
  const choice = await Shared.chooseFromList(title, labels);
  if (choice === -1) {
    return;
  }
  await openSessionActions(sessions[choice]);
}

async function browseByTag() {
  const sessions = (await Conversation.loadAllSessions()).map(ensureProFields);
  const tagSet = new Set();
  for (const s of sessions) {
    for (const tag of [
      ...(s.intelligence.tags || []),
      ...(s.intelligence.autoTags || [])
    ]) {
      tagSet.add(tag);
    }
  }
  const tags = [...tagSet].sort();
  if (tags.length === 0) {
    await Shared.showError("No tags yet. End a conversation in Pro to auto-tag.");
    return;
  }
  const choice = await Shared.chooseFromList("Tags", tags);
  if (choice === -1) {
    return;
  }
  const tag = tags[choice];
  await browseFiltered(`Tag: ${tag}`, (s) => {
    const all = [
      ...(s.intelligence.tags || []),
      ...(s.intelligence.autoTags || [])
    ];
    return all.includes(tag);
  });
}

function sessionLabel(session) {
  const star = session.intelligence?.favorite ? "★ " : "";
  const tags = [
    ...(session.intelligence?.tags || []),
    ...(session.intelligence?.autoTags || [])
  ].slice(0, 3);
  const tagPart = tags.length ? ` · ${tags.join(", ")}` : "";
  return `${star}${session.person.name} — ${Shared.formatDate(session.session.startedAt)} — ${session.session.turnCount} turns${tagPart}`;
}

async function openSessionActions(session) {
  const pro = ensureProFields(session);
  const alert = new Alert();
  alert.title = pro.person.name;
  alert.message = [
    pro.metadata.title || "Untitled",
    pro.intelligence.summary
      ? `\n${pro.intelligence.summary.slice(0, 280)}`
      : "",
    `\nTurns: ${pro.session.turnCount}`,
    pro.intelligence.favorite ? "\n★ Favorite" : ""
  ].join("");
  alert.addAction("View Transcript");
  alert.addAction("View Summary");
  alert.addAction(pro.intelligence.favorite ? "Unfavorite" : "Favorite");
  alert.addAction("Edit Tags");
  alert.addAction("Export");
  alert.addAction("Reprocess Intelligence");
  alert.addCancelAction("Close");

  const choice = await alert.presentAlert();
  const path = Conversation.getConversationFilePath(pro);

  if (choice === 0) {
    await showTranscript(pro);
  } else if (choice === 1) {
    await Shared.showSuccess(
      "Summary",
      pro.intelligence.summary || "No summary yet."
    );
  } else if (choice === 2) {
    pro.intelligence.favorite = !pro.intelligence.favorite;
    await saveSession(pro, path);
  } else if (choice === 3) {
    const current = Shared.unique([
      ...(pro.intelligence.tags || []),
      ...(pro.intelligence.autoTags || [])
    ]).join(", ");
    const edited = await Shared.promptForText(
      "Edit Tags",
      "Comma-separated tags.",
      current
    );
    if (edited !== null) {
      pro.intelligence.tags = edited
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean);
      await saveSession(pro, path);
    }
  } else if (choice === 4) {
    await exportSessionInteractive(pro);
  } else if (choice === 5) {
    await processCompletedSession(pro, path);
  }
}

async function showTranscript(session) {
  const lines = [];
  lines.push(session.metadata?.title || "Untitled");
  lines.push(`Started: ${Shared.formatDate(session.session.startedAt)}`);
  lines.push("");
  for (const turn of session.turns || []) {
    const speaker =
      turn.speaker === "me" ? "ME" : session.person.name.toUpperCase();
    lines.push(`[${Shared.formatDate(turn.timestamp)}] ${speaker}`);
    lines.push(turn.sourceText);
    lines.push(`→ ${turn.translatedText}`);
    lines.push("");
  }
  const alert = new Alert();
  alert.title = session.person.name;
  alert.message = lines.join("\n");
  alert.addAction("Close");
  await alert.presentAlert();
}

// ============================================================
// SUMMARIES / TAGS / MEMORY / LEARNING
// ============================================================

function detectAutoTags(session) {
  const text = [
    session.metadata?.context || "",
    session.metadata?.title || "",
    ...(session.turns || []).flatMap((t) => [t.sourceText, t.translatedText])
  ]
    .join(" ")
    .toLowerCase();

  const tags = [];
  for (const rule of AUTO_TAG_RULES) {
    if (rule.words.some((w) => text.includes(w))) {
      tags.push(rule.tag);
    }
  }
  if (session.metadata?.context) {
    const context = session.metadata.context.trim();
    if (context && !tags.includes(context)) {
      tags.push(context);
    }
  }
  return Shared.unique(tags);
}

async function buildSummary(session) {
  const openai = optionalOpenAIKey();
  if (openai) {
    try {
      return await summarizeWithOpenAI(session, openai);
    } catch (error) {
      console.error(`OpenAI summary failed: ${error.message}`);
    }
  }
  return buildExtractiveSummary(session);
}

function buildExtractiveSummary(session) {
  const turns = session.turns || [];
  const lines = [];
  lines.push(
    `${session.person.name} · ${turns.length} turns · ${Shared.formatDuration(session.session.durationSeconds || 0)}`
  );
  if (session.metadata?.context) {
    lines.push(`Context: ${session.metadata.context}`);
  }
  const tags = detectAutoTags(session);
  if (tags.length) {
    lines.push(`Topics: ${tags.join(", ")}`);
  }

  const topics = topKeywords(turns, 8);
  if (topics.length) {
    lines.push(`Keywords: ${topics.join(", ")}`);
  }

  const sample = turns.slice(0, 3).map((t) => {
    const who = t.speaker === "me" ? "You" : session.person.name;
    return `• ${who}: ${t.translatedText || t.sourceText}`;
  });
  if (sample.length) {
    lines.push("Highlights:");
    lines.push(...sample);
  }

  const followUps = turns
    .filter((t) => /\?/.test(t.sourceText) || /\?/.test(t.translatedText))
    .slice(0, 3)
    .map((t) => `• ${t.translatedText || t.sourceText}`);
  if (followUps.length) {
    lines.push("Questions raised:");
    lines.push(...followUps);
  }

  return lines.join("\n");
}

function topKeywords(turns, limit) {
  const stop = new Set([
    "the", "a", "an", "and", "or", "to", "of", "in", "on", "for", "is", "are",
    "was", "were", "i", "you", "we", "they", "he", "she", "it", "my", "your",
    "de", "la", "el", "que", "en", "un", "una", "es", "y", "o", "por", "con",
    "this", "that", "with", "from", "at", "as", "be", "have", "has", "had",
    "me", "do", "did", "not", "but", "if", "so", "what", "where", "when", "how"
  ]);
  const counts = {};
  for (const turn of turns) {
    const words = `${turn.sourceText} ${turn.translatedText}`
      .toLowerCase()
      .replace(/[^\w\u00C0-\u024F\s]/g, " ")
      .split(/\s+/)
      .filter((w) => w.length > 3 && !stop.has(w));
    for (const word of words) {
      counts[word] = (counts[word] || 0) + 1;
    }
  }
  return Object.entries(counts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([word]) => word);
}

function extractMemoryCandidates(session) {
  const patterns = [
    { label: "Likes", re: /\b(i like|me gusta|j'aime|ich mag)\b(.{0,60})/gi },
    { label: "Dislikes", re: /\b(i (don't|do not) like|no me gusta|je n'aime)\b(.{0,60})/gi },
    { label: "Planning", re: /\b(next (week|month)|planning|voy a|je vais|ich werde)\b(.{0,60})/gi },
    { label: "Family", re: /\b(my (wife|husband|son|daughter|mom|dad|dog|cat)|mi (esposa|hijo|hija|perro))\b(.{0,60})/gi },
    { label: "Birthday", re: /\b(birthday|cumpleaños|anniversaire)\b(.{0,40})/gi }
  ];
  const blob = (session.turns || [])
    .map((t) => `${t.sourceText} / ${t.translatedText}`)
    .join("\n");
  const out = [];
  for (const pattern of patterns) {
    let match;
    const re = new RegExp(pattern.re.source, pattern.re.flags);
    while ((match = re.exec(blob)) !== null) {
      out.push(`${pattern.label}: ${match[0].replace(/\s+/g, " ").trim()}`);
      if (out.length >= 8) {
        return Shared.unique(out);
      }
    }
  }
  return Shared.unique(out);
}

function buildLearningHints(session) {
  const turns = session.turns || [];
  const vocab = topKeywords(turns, 12);
  const questions = turns.filter(
    (t) => /\?/.test(t.sourceText) || /\?/.test(t.translatedText)
  ).length;
  return {
    wordsEncountered: vocab.length,
    suggestedVocabulary: vocab,
    questionsAsked: questions,
    turnCount: turns.length
  };
}

function optionalOpenAIKey() {
  if (!Keychain.contains(OPENAI_KEYCHAIN_KEY)) {
    return null;
  }
  const key = Keychain.get(OPENAI_KEYCHAIN_KEY);
  return key && key.trim() ? key.trim() : null;
}

async function summarizeWithOpenAI(session, apiKey) {
  const transcript = (session.turns || [])
    .map((t) => {
      const who = t.speaker === "me" ? "Me" : session.person.name;
      return `${who} [${t.sourceLanguage}]: ${t.sourceText}\n→ [${t.targetLanguage}]: ${t.translatedText}`;
    })
    .join("\n\n")
    .slice(0, 12000);

  const request = new Request("https://api.openai.com/v1/chat/completions");
  request.method = "POST";
  request.timeoutInterval = OPENAI_TIMEOUT;
  request.headers = {
    Authorization: `Bearer ${apiKey}`,
    "Content-Type": "application/json"
  };
  request.body = JSON.stringify({
    model: "gpt-4o-mini",
    temperature: 0.3,
    messages: [
      {
        role: "system",
        content:
          "Summarize a bilingual conversation. Return plain text with: Topics, Key decisions, Follow-ups, Names/places/dates, Action items. Be concise."
      },
      {
        role: "user",
        content: `Person: ${session.person.name}\nContext: ${session.metadata?.context || "n/a"}\n\nTranscript:\n${transcript}`
      }
    ]
  });

  const response = await request.loadJSON();
  const text = response?.choices?.[0]?.message?.content;
  if (!text) {
    throw new Error("OpenAI returned an empty summary.");
  }
  return text.trim();
}

// ============================================================
// PEOPLE DIRECTORY
// ============================================================

async function runPeopleDirectory(config) {
  const people = await loadPeopleProfiles();
  const labels = people.map((p) => {
    const langs = (p.metadata?.languages || []).join("/");
    const count = p.stats?.conversationCount || 0;
    return `${p.name}${langs ? ` · ${langs}` : ""} · ${count} chats`;
  });
  labels.push("Refresh Stats From Conversations");

  const choice = await Shared.chooseFromList(
    "People",
    labels,
    "Profiles linked to conversations."
  );
  if (choice === -1) {
    return;
  }
  if (choice === people.length) {
    await refreshAllPeopleStats();
    await Shared.showSuccess("People", "Stats refreshed from conversations.");
    return;
  }
  await openPersonProfile(people[choice], config);
}

async function openPersonProfile(person, config) {
  const sessions = (await Conversation.loadAllSessions()).filter(
    (s) => s.person.id === person.id || s.person.name === person.name
  );
  const alert = new Alert();
  alert.title = person.name;
  alert.message = [
    `Conversations: ${person.stats?.conversationCount || sessions.length}`,
    person.stats?.lastSeen
      ? `Last seen: ${Shared.formatDate(person.stats.lastSeen)}`
      : "",
    person.metadata?.country ? `Country: ${person.metadata.country}` : "",
    person.metadata?.languages?.length
      ? `Languages: ${person.metadata.languages.join(", ")}`
      : "",
    person.metadata?.notes ? `\nNotes: ${person.metadata.notes}` : "",
    person.memory?.length
      ? `\nMemory:\n${person.memory.map((m) => `• ${m}`).join("\n")}`
      : ""
  ]
    .filter(Boolean)
    .join("\n");

  alert.addAction("Edit Profile");
  alert.addAction("View Conversations");
  alert.addAction("Clear Memory");
  alert.addCancelAction("Close");
  const choice = await alert.presentAlert();

  if (choice === 0) {
    await editPersonProfile(person, config);
  } else if (choice === 1) {
    if (sessions.length === 0) {
      await Shared.showError("No conversations for this person.");
      return;
    }
    const labels = sessions.map(sessionLabel);
    const pick = await Shared.chooseFromList(
      `${person.name}'s Conversations`,
      labels
    );
    if (pick !== -1) {
      await openSessionActions(ensureProFields(sessions[pick]));
    }
  } else if (choice === 2) {
    const ok = await Shared.confirm(
      "Clear Memory?",
      `Remove saved memory for ${person.name}?`
    );
    if (ok) {
      person.memory = [];
      await upsertPerson(person);
    }
  }
}

async function editPersonProfile(person, config) {
  const country = await Shared.promptForText(
    "Country",
    "Optional country.",
    person.metadata?.country || ""
  );
  if (country === null) {
    return;
  }
  const notes = await Shared.promptForText(
    "Notes",
    "Profile notes.",
    person.metadata?.notes || ""
  );
  if (notes === null) {
    return;
  }
  const languages = await Shared.promptForText(
    "Languages",
    "Comma-separated language codes (e.g. ES, EN).",
    (person.metadata?.languages || [
      config.languages.conversation,
      config.languages.primary
    ]).join(", ")
  );
  if (languages === null) {
    return;
  }

  person.metadata = person.metadata || {};
  person.metadata.country = country.trim();
  person.metadata.notes = notes.trim();
  person.metadata.languages = languages
    .split(",")
    .map((l) => l.trim())
    .filter(Boolean);
  await upsertPerson(person);
  await Shared.showSuccess("Saved", `${person.name} profile updated.`);
}

async function loadPeopleProfiles() {
  const data = await Shared.loadJSON(Shared.PEOPLE_FILE);
  const people = Array.isArray(data) ? data : [];
  return people.map((p) => ({
    ...p,
    metadata: p.metadata || { languages: [], country: "", notes: "" },
    memory: p.memory || [],
    stats: p.stats || { conversationCount: 0, lastSeen: null }
  }));
}

async function upsertPerson(person) {
  const people = await loadPeopleProfiles();
  const idx = people.findIndex((p) => p.id === person.id);
  if (idx === -1) {
    people.push(person);
  } else {
    people[idx] = person;
  }
  await Shared.saveJSON(Shared.PEOPLE_FILE, people);
}

async function appendPersonMemory(personId, memories) {
  const people = await loadPeopleProfiles();
  const person = people.find((p) => p.id === personId);
  if (!person) {
    return;
  }
  person.memory = Shared.unique([...(person.memory || []), ...memories]);
  await Shared.saveJSON(Shared.PEOPLE_FILE, people);
}

async function touchPersonFromSession(session) {
  const people = await loadPeopleProfiles();
  let person = people.find((p) => p.id === session.person.id);
  if (!person) {
    person = {
      id: session.person.id,
      name: session.person.name,
      createdAt: new Date().toISOString(),
      metadata: { languages: [], country: "", notes: "" },
      memory: [],
      stats: { conversationCount: 0, lastSeen: null }
    };
    people.push(person);
  }

  const sessions = await Conversation.loadAllSessions();
  const theirs = sessions.filter(
    (s) => s.person.id === session.person.id || s.person.name === session.person.name
  );

  person.stats = person.stats || {};
  person.stats.lastSeen =
    session.session.endedAt || session.session.lastActivityAt;
  person.stats.conversationCount = Math.max(theirs.length, 1);
  const langs = Shared.unique([
    ...(person.metadata?.languages || []),
    session.languages?.primary,
    session.languages?.conversation
  ]);
  person.metadata = person.metadata || {};
  person.metadata.languages = langs;
  await Shared.saveJSON(Shared.PEOPLE_FILE, people);
}

async function refreshAllPeopleStats() {
  const people = await loadPeopleProfiles();
  const sessions = await Conversation.loadAllSessions();
  for (const person of people) {
    const theirs = sessions.filter(
      (s) => s.person.id === person.id || s.person.name === person.name
    );
    person.stats = {
      conversationCount: theirs.length,
      lastSeen: theirs[0]?.session?.endedAt || theirs[0]?.session?.startedAt || null
    };
  }
  await Shared.saveJSON(Shared.PEOPLE_FILE, people);
}

// ============================================================
// STATISTICS
// ============================================================

async function runStatistics() {
  const sessions = (await Conversation.loadAllSessions()).map(ensureProFields);
  const people = await loadPeopleProfiles();
  if (sessions.length === 0) {
    await Shared.showError("No conversations yet.");
    return;
  }

  let totalTurns = 0;
  let totalDuration = 0;
  let totalWords = 0;
  const langCounts = {};
  let longest = sessions[0];

  for (const s of sessions) {
    totalTurns += s.session.turnCount || 0;
    totalDuration += s.session.durationSeconds || 0;
    if ((s.session.durationSeconds || 0) > (longest.session.durationSeconds || 0)) {
      longest = s;
    }
    for (const turn of s.turns || []) {
      totalWords += `${turn.sourceText} ${turn.translatedText}`
        .split(/\s+/)
        .filter(Boolean).length;
      const lang = Shared.normalizeLanguage(turn.sourceLanguage);
      langCounts[lang] = (langCounts[lang] || 0) + 1;
    }
  }

  const topLang = Object.entries(langCounts).sort((a, b) => b[1] - a[1])[0];
  const avgMinutes = sessions.length
    ? Math.round(totalDuration / sessions.length / 60)
    : 0;

  const message = [
    `Conversations: ${sessions.length}`,
    `People: ${people.length}`,
    `Total turns: ${totalTurns}`,
    `Words translated: ${totalWords.toLocaleString()}`,
    `Average length: ${avgMinutes} min`,
    `Most spoken source: ${topLang ? topLang[0] : "n/a"}`,
    `Longest: ${longest.person.name} (${Shared.formatDuration(longest.session.durationSeconds || 0)})`,
    `Favorites: ${sessions.filter((s) => s.intelligence.favorite).length}`
  ].join("\n");

  await Shared.showSuccess("Statistics", message);
}

// ============================================================
// TIMELINE
// ============================================================

async function runTimeline() {
  const buckets = [
    { id: "today", label: "Today" },
    { id: "yesterday", label: "Yesterday" },
    { id: "week", label: "Last 7 Days" },
    { id: "month", label: "This Month" },
    { id: "older", label: "Older" }
  ];
  const choice = await Shared.chooseFromList(
    "Timeline",
    buckets.map((b) => b.label)
  );
  if (choice === -1) {
    return;
  }
  const bucket = buckets[choice].id;
  await browseFiltered(buckets[choice].label, (s) =>
    inTimelineBucket(s.session.startedAt, bucket)
  );
}

function inTimelineBucket(iso, bucket) {
  const date = new Date(iso);
  const now = new Date();
  const startOfToday = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate()
  );
  const startOfYesterday = new Date(startOfToday);
  startOfYesterday.setDate(startOfYesterday.getDate() - 1);
  const weekAgo = new Date(startOfToday);
  weekAgo.setDate(weekAgo.getDate() - 7);
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

  if (bucket === "today") {
    return date >= startOfToday;
  }
  if (bucket === "yesterday") {
    return date >= startOfYesterday && date < startOfToday;
  }
  if (bucket === "week") {
    return date >= weekAgo;
  }
  if (bucket === "month") {
    return date >= monthStart;
  }
  return date < monthStart;
}

// ============================================================
// LEARNING MODE
// ============================================================

async function runLearningMode() {
  const sessions = (await Conversation.loadAllSessions()).map(ensureProFields);
  if (sessions.length === 0) {
    await Shared.showError("No conversations to learn from.");
    return;
  }
  const labels = sessions.map(sessionLabel);
  const choice = await Shared.chooseFromList("Learning Mode", labels);
  if (choice === -1) {
    return;
  }
  const session = sessions[choice];
  const learning =
    session.intelligence.learning || buildLearningHints(session);
  const message = [
    `Turns: ${learning.turnCount}`,
    `Questions: ${learning.questionsAsked}`,
    `Vocabulary hits: ${learning.wordsEncountered}`,
    "",
    "Practice words:",
    ...(learning.suggestedVocabulary || []).map((w) => `• ${w}`)
  ].join("\n");
  await Shared.showSuccess("Learning", message);
}

// ============================================================
// VOICE PROFILES
// ============================================================

async function runVoiceProfiles(config) {
  const engine = config.speech.engine;
  const lines = [`Engine: ${engine}`];
  if (engine === "elevenlabs") {
    const voices = config.speech.elevenlabs.voices || {};
    const keys = Object.keys(voices);
    if (keys.length === 0) {
      lines.push("No ElevenLabs voices configured. Use Settings.");
    } else {
      for (const code of keys) {
        lines.push(
          `${Shared.getLanguageDisplayName(code)} → ${voices[code].name || voices[code].voiceId}`
        );
      }
    }
  } else {
    lines.push(
      `Apple rate: ${config.speech.apple.rate}`,
      `Apple pitch: ${config.speech.apple.pitch}`,
      "Configure ElevenLabs voices in Settings for per-language AI voices."
    );
  }
  lines.push(
    "",
    `Primary: ${Shared.getLanguageDisplayName(config.languages.primary)}`,
    `Conversation: ${Shared.getLanguageDisplayName(config.languages.conversation)}`
  );
  await Shared.showSuccess("Voice Profiles", lines.join("\n"));
}

// ============================================================
// EXPORT
// ============================================================

async function exportFromLibrary() {
  const sessions = (await Conversation.loadAllSessions()).map(ensureProFields);
  if (sessions.length === 0) {
    await Shared.showError("No conversations to export.");
    return;
  }
  const choice = await Shared.chooseFromList(
    "Export Conversation",
    sessions.map(sessionLabel)
  );
  if (choice === -1) {
    return;
  }
  await exportSessionInteractive(sessions[choice]);
}

async function exportSessionInteractive(session) {
  const formatChoice = await Shared.chooseFromList("Export Format", [
    "Markdown",
    "JSON",
    "TXT",
    "HTML"
  ]);
  if (formatChoice === -1) {
    return;
  }
  const formats = ["md", "json", "txt", "html"];
  const format = formats[formatChoice];
  const path = await exportSession(session, format);
  Pasteboard.copy(path);
  await Shared.showSuccess(
    "Exported",
    `Saved to:\n${path}\n\nPath copied to clipboard.`
  );
}

function getExportsDirectory() {
  const fm = Shared.getFileManager();
  const directory = fm.joinPath(Shared.getAppDirectory(), EXPORTS_DIRECTORY);
  if (!fm.fileExists(directory)) {
    fm.createDirectory(directory, true);
  }
  return directory;
}

async function exportSession(session, format) {
  const fm = Shared.getFileManager();
  const safeName = `${session.person.name}_${session.session.id}`
    .replace(/[^\w\-]+/g, "_")
    .slice(0, 80);
  const filename = `${safeName}.${format}`;
  const path = fm.joinPath(getExportsDirectory(), filename);

  let body = "";
  if (format === "json") {
    const clean = JSON.parse(JSON.stringify(session));
    delete clean._filePath;
    body = JSON.stringify(clean, null, 2);
  } else if (format === "md") {
    body = toMarkdown(session);
  } else if (format === "html") {
    body = toHtml(session);
  } else {
    body = toPlainText(session);
  }

  fm.writeString(path, body);
  return path;
}

function toPlainText(session) {
  const lines = [
    session.metadata?.title || "Untitled Conversation",
    `Person: ${session.person.name}`,
    `Started: ${session.session.startedAt}`,
    `Ended: ${session.session.endedAt || ""}`,
    `Turns: ${session.session.turnCount}`,
    ""
  ];
  if (session.intelligence?.summary) {
    lines.push("SUMMARY", session.intelligence.summary, "");
  }
  for (const turn of session.turns || []) {
    const speaker = turn.speaker === "me" ? "ME" : session.person.name;
    lines.push(`[${turn.timestamp}] ${speaker}`);
    lines.push(turn.sourceText);
    lines.push(`→ ${turn.translatedText}`);
    lines.push("");
  }
  return lines.join("\n");
}

function toMarkdown(session) {
  const lines = [
    `# ${session.metadata?.title || "Conversation"}`,
    "",
    `- **Person:** ${session.person.name}`,
    `- **Started:** ${session.session.startedAt}`,
    `- **Ended:** ${session.session.endedAt || ""}`,
    `- **Turns:** ${session.session.turnCount}`,
    ""
  ];
  if (session.intelligence?.summary) {
    lines.push("## Summary", "", session.intelligence.summary, "");
  }
  const tags = [
    ...(session.intelligence?.tags || []),
    ...(session.intelligence?.autoTags || [])
  ];
  if (tags.length) {
    lines.push(`**Tags:** ${tags.join(", ")}`, "");
  }
  lines.push("## Transcript", "");
  for (const turn of session.turns || []) {
    const speaker = turn.speaker === "me" ? "Me" : session.person.name;
    lines.push(`### ${speaker} · ${turn.timestamp}`);
    lines.push("");
    lines.push(turn.sourceText);
    lines.push("");
    lines.push(`> ${turn.translatedText}`);
    lines.push("");
  }
  return lines.join("\n");
}

function toHtml(session) {
  const esc = (s) =>
    String(s || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");
  const turns = (session.turns || [])
    .map((turn) => {
      const speaker = turn.speaker === "me" ? "Me" : session.person.name;
      return `<article><h3>${esc(speaker)} <small>${esc(turn.timestamp)}</small></h3><p>${esc(turn.sourceText)}</p><blockquote>${esc(turn.translatedText)}</blockquote></article>`;
    })
    .join("\n");
  return `<!DOCTYPE html><html><head><meta charset="utf-8"><title>${esc(session.metadata?.title || "Conversation")}</title>
<style>body{font-family:-apple-system,BlinkMacSystemFont,sans-serif;max-width:720px;margin:2rem auto;padding:0 1rem;line-height:1.45} blockquote{border-left:3px solid #888;margin-left:0;padding-left:1rem;color:#333}</style>
</head><body>
<h1>${esc(session.metadata?.title || "Conversation")}</h1>
<p><strong>${esc(session.person.name)}</strong> · ${esc(session.session.startedAt)}</p>
${session.intelligence?.summary ? `<section><h2>Summary</h2><pre>${esc(session.intelligence.summary)}</pre></section>` : ""}
<section><h2>Transcript</h2>${turns}</section>
</body></html>`;
}

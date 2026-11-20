import {
  clearFlow, getFlow, getUser, saveUser, setFlow
} from "./storage.js";
import {
  answerCallback, deleteMessage, sendMessage, sendPhoto
} from "./telegram.js";
import {
  escapeHtml, inline, keyLabel, MAIN_KEYBOARD, CANCEL_KEYBOARD, mainMenuText, shortText
} from "./ui.js";
import { languageFromTelegram, localizeMarkup, normalizeInput, translateText } from "./i18n.js";
import {
  askGemini, formatTitleDetails, getSeason,
  getTitle, posterUrl, safeNewsText, searchNews, searchTitles, titleName,
  validateGeminiKey, getSourceMetadata, formatSourceMetadata, searchTrendingNews
} from "./providers.js";

const MAX_CALLBACK_RESULTS = 6;

function isPrivateChat(message) {
  return message?.chat?.type === "private";
}

async function reply(env, chatId, text, markup = MAIN_KEYBOARD, options = {}) {
  let language = "en";
  try {
    const user = await getUser(env, chatId);
    language = user.language === "fa" ? "fa" : "en";
  } catch { /* Keep error replies available even when user storage is unavailable. */ }
  return sendMessage(env, chatId, translateText(text, language), localizeMarkup(markup, language), options);
}

async function showMenu(env, chatId) {
  return reply(env, chatId, mainMenuText(), MAIN_KEYBOARD);
}

async function handleStart(env, chatId, userId) {
  await clearFlow(env, userId);
  await showMenu(env, chatId);
}

async function showLanguageSettings(env, chatId) {
  await reply(env, chatId, "Select language / زبان را انتخاب کنید:", inline([
    [{ text: "🇮🇷 فارسی", callback_data: "lang:fa" }, { text: "🇬🇧 English", callback_data: "lang:en" }],
    [{ text: "⬅️ Main menu", callback_data: "menu" }]
  ]));
}

async function showHelp(env, chatId) {
  const text = [
    "<b>CineScope help</b>",
    "Send a title directly to search movies and series.",
    "",
    "<b>Buttons</b>",
    "🔎 Search movie / 📺 Search series — find a title",
    "📰 Cinema news — recent news for a title",
    "🔥 Trending — current entertainment headlines",
    "📚 Watchlist — saved titles",
    "🤖 Ask AI — ask a film or TV question with your API key",
    "🔑 My API keys — add and manage your own provider keys",
    "🗂 Site metadata — read public metadata from an allowed title page URL",
    "",
    "<b>Privacy</b>",
    "Your AI API keys are encrypted before storage. OMDb uses a separate bot-owner secret. When you submit a key, CineScope attempts to delete that Telegram message immediately. Telegram bots are not end-to-end encrypted, so use a private chat and do not share keys in groups."
  ].join("\n");
  await reply(env, chatId, text, MAIN_KEYBOARD);
}

async function showKeys(env, chatId, userId) {
  const user = await getUser(env, userId);
  const max = Number(env.MAX_USER_KEYS || 5);
  const rows = [];
  for (const key of user.keys) {
    rows.push([{ text: keyLabel(key, user.activeKeyId), callback_data: `key:info:${key.id}` }]);
  }
  if (user.keys.length < max) rows.push([{ text: "➕ Add AI API key", callback_data: "key:add" }]);
  if (user.keys.length) {
    rows.push([{ text: "🧪 Test all keys", callback_data: "key:test" }]);
    rows.push([{ text: "🔄 Refresh key list", callback_data: "key:list" }]);
  }
  const text = [
    "<b>🔑 AI API keys</b>",
    `Stored keys: ${user.keys.length}/${max}`,
    user.keys.length ? "Select a key to activate, test, or remove it." : String(env.AI_API_MODE || "google").toLowerCase() === "responses" ? "No keys added yet. Add a key from the API gateway configured by the bot owner." : "No keys added yet. Add a key from Google AI Studio.",
    "",
    "Each key belongs to your own API account and uses its quota. A 429 quota response is reported rather than bypassed by switching keys automatically."
  ].join("\n");
  await reply(env, chatId, text, inline([...rows, [{ text: "⬅️ Main menu", callback_data: "menu" }]]));
}

async function beginAddKey(env, chatId, userId) {
  const user = await getUser(env, userId);
  const max = Number(env.MAX_USER_KEYS || 5);
  if (user.keys.length >= max) {
    await reply(env, chatId, `You have reached the ${max}-key limit. Remove a key before adding another.`, inline([[{ text: "Manage keys", callback_data: "key:list" }]]));
    return;
  }
  await setFlow(env, userId, { type: "gemini_key" }, 600);
  const text = [
    `<b>Add ${String(env.AI_API_MODE || "google").toLowerCase() === "responses" ? "AI gateway" : "Gemini"} API key</b>`,
    "Send the key in this private chat as your next message.",
    "",
    "CineScope will try to delete that message immediately, validate the key, and store it encrypted. The key will never be echoed in chat or written to logs.",
    "",
    "<b>Security note:</b> Telegram bot chats are not end-to-end encrypted. Only continue in a private chat. Revoke a potentially exposed key in the dashboard of the provider that issued it."
  ].join("\n");
  await reply(env, chatId, text, CANCEL_KEYBOARD);
}

async function handleIncomingKey(env, message, userId, chatId) {
  await deleteMessage(env, chatId, message.message_id);
  await clearFlow(env, userId);
  const candidate = String(message.text || "").trim();
  if (!candidate || candidate.length < 20 || candidate.length > 300) {
    await reply(env, chatId, "That does not look like a valid API key. The message was deleted where Telegram permissions allowed. Start again from My API keys.", MAIN_KEYBOARD);
    return;
  }
  const user = await getUser(env, userId);
  const max = Number(env.MAX_USER_KEYS || 5);
  if (user.keys.length >= max) {
    await reply(env, chatId, `Key limit reached (${max}). Remove a saved key first.`, inline([[{ text: "Manage keys", callback_data: "key:list" }]]));
    return;
  }
  if (user.keys.some((item) => item.fingerprint === candidate.slice(-8))) {
    await reply(env, chatId, "That key appears to have already been added.", inline([[{ text: "Manage keys", callback_data: "key:list" }]]));
    return;
  }
  await reply(env, chatId, String(env.AI_API_MODE || "google").toLowerCase() === "responses" ? "Checking the key with the configured API gateway…" : "Checking the key with Google…", MAIN_KEYBOARD);
  let validation;
  try {
    validation = await validateGeminiKey(candidate, env);
  } catch {
    validation = { ok: false, reason: "network_error" };
  }
  if (!validation.ok) {
    const messages = {
      invalid_key: "Google says this API key is invalid or revoked. Check that it was copied completely and is active in the provider dashboard.",
      project_denied: "Google authenticated the request but denied generation access for this project. Check the project's availability and eligibility in Google AI Studio / Cloud Console.",
      api_restricted: "This API key is restricted from using the Gemini API. Check the API restrictions attached to the key.",
      permission_denied: "Google returned a permission error for this generation request. Check the project's Gemini API access and model eligibility.",
      rate_limited: "The provider rate-limited this key. Try again after the quota window resets.",
      model_unavailable: "The configured Gemini model is unavailable or does not support generateContent. Check GEMINI_MODEL in Cloudflare Worker settings.",
      base_url_missing: "The bot owner has not configured AI_API_BASE_URL.",
      empty_response: "Gemini accepted the request but returned no text.",
    };
    const reason = messages[validation.reason] || `The provider validation failed${validation.status ? ` (HTTP ${validation.status})` : ""}.`;
    const detail = validation.message ? `\\nGoogle response: ${shortText(validation.message, 350)}` : "";
    await reply(env, chatId, `${reason}${detail} It has not been stored.`, inline([[{ text: "Try again", callback_data: "key:add" }, { text: "My keys", callback_data: "key:list" }]]));
    return;
  }
  const id = crypto.randomUUID().slice(0, 8);
  user.keys.push({
    id,
    secret: candidate,
    label: `AI key ••••${candidate.slice(-4)}`,
    fingerprint: candidate.slice(-8),
    status: "ready",
    addedAt: new Date().toISOString()
  });
  if (!user.activeKeyId) user.activeKeyId = id;
  await saveUser(env, userId, user);
  await reply(env, chatId, "✅ API key validated and saved in encrypted storage.", inline([[{ text: "Manage API keys", callback_data: "key:list" }, { text: "Main menu", callback_data: "menu" }]]));
}

async function keyInfo(env, chatId, userId, keyId) {
  const user = await getUser(env, userId);
  const key = user.keys.find((item) => item.id === keyId);
  if (!key) return showKeys(env, chatId, userId);
  const active = user.activeKeyId === keyId;
  const status = key.status === "rate_limited" ? "Rate limited" : key.status === "invalid" ? "Invalid / rejected" : "Ready";
  const rows = [];
  if (!active) rows.push([{ text: "✅ Set as active", callback_data: `key:on:${keyId}` }]);
  rows.push([{ text: "🧪 Test this key", callback_data: `key:check:${keyId}` }]);
  rows.push([{ text: "🗑 Remove key", callback_data: `key:del:${keyId}` }]);
  rows.push([{ text: "⬅️ Back to keys", callback_data: "key:list" }]);
  await reply(env, chatId, `<b>${escapeHtml(key.label)}</b>\nStatus: ${status}\nActive: ${active ? "Yes" : "No"}\nAdded: ${escapeHtml(key.addedAt?.slice(0, 10) || "Unknown")}`, inline(rows));
}

async function testOneKey(env, userId, keyId) {
  const user = await getUser(env, userId);
  const key = user.keys.find((item) => item.id === keyId);
  if (!key) return "Key not found.";
  const result = await validateGeminiKey(key.secret, env);
  key.status = result.ok ? "ready" : result.reason === "invalid" ? "invalid" : result.reason === "rate_limited" ? "rate_limited" : "unknown";
  await saveUser(env, userId, user);
  return result.ok ? `${key.label}: ✅ valid` : `${key.label}: ⚠️ ${key.status}`;
}

async function testAllKeys(env, chatId, userId) {
  const user = await getUser(env, userId);
  if (!user.keys.length) return showKeys(env, chatId, userId);
  await reply(env, chatId, String(env.AI_API_MODE || "google").toLowerCase() === "responses" ? "Testing saved keys with the configured API gateway…" : "Testing saved keys with Google…", MAIN_KEYBOARD);
  const results = [];
  for (const key of user.keys) {
    const result = await validateGeminiKey(key.secret, env);
    key.status = result.ok ? "ready" : result.reason === "invalid" ? "invalid" : result.reason === "rate_limited" ? "rate_limited" : "unknown";
    results.push(`${escapeHtml(key.label)} — ${result.ok ? "✅ valid" : `⚠️ ${key.status}`}`);
  }
  await saveUser(env, userId, user);
  await reply(env, chatId, `<b>Key test results</b>\n${results.join("\n")}`, inline([[{ text: "Manage keys", callback_data: "key:list" }]]));
}

async function runSearch(env, chatId, userId, query, kind = "all") {
  if (!env.OMDB_API_KEY) {
    await reply(env, chatId, "OMDb is not configured by the bot owner. I can provide an approximate AI-only lookup instead.", MAIN_KEYBOARD);
    return aiFallbackSearch(env, chatId, userId, query, kind);
  }
  await reply(env, chatId, `Searching OMDb for <b>${escapeHtml(query)}</b>…`, MAIN_KEYBOARD);
  const tasks = [];
  const failures = [];
  if (kind === "movie" || kind === "all") tasks.push(searchTitles(env, "movie", query).catch((error) => {
    failures.push(error.message);
    console.error("OMDb movie search failed", error.message);
    return [];
  }));
  if (kind === "tv" || kind === "all") tasks.push(searchTitles(env, "tv", query).catch((error) => {
    failures.push(error.message);
    console.error("OMDb series search failed", error.message);
    return [];
  }));
  const resultGroups = await Promise.all(tasks);
  const perKindLimit = kind === "all" ? 3 : MAX_CALLBACK_RESULTS;
  const results = resultGroups.flatMap((group) => group.slice(0, perKindLimit)).slice(0, MAX_CALLBACK_RESULTS);
  if (!results.length) {
    const reason = failures[0] ? `OMDb search failed: ${failures[0]}` : "No matching titles were found in OMDb. Try the original title or include the release year.";
    await reply(env, chatId, escapeHtml(reason), MAIN_KEYBOARD);
    return;
  }
  const user = await getUser(env, userId);
  user.lastSearch = results.map((item) => ({ id: item.imdbID, kind: item.cineKind, name: titleName(item, item.cineKind) }));
  await saveUser(env, userId, user);
  const buttons = results.map((item) => [{
    text: `${item.cineKind === "movie" ? "🎬" : "📺"} ${shortText(titleName(item, item.cineKind), 40)} (${String(item.Year || "????").slice(0, 4)})`,
    callback_data: `pick:${item.cineKind}:${item.imdbID}`
  }]);
  buttons.push([{ text: "⬅️ Main menu", callback_data: "menu" }]);
  await reply(env, chatId, `OMDb results for <b>${escapeHtml(query)}</b>`, inline(buttons));
}

async function aiFallbackSearch(env, chatId, userId, query, kind) {
  const user = await getUser(env, userId);
  const key = user.keys.find((item) => item.id === user.activeKeyId);
  if (!key) {
    await reply(env, chatId, "OMDb metadata is not configured by the bot owner. Add an AI API key for a cautious AI-only lookup, or ask the bot owner to configure OMDb.", inline([[{ text: "Add API key", callback_data: "key:add" }]]));
    return;
  }
  const typeHint = kind === "movie" ? "movie" : kind === "tv" ? "TV series" : "movie or TV series";
  try {
    const responseLanguage = user.language === "fa" ? "Persian" : "English";
    const answer = await askGemini(env, key.secret, `You are CineScope, an entertainment metadata assistant. Give a cautious, concise profile for the ${typeHint} titled: ${query}. Include likely title, original title, release year, type, genres, director/creator, cast, synopsis, and seasons/episode counts only when you are confident. Mark uncertain fields as unknown. Do not invent current release news, streaming availability, or episode details. Answer in ${responseLanguage} with clear headings.`);
    await reply(env, chatId, `<b>AI lookup · ${escapeHtml(query)}</b>\n${escapeHtml(shortText(answer, 3400))}\n\n<i>AI-generated; verify details against an authoritative catalog.</i>`, MAIN_KEYBOARD);
  } catch (error) {
    await handleGeminiError(env, chatId, userId, key, error);
  }
}

async function handleGeminiError(env, chatId, userId, key, error) {
  if (error.code === "RATE_LIMITED" || error.code === "INVALID_KEY") {
    const user = await getUser(env, userId);
    const saved = user.keys.find((item) => item.id === key.id);
    if (saved) saved.status = error.code === "RATE_LIMITED" ? "rate_limited" : "invalid";
    await saveUser(env, userId, user);
  }
  await reply(env, chatId, `AI request failed: ${escapeHtml(error.message)}\n\nYou can manage your keys from My API keys.`, inline([[{ text: "Manage API keys", callback_data: "key:list" }]]));
}

async function showTitle(env, chatId, userId, kind, id) {
  const item = await getTitle(env, kind, id);
  const user = await getUser(env, userId);
  const name = titleName(item, kind);
  user.lastTitle = { id: String(id), kind, name };
  await saveUser(env, userId, user);
  const rows = [
    [
      { text: "📰 News", callback_data: "news:last" },
      ...(item.imdbUrl ? [{ text: "IMDb page", url: item.imdbUrl }] : [])
    ],
    [
      { text: "💾 Save to watchlist", callback_data: `save:${kind}:${id}` },
      { text: "✨ Similar titles", callback_data: `similar:${kind}:${id}` }
    ],
    [{ text: "🗂 Check source metadata", callback_data: `source:lookup:${kind}:${id}` }]
  ];
  if (kind === "tv" && Array.isArray(item.seasons)) {
    const seasonButtons = item.seasons.slice(0, 8).map((season) => ({
      text: `Season ${season.season_number}`,
      callback_data: `season:${id}:${season.season_number}`
    }));
    for (let i = 0; i < seasonButtons.length; i += 2) rows.push(seasonButtons.slice(i, i + 2));
  }
  rows.push([{ text: "⬅️ Main menu", callback_data: "menu" }]);
  const poster = posterUrl(item.poster_path);
  if (poster) {
    try { await sendPhoto(env, chatId, poster, `🎬 ${escapeHtml(name)}`); }
    catch { /* Poster delivery is optional. */ }
  }
  await reply(env, chatId, formatTitleDetails(item, kind), inline(rows));
}

async function showSeason(env, chatId, imdbId, seasonNumber) {
  const season = await getSeason(env, imdbId, seasonNumber);
  const user = await getUser(env, chatId);
  const rawSeasonName = season.name || `Season ${seasonNumber}`;
  const seasonName = user.language === "fa" ? rawSeasonName.replace(/^Season (?=\d+$)/i, "فصل ") : rawSeasonName;
  const episodes = season.episodes || [];
  const visibleEpisodes = episodes.slice(0, 14);
  const lines = [
    `<b>📺 ${escapeHtml(seasonName)}</b>`,
    `Episodes: ${episodes.length}`,
    "",
    ...visibleEpisodes.map((episode) => `<b>${episode.episode_number}. ${escapeHtml(shortText(episode.name || "Untitled", 100))}</b> · ${escapeHtml(episode.air_date || "Date unknown")} · IMDb ${escapeHtml(episode.imdb_rating || "N/A")}`)
  ];
  if (episodes.length > visibleEpisodes.length) lines.push("", `Showing ${visibleEpisodes.length} of ${episodes.length} episodes.`);
  await reply(env, chatId, lines.join("\n"), inline([[{ text: "⬅️ Back to title", callback_data: `pick:tv:${imdbId}` }, { text: "Main menu", callback_data: "menu" }]]));
}

async function showNews(env, chatId, userId, title) {
  const language = (await getUser(env, userId)).language || "en";
  await reply(env, chatId, `Searching recent news for <b>${escapeHtml(title)}</b>…`, MAIN_KEYBOARD);
  let items;
  try { items = await searchNews(title, false, language); }
  catch {
    await reply(env, chatId, "The news feed is temporarily unavailable. Try again later.", MAIN_KEYBOARD);
    return;
  }
  if (!items.length) {
    await reply(env, chatId, "No recent articles were found for that title.", MAIN_KEYBOARD);
    return;
  }
  for (const item of items.slice(0, 5)) {
    await reply(env, chatId, safeNewsText(item, language), inline([[{ text: "Open article", url: item.link }]]));
  }
}

async function showSimilar(env, chatId, userId, kind, id) {
  const user = await getUser(env, userId);
  const key = user.keys.find((item) => item.id === user.activeKeyId);
  if (!key) {
    await reply(env, chatId, "Add your AI API key to generate similar-title recommendations. All returned suggestions will be checked against OMDb before they are shown.", inline([[{ text: "Add API key", callback_data: "key:add" }]]));
    return;
  }
  const item = await getTitle(env, kind, id);
  await reply(env, chatId, "Finding similar titles and verifying them in OMDb…", MAIN_KEYBOARD);
  try {
    const prompt = [
      "Recommend up to 6 real movies or TV series similar to the title below.",
      "Return valid JSON only: {\"titles\":[{\"title\":\"...\",\"type\":\"movie|series\"}]}",
      "Do not include the original title. Prefer well-known titles. Do not add explanations.",
      `Title: ${item.Title}`,
      `Type: ${item.Type}`,
      `Genres: ${item.Genre}`,
      `Plot: ${item.Plot}`
    ].join("\n");
    const answer = await askGemini(env, key.secret, prompt);
    const cleaned = answer.replace(/^\s*```(?:json)?\s*/i, "").replace(/\s*```\s*$/, "").trim();
    const jsonStart = cleaned.indexOf("{");
    const jsonEnd = cleaned.lastIndexOf("}");
    if (jsonStart < 0 || jsonEnd <= jsonStart) throw new Error("AI did not return a valid JSON recommendation list.");
    const parsed = JSON.parse(cleaned.slice(jsonStart, jsonEnd + 1));
    const candidates = Array.isArray(parsed.titles) ? parsed.titles.slice(0, 6) : [];
    const verified = [];
    for (const candidate of candidates) {
      const title = String(candidate.title || "").trim();
      if (!title) continue;
      const type = String(candidate.type || "movie").toLowerCase().includes("series") ? "tv" : "movie";
      const matches = await searchTitles(env, type, title).catch(() => []);
      const match = matches.find((entry) => entry.Title.toLowerCase() === title.toLowerCase()) || matches[0];
      if (match && match.imdbID !== item.imdbID && !verified.some((entry) => entry.imdbID === match.imdbID)) verified.push(match);
    }
    if (!verified.length) {
      await reply(env, chatId, "No similar titles could be verified in OMDb. Try again with another title.", MAIN_KEYBOARD);
      return;
    }
    const rows = verified.map((entry) => [{
      text: `${entry.cineKind === "movie" ? "🎬" : "📺"} ${shortText(entry.Title, 42)} (${String(entry.Year || "????").slice(0, 4)})`,
      callback_data: `pick:${entry.cineKind}:${entry.imdbID}`
    }]);
    rows.push([{ text: "⬅️ Back to title", callback_data: `pick:${kind}:${id}` }]);
    await reply(env, chatId, "<b>✨ Similar titles · AI suggestions verified by OMDb</b>", inline(rows));
  } catch (error) {
    await handleGeminiError(env, chatId, userId, key, error);
  }
}

async function beginSourceLookup(env, chatId, userId, expectedTitle = "") {
  await setFlow(env, userId, { type: "source_url", expectedTitle }, 600);
  await reply(env, chatId,
    "Send a public detail-page URL from dornatv.com, movieplus.top, or animex.pro. CineScope reads only visible page metadata (title, synopsis, year, genre, cast and rating); it does not extract player, download, or video URLs.",
    CANCEL_KEYBOARD
  );
  }

async function handleSourceUrl(env, chatId, userId, rawUrl, expectedTitle = "") {
  await clearFlow(env, userId);
  try {
    const metadata = await getSourceMetadata(rawUrl);
    await reply(env, chatId, formatSourceMetadata(metadata, expectedTitle), inline([
      [{ text: "Check another source page", callback_data: "source:menu" }],
      [{ text: "⬅️ Main menu", callback_data: "menu" }]
    ]));
  } catch (error) {
    await reply(env, chatId, `Could not read source metadata: ${escapeHtml(error.message)}`, inline([
      [{ text: "Try again", callback_data: "source:menu" }],
      [{ text: "Main menu", callback_data: "menu" }]
    ]));
  }
}

async function saveToWatchlist(env, chatId, userId, kind, id) {
  const item = await getTitle(env, kind, id);
  const user = await getUser(env, userId);
  const max = Number(env.MAX_WATCHLIST_ITEMS || 30);
  if (user.watchlist.some((entry) => String(entry.id) === String(id) && entry.kind === kind)) {
    await reply(env, chatId, "This title is already in your watchlist.", inline([[{ text: "Open watchlist", callback_data: "watchlist" }]]));
    return;
  }
  if (user.watchlist.length >= max) {
    await reply(env, chatId, `Your watchlist is full (${max} items). Remove an item first.`, MAIN_KEYBOARD);
    return;
  }
  user.watchlist.push({ id: String(id), kind, name: titleName(item, kind), addedAt: new Date().toISOString() });
  await saveUser(env, userId, user);
  await reply(env, chatId, `💾 <b>${escapeHtml(titleName(item, kind))}</b> added to your watchlist.`, inline([[{ text: "Open watchlist", callback_data: "watchlist" }]]));
}

async function showWatchlist(env, chatId, userId) {
  const user = await getUser(env, userId);
  if (!user.watchlist.length) {
    await reply(env, chatId, "Your watchlist is empty. Search for a title and tap Save to watchlist.", MAIN_KEYBOARD);
    return;
  }
  const rows = user.watchlist.slice(0, 30).map((item, index) => [{
    text: `${item.kind === "movie" ? "🎬" : "📺"} ${shortText(item.name, 42)}`,
    callback_data: `wl:open:${index}`
  }]);
  rows.push([{ text: "🧹 Clear watchlist", callback_data: "wl:clear" }, { text: "Main menu", callback_data: "menu" }]);
  await reply(env, chatId, `<b>📚 Your watchlist</b>\n${user.watchlist.length} saved titles`, inline(rows));
}

async function handleMessage(env, message) {
  if (!isPrivateChat(message)) {
    if (message.chat?.id) await sendMessage(env, message.chat.id, "Please use CineScope in a private chat. API-key management is disabled in groups.");
    return;
  }
  const chatId = message.chat.id;
  const userId = message.from.id;
  const profile = await getUser(env, userId);
  if (!profile.language) {
    profile.language = languageFromTelegram(message.from?.language_code);
    await saveUser(env, userId, profile);
  }
  const text = normalizeInput(String(message.text || "").trim());
  if (!text) return;
  if (text === "✖️ Cancel") {
    await clearFlow(env, userId);
    await showMenu(env, chatId);
    return;
  }
  if (text.startsWith("/start")) return handleStart(env, chatId, userId);
  if (text === "/language" || text === "/lang") { await clearFlow(env, userId); return showLanguageSettings(env, chatId); }
  if (text.startsWith("/help") || text === "❔ Help") return showHelp(env, chatId);

  const menuActions = new Set(["🔎 Search movie", "📺 Search series", "📰 Cinema news", "🔥 Trending", "📚 Watchlist", "🤖 Ask AI", "🔑 My API keys", "🗂 Site metadata"]);
  const flow = await getFlow(env, userId);
  if (menuActions.has(text)) await clearFlow(env, userId);
  if (!menuActions.has(text)) {
    if (flow?.type === "gemini_key") return handleIncomingKey(env, message, userId, chatId);
    if (flow?.type === "search_movie") {
      await clearFlow(env, userId);
      return runSearch(env, chatId, userId, text, "movie");
    }
    if (flow?.type === "search_tv") {
      await clearFlow(env, userId);
      return runSearch(env, chatId, userId, text, "tv");
    }
    if (flow?.type === "news") {
      await clearFlow(env, userId);
      return showNews(env, chatId, userId, text);
    }
    if (flow?.type === "source_url") return handleSourceUrl(env, chatId, userId, text, flow.expectedTitle || "");
    if (flow?.type === "ai") {
      await clearFlow(env, userId);
      const user = await getUser(env, userId);
      const key = user.keys.find((item) => item.id === user.activeKeyId);
      if (!key) {
        await reply(env, chatId, "Add an AI API key before using AI chat.", inline([[{ text: "Add API key", callback_data: "key:add" }]]));
        return;
      }
      try {
        const responseLanguage = user.language === "fa" ? "Persian" : "English";
        const answer = await askGemini(env, key.secret, `You are CineScope, a concise movie and television assistant. Answer the user's question accurately in ${responseLanguage}. Do not invent current release information or streaming availability; state uncertainty clearly. User question: ${text}`);
        await reply(env, chatId, `<b>🤖 CineScope AI</b>\n${escapeHtml(shortText(answer, 3400))}`, MAIN_KEYBOARD);
      } catch (error) {
        await handleGeminiError(env, chatId, userId, key, error);
      }
      return;
    }
  }

  if (text === "🔎 Search movie") {
    await setFlow(env, userId, { type: "search_movie" }, 600);
    await reply(env, chatId, "Send the movie title.", CANCEL_KEYBOARD);
  } else if (text === "📺 Search series") {
    await setFlow(env, userId, { type: "search_tv" }, 600);
    await reply(env, chatId, "Send the series title.", CANCEL_KEYBOARD);
  } else if (text === "📰 Cinema news") {
    await setFlow(env, userId, { type: "news" }, 600);
    await reply(env, chatId, "Send the movie or series title for recent news.", CANCEL_KEYBOARD);
  } else if (text === "🔥 Trending") {
    await showTrending(env, chatId);
  } else if (text === "📚 Watchlist") {
    await showWatchlist(env, chatId, userId);
  } else if (text === "🤖 Ask AI") {
    await setFlow(env, userId, { type: "ai" }, 600);
    await reply(env, chatId, "Send your movie or TV question.", CANCEL_KEYBOARD);
  } else if (text === "🔑 My API keys") {
    await showKeys(env, chatId, userId);
  } else if (text === "🗂 Site metadata") {
    await beginSourceLookup(env, chatId, userId);
  } else {
    await runSearch(env, chatId, userId, text, "all");
  }
}

async function showTrending(env, chatId) {
  const language = (await getUser(env, chatId)).language || "en";
  let results;
  try { results = await searchTrendingNews(language); }
  catch (error) {
    return reply(env, chatId, `Trending news is unavailable: ${escapeHtml(error.message)}`, MAIN_KEYBOARD);
  }
  if (!results.length) return reply(env, chatId, "No trending entertainment headlines are available right now.", MAIN_KEYBOARD);
  const rows = results.slice(0, 8).map((item) => [{
    text: shortText(item.title, 58),
    url: item.link
  }]);
  rows.push([{ text: "⬅️ Main menu", callback_data: "menu" }]);
  await reply(env, chatId, "<b>🔥 Trending entertainment headlines</b>\nOpen an article to read the publisher's report.", inline(rows));
}

async function handleCallback(env, callback) {
  const chatId = callback.message?.chat?.id;
  const userId = callback.from?.id;
  const messageId = callback.message?.message_id;
  if (!chatId || !userId) return;
  if (callback.message?.chat?.type !== "private") {
    await answerCallback(env, callback.id, "Use the bot in a private chat.", true);
    return;
  }
  const data = String(callback.data || "");
  await answerCallback(env, callback.id);
  const parts = data.split(":");
  const action = parts[0];

  try {
    if (data === "menu") { await clearFlow(env, userId); return showMenu(env, chatId); }
    if (data === "language") { await clearFlow(env, userId); return showLanguageSettings(env, chatId); }
    if (action === "lang" && (parts[1] === "fa" || parts[1] === "en")) {
      await clearFlow(env, userId);
      const user = await getUser(env, userId);
      user.language = parts[1];
      await saveUser(env, userId, user);
      await reply(env, chatId, parts[1] === "fa" ? "Language updated to Persian." : "Bot language changed to English.", MAIN_KEYBOARD);
      return showMenu(env, chatId);
    }
    if (data === "key:list") return showKeys(env, chatId, userId);
    if (data === "key:add") return beginAddKey(env, chatId, userId);
    if (data === "key:test") return testAllKeys(env, chatId, userId);
    if (action === "key" && parts[1] === "info") return keyInfo(env, chatId, userId, parts[2]);
    if (action === "key" && parts[1] === "on") {
      const user = await getUser(env, userId);
      if (!user.keys.some((key) => key.id === parts[2])) return showKeys(env, chatId, userId);
      user.activeKeyId = parts[2];
      await saveUser(env, userId, user);
      return showKeys(env, chatId, userId);
    }
    if (action === "key" && parts[1] === "del") {
      const user = await getUser(env, userId);
      user.keys = user.keys.filter((key) => key.id !== parts[2]);
      if (user.activeKeyId === parts[2]) user.activeKeyId = user.keys[0]?.id || null;
      await saveUser(env, userId, user);
      return showKeys(env, chatId, userId);
    }
    if (action === "key" && parts[1] === "check") {
      const result = await testOneKey(env, userId, parts[2]);
      return reply(env, chatId, escapeHtml(result), inline([[{ text: "Back to keys", callback_data: "key:list" }]]));
    }
    if (data === "watchlist") return showWatchlist(env, chatId, userId);
    if (data === "wl:clear") {
      const user = await getUser(env, userId);
      user.watchlist = [];
      await saveUser(env, userId, user);
      return reply(env, chatId, "Watchlist cleared.", MAIN_KEYBOARD);
    }
    if (action === "wl" && parts[1] === "open") {
      const user = await getUser(env, userId);
      const item = user.watchlist[Number(parts[2])];
      if (!item) return showWatchlist(env, chatId, userId);
      return showTitle(env, chatId, userId, item.kind, item.id);
    }
    if (action === "pick") return showTitle(env, chatId, userId, parts[1], parts[2]);
    if (action === "season") return showSeason(env, chatId, parts[1], parts[2]);
    if (action === "save") return saveToWatchlist(env, chatId, userId, parts[1], parts[2]);
    if (action === "similar") return showSimilar(env, chatId, userId, parts[1], parts[2]);
    if (action === "source" && parts[1] === "lookup") {
      const title = await getTitle(env, parts[2], parts[3]);
      return beginSourceLookup(env, chatId, userId, titleName(title, parts[2]));
    }
    if (data === "source:menu") return beginSourceLookup(env, chatId, userId);
    if (data === "news:last") {
      const user = await getUser(env, userId);
      if (!user.lastTitle?.name) return reply(env, chatId, "Search for a title first.", MAIN_KEYBOARD);
      return showNews(env, chatId, userId, user.lastTitle.name);
    }
    return reply(env, chatId, "That action is not supported. Use the menu buttons.", MAIN_KEYBOARD);
  } catch (error) {
    console.error("Callback handler error", { action, message: error.message });
    await reply(env, chatId, `Could not complete that action: ${escapeHtml(error.message)}`, MAIN_KEYBOARD);
  }
}

export async function handleUpdate(env, update) {
  if (update.callback_query) return handleCallback(env, update.callback_query);
  if (update.message) return handleMessage(env, update.message);
}

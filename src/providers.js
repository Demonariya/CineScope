import { escapeHtml, shortText } from "./ui.js";
import { fetchWithRetry } from "./http.js";

const OMDB_BASE = "https://www.omdbapi.com/";
const GEMINI_BASE = "https://generativelanguage.googleapis.com/v1beta";

async function omdb(env, params = {}) {
  if (!env.OMDB_API_KEY) {
    throw new Error("OMDb is not configured. Add OMDB_API_KEY as a Cloudflare Worker secret.");
  }
  const url = new URL(OMDB_BASE);
  url.searchParams.set("apikey", env.OMDB_API_KEY);
  url.searchParams.set("r", "json");
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null && value !== "") url.searchParams.set(key, String(value));
  }
  const response = await fetchWithRetry(url, {
    headers: { accept: "application/json" },
    signal: AbortSignal.timeout(12000)
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.Error || `OMDb request failed (${response.status})`);
  if (data.Response === "False") {
    const message = String(data.Error || "OMDb returned no result");
    if (/invalid api key/i.test(message)) throw new Error("OMDb rejected OMDB_API_KEY. Check the key in Cloudflare Worker secrets.");
    if (/request limit reached/i.test(message)) throw new Error("OMDb request limit reached. Try again later.");
    const error = new Error(message);
    error.code = "NOT_FOUND";
    throw error;
  }
  return data;
}

export function mapOmdbSearchItem(item, kind) {
  const title = item?.Title || "Untitled";
  const imdbID = String(item?.imdbID || "");
  const year = String(item?.Year || "");
  return {
    id: imdbID,
    imdbID,
    Title: title,
    Year: year,
    title,
    name: title,
    year,
    release_date: year,
    first_air_date: year,
    Poster: item?.Poster || "N/A",
    poster_path: item?.Poster && item.Poster !== "N/A" ? item.Poster : null,
    Type: item?.Type || (kind === "tv" ? "series" : "movie"),
    cineKind: kind
  };
}

export function mapOmdbTitle(data, kind) {
  const title = data?.Title || "Untitled";
  const imdbID = String(data?.imdbID || "");
  const genres = String(data?.Genre || "").split(",").map((name) => name.trim()).filter(Boolean);
  const actors = String(data?.Actors || "").split(",").map((name) => name.trim()).filter(Boolean);
  const directors = String(data?.Director || "").split(",").map((name) => name.trim()).filter(Boolean);
  const creators = String(data?.Writer || "").split(",").map((name) => name.trim()).filter(Boolean);
  const totalSeasons = Math.max(0, Number.parseInt(data?.totalSeasons || "0", 10) || 0);
  return {
    ...data,
    id: imdbID,
    imdbID,
    imdbUrl: imdbID ? `https://www.imdb.com/title/${encodeURIComponent(imdbID)}/` : "",
    title,
    name: title,
    original_title: title,
    original_name: title,
    year: String(data?.Year || ""),
    release_date: String(data?.Released || ""),
    first_air_date: String(data?.Released || data?.Year || ""),
    poster_path: data?.Poster && data.Poster !== "N/A" ? data.Poster : null,
    overview: data?.Plot && data.Plot !== "N/A" ? data.Plot : "",
    runtime: Number.parseInt(String(data?.Runtime || "").match(/\d+/)?.[0] || "0", 10) || null,
    genres: genres.map((name) => ({ name })),
    credits: {
      cast: actors.map((name) => ({ name })),
      crew: directors.map((name) => ({ name, job: "Director" }))
    },
    created_by: kind === "tv" ? creators.map((name) => ({ name })) : [],
    number_of_seasons: totalSeasons || null,
    seasons: kind === "tv" ? Array.from({ length: Math.min(totalSeasons, 30) }, (_, index) => ({
      season_number: index + 1,
      name: `Season ${index + 1}`
    })) : [],
    status: data?.Type === "series" ? "Not reported by OMDb" : "Not reported by OMDb",
    vote_average: Number.parseFloat(data?.imdbRating || "") || null,
    vote_count: Number.parseInt(String(data?.imdbVotes || "").replace(/,/g, ""), 10) || 0
  };
}

export function mapOmdbSeason(data, seasonNumber) {
  const episodes = Array.isArray(data?.Episodes) ? data.Episodes : [];
  return {
    name: `Season ${seasonNumber}`,
    season_number: Number(seasonNumber),
    episodes: episodes.map((episode) => ({
      episode_number: Number.parseInt(episode.Episode || "0", 10) || 0,
      name: episode.Title || "Untitled episode",
      air_date: episode.Released || "Date unknown",
      imdb_rating: episode.imdbRating || "N/A",
      imdb_id: episode.imdbID || ""
    }))
  };
}

export async function searchTitles(env, kind, query, page = 1) {
  const type = kind === "tv" || kind === "series" ? "series" : "movie";
  const data = await omdb(env, { s: query, type, page: Math.min(100, Math.max(1, page)) });
  return (data.Search || []).map((item) => mapOmdbSearchItem(item, type === "series" ? "tv" : "movie"));
}

export async function getTitle(env, kind, id) {
  const data = await omdb(env, { i: id, plot: "full" });
  const actualKind = data.Type === "series" || kind === "tv" ? "tv" : "movie";
  return mapOmdbTitle(data, actualKind);
}

export async function getSeason(env, imdbId, seasonNumber) {
  const data = await omdb(env, { i: imdbId, Season: seasonNumber });
  return mapOmdbSeason(data, seasonNumber);
}

function extractResponseText(data = {}) {
  if (typeof data.output_text === "string" && data.output_text.trim()) return data.output_text;
  const blocks = (data.output || []).flatMap((item) => item.content || []);
  return blocks
    .filter((item) => item.type === "output_text" || typeof item.text === "string")
    .map((item) => item.text || "")
    .join("\n");
}

export async function askGemini(env, apiKey, prompt) {
  const mode = String(env.AI_API_MODE || "google").trim().toLowerCase();
  const model = String(env.GEMINI_MODEL || "gemini-4-hydrogen").trim();

  if (mode === "responses") {
    if (!env.AI_API_BASE_URL) throw new Error("AI_API_BASE_URL is required when AI_API_MODE=responses");
    const base = String(env.AI_API_BASE_URL).replace(/\/+$/, "");
    const response = await fetchWithRetry(`${base}/responses`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${apiKey}`,
        accept: "text/event-stream, application/json"
      },
      body: JSON.stringify({ model, input: prompt, stream: true })
    });
    const raw = await response.text();
    if (!response.ok) {
      let data = {};
      try { data = JSON.parse(raw); } catch { data = { error: { message: raw.slice(0, 500) } }; }
      throw createGeminiRequestError(response.status, data);
    }
    let text = "";
    if (raw.trimStart().startsWith("{")) {
      const data = JSON.parse(raw);
      text = extractResponseText(data);
    } else {
      for (const frame of raw.split(/\r?\n\r?\n/)) {
        const dataLines = frame.split(/\r?\n/).filter((line) => line.startsWith("data:"));
        if (!dataLines.length) continue;
        const payload = dataLines.map((line) => line.slice(5).trim()).join("\n");
        if (!payload || payload === "[DONE]") continue;
        let event;
        try { event = JSON.parse(payload); } catch { continue; }
        if (event.type === "error" || event.type === "response.failed") {
          throw new Error(event.error?.message || event.response?.error?.message || "Responses API stream failed.");
        }
        if (event.type === "response.output_text.delta" && typeof event.delta === "string") text += event.delta;
        if (event.type === "response.completed") {
          const completed = extractResponseText(event.response || event);
          if (completed) text = completed;
        }
      }
    }
    text = String(text || "").trim();
    if (!text) throw new Error("The Responses API stream completed without output text.");
    return text;
  }

  const response = await fetchWithRetry(`${GEMINI_BASE}/models/${encodeURIComponent(model)}:generateContent`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-goog-api-key": apiKey
    },
    body: JSON.stringify({
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      generationConfig: { maxOutputTokens: 1400 }
    })
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw createGeminiRequestError(response.status, data);
  const text = data.candidates?.[0]?.content?.parts?.map((part) => part.text || "").join("\n").trim();
  if (!text) throw new Error("Gemini returned an empty response.");
  return text;
}

function safeGeminiErrorMessage(data = {}) {
  const raw = String(data?.error?.message || data?.message || "").trim();
  return raw
    .replace(/\bAIza[0-9A-Za-z_-]{20,}\b/g, "[redacted]")
    .replace(/\bAQ\.[0-9A-Za-z._-]{12,}\b/g, "[redacted]")
    .slice(0, 500);
}

function classifyGeminiFailure(status, data = {}) {
  const message = safeGeminiErrorMessage(data);
  const details = Array.isArray(data?.error?.details) ? data.error.details : [];
  const reasons = details.map((item) => String(item?.reason || "")).filter(Boolean);
  const diagnostic = (reasons.join(" ") + " " + message).toLowerCase();

  if ([500, 502, 503, 504].includes(status)) return { ok: false, reason: "service_unavailable", status, message };
  if (status === 429) return { ok: false, reason: "rate_limited", status, message };
  if (/access_token_type_unsupported/.test(diagnostic)) {
    return { ok: false, reason: "auth_key_rejected", status, message };
  }
  if (/api_key_service_blocked|requests to this api .*blocked/.test(diagnostic)) {
    return { ok: false, reason: "api_restricted", status, message };
  }
  if (/your project has been denied access|project.{0,40}(denied|restricted)/.test(diagnostic)) {
    return { ok: false, reason: "project_denied", status, message };
  }
  if (/api_key_invalid|api_key_expired|api key not valid/.test(diagnostic) || status === 401) {
    return { ok: false, reason: "invalid_key", status, message };
  }
  if (status === 403) return { ok: false, reason: "permission_denied", status, message };
  if (status === 404 || /model .*not found|not supported for generatecontent/.test(diagnostic)) {
    return { ok: false, reason: "model_unavailable", status, message };
  }
  return { ok: false, reason: `http_${status}`, status, message };
}

function createGeminiRequestError(status, data = {}) {
  const failure = classifyGeminiFailure(status, data);
  const codeMap = {
    rate_limited: "RATE_LIMITED",
    invalid_key: "INVALID_KEY",
    auth_key_rejected: "AUTH_KEY_REJECTED",
    api_restricted: "PERMISSION_DENIED",
    project_denied: "PROJECT_DENIED",
    permission_denied: "PERMISSION_DENIED",
    model_unavailable: "MODEL_UNAVAILABLE",
    service_unavailable: "SERVICE_UNAVAILABLE"
  };
  const message = failure.message || `Gemini API request failed (HTTP ${status}).`;
  const error = new Error(`${message} (HTTP ${status})`);
  error.code = codeMap[failure.reason] || "GEMINI_API_ERROR";
  error.providerReason = failure.reason;
  error.status = status;
  return error;
}

export async function validateGeminiKey(apiKey, env) {
  const mode = String(env.AI_API_MODE || "google").trim().toLowerCase();
  if (mode === "responses") {
    if (!env.AI_API_BASE_URL) return { ok: false, reason: "base_url_missing" };
    const base = String(env.AI_API_BASE_URL).replace(/\/+$/, "");
    const response = await fetchWithRetry(`${base}/models`, {
      headers: { authorization: `Bearer ${apiKey}` }
    });
    if (!response.ok) {
      const data = await response.json().catch(() => ({}));
      return classifyGeminiFailure(response.status, data);
    }
    return { ok: true };
  }

  // Test the real generation endpoint. models.list can succeed even when
  // the Google project is not permitted to call generateContent.
  const model = String(env.GEMINI_MODEL || "gemini-4-hydrogen").trim();
  const response = await fetchWithRetry(`${GEMINI_BASE}/models/${encodeURIComponent(model)}:generateContent`, {
    method: "POST",
    headers: { "content-type": "application/json", "x-goog-api-key": apiKey },
    body: JSON.stringify({
      contents: [{ role: "user", parts: [{ text: "Reply with OK." }] }],
      generationConfig: { maxOutputTokens: 128 }
    })
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) return classifyGeminiFailure(response.status, data);
  if (!data.candidates?.[0]?.content?.parts?.some((part) => typeof part.text === "string")) {
    return { ok: false, reason: "empty_response", status: response.status, message: "Gemini accepted the request but returned no text." };
  }
  return { ok: true };
}

function decodeXml(text = "") {
  return String(text)
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .trim();
}

export async function searchNews(title, rawQuery = false, language = "fa") {
  const url = new URL("https://news.google.com/rss/search");
  const isPersian = language === "fa";
  url.searchParams.set("q", rawQuery ? title : (isPersian ? `${title} فیلم OR سریال OR سینما` : `${title} movie OR series`));
  url.searchParams.set("hl", isPersian ? "fa" : "en-US");
  url.searchParams.set("gl", isPersian ? "IR" : "US");
  url.searchParams.set("ceid", isPersian ? "IR:fa" : "US:en");
  const response = await fetchWithRetry(url, {
    headers: { accept: "application/rss+xml, application/xml, text/xml" },
    signal: AbortSignal.timeout(12000)
  });
  if (!response.ok) throw new Error(`News feed request failed (${response.status})`);
  const xml = await response.text();
  return [...xml.matchAll(/<item>([\s\S]*?)<\/item>/gi)].slice(0, 8).map((match) => {
    const block = match[1];
    const get = (tag) => decodeXml(block.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\/${tag}>`, "i"))?.[1] || "");
    return { title: get("title"), link: get("link"), pubDate: get("pubDate"), source: get("source") };
  }).filter((item) => item.title && /^https:\/\//i.test(item.link));
}

export function formatSearchResult(item, kind) {
  const title = item.Title || item.title || item.name;
  const year = String(item.Year || item.year || "").slice(0, 4) || "Year unknown";
  const type = kind === "tv" ? "Series" : "Movie";
  return `${escapeHtml(title || "Untitled")} · ${escapeHtml(year)} · ${type}`;
}

export function formatTitleDetails(item, kind) {
  const title = item.Title || item.title || item.name;
  const original = item.original_title;
  const year = item.Year || item.year || "Unknown";
  const genres = item.Genre && item.Genre !== "N/A" ? item.Genre : (item.genres || []).map((genre) => genre.name).join(", ") || "Unknown";
  const rating = item.imdbRating && item.imdbRating !== "N/A"
    ? `${item.imdbRating}/10 IMDb${item.imdbVotes && item.imdbVotes !== "N/A" ? ` · ${item.imdbVotes} votes` : ""}`
    : "Not rated";
  const creator = kind === "movie" ? item.Director : (item.Writer || item.Director);
  const cast = item.Actors && item.Actors !== "N/A" ? item.Actors : "Not available";
  const overview = shortText(item.Plot && item.Plot !== "N/A" ? item.Plot : "No synopsis is available.", 950);
  const lines = [
    `<b>🎬 ${escapeHtml(title || "Untitled")}</b>`,
    original && original !== title ? `Original title: ${escapeHtml(original)}` : "",
    `Type: ${kind === "movie" ? "Movie" : "TV series"}`,
    item.imdbID ? `IMDb ID: ${escapeHtml(item.imdbID)}` : "",
    `Year: ${escapeHtml(year)}`,
    kind === "movie" ? `Runtime: ${escapeHtml(item.Runtime || "Unknown")}` : `Seasons: ${escapeHtml(item.totalSeasons || item.number_of_seasons || "Unknown")}`,
    `Genre: ${escapeHtml(genres)}`,
    `${kind === "movie" ? "Director" : "Creator / writer"}: ${escapeHtml(creator && creator !== "N/A" ? creator : "Unknown")}`,
    `Rating: ${escapeHtml(rating)}`,
    `Rated: ${escapeHtml(item.Rated || "Unknown")}`,
    `Released: ${escapeHtml(item.Released || "Unknown")}`,
    `Country: ${escapeHtml(item.Country || "Unknown")}`,
    `Language: ${escapeHtml(item.Language || "Unknown")}`,
    `Cast: ${escapeHtml(cast)}`,
    item.Awards && item.Awards !== "N/A" ? `Awards: ${escapeHtml(item.Awards)}` : "",
    item.Metascore && item.Metascore !== "N/A" ? `Metascore: ${escapeHtml(item.Metascore)}` : "",
    item.BoxOffice && item.BoxOffice !== "N/A" ? `Box office: ${escapeHtml(item.BoxOffice)}` : "",
    "",
    `<b>Plot</b>\n${escapeHtml(overview)}`,
    item.imdbID ? `\n<a href="https://www.imdb.com/title/${escapeHtml(item.imdbID)}/">IMDb page</a>` : ""
  ].filter(Boolean);
  if (kind === "tv" && Number(item.totalSeasons) > 0) {
    lines.push("", "<b>Season guide</b>", `Use a season button below to list all available episodes (OMDb reports ${escapeHtml(item.totalSeasons)} seasons).`);
  }
  return lines.join("\n");
}

export function posterUrl(value) {
  return value && /^https:\/\//i.test(value) && value !== "N/A" ? value : null;
}

export function titleName(item, kind) {
  return kind === "movie" ? item.Title || item.title || item.name : item.Title || item.name || item.title;
}

export function safeNewsText(item, language = "fa") {
  return `<b>${escapeHtml(shortText(item.title, 180))}</b>\n${escapeHtml(item.source || "News source")} · ${escapeHtml(formatDateSafe(item.pubDate, language))}\n<a href="${escapeHtml(item.link)}">Read article</a>`;
}

function formatDateSafe(value, language = "fa") {
  const date = new Date(value || "");
  return Number.isNaN(date.getTime()) ? "Date unavailable" : date.toLocaleDateString(language === "fa" ? "fa-IR" : "en-US", { dateStyle: "medium", timeZone: "UTC" });
}

const SOURCE_HOSTS = new Set(["dornatv.com", "www.dornatv.com", "movieplus.top", "www.movieplus.top", "animex.pro", "www.animex.pro"]);

function decodeHtml(value = "") {
  return String(value)
    .replace(/&amp;/g, "&").replace(/&quot;/g, '"').replace(/&#39;|&apos;/g, "'")
    .replace(/&lt;/g, "<").replace(/&gt;/g, ">")
    .replace(/&#(\d+);/g, (_, code) => String.fromCodePoint(Number(code)))
    .replace(/&#x([\da-f]+);/gi, (_, code) => String.fromCodePoint(parseInt(code, 16)))
    .trim();
}

function metaContent(html, selector) {
  const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const tag = new RegExp(`<meta\\b(?=[^>]*(?:name|property)=["']${escaped}["'])[^>]*>`, "i").exec(html)?.[0] || "";
  return decodeHtml(tag.match(/\bcontent=["']([^"']*)["']/i)?.[1] || "");
}

function flattenJsonLd(value) {
  if (Array.isArray(value)) return value.flatMap(flattenJsonLd);
  if (!value || typeof value !== "object") return [];
  const graph = Array.isArray(value["@graph"]) ? value["@graph"].flatMap(flattenJsonLd) : [];
  return [value, ...graph];
}

function validateSourceUrl(url) {
  if (url.protocol !== "https:" || !SOURCE_HOSTS.has(url.hostname.toLowerCase()) || (url.port && url.port !== "443")) {
    throw new Error("Only HTTPS detail pages from dornatv.com, movieplus.top, or animex.pro are supported.");
  }
  if (url.username || url.password) throw new Error("URLs containing credentials are not allowed.");
}

async function fetchSourcePage(startUrl) {
  let current = startUrl;
  for (let hop = 0; hop <= 2; hop += 1) {
    const response = await fetchWithRetry(current, {
      method: "GET",
      redirect: "manual",
      headers: { accept: "text/html,application/xhtml+xml" },
      signal: AbortSignal.timeout(10000)
    });
    if ([301, 302, 303, 307, 308].includes(response.status)) {
      const location = response.headers.get("location");
      if (!location || hop === 2) throw new Error("The source page redirected too many times.");
      const next = new URL(location, current);
      validateSourceUrl(next);
      current = next;
      continue;
    }
    return { response, url: current };
  }
  throw new Error("The source page could not be loaded safely.");
}

export async function getSourceMetadata(rawUrl) {
  let url;
  try { url = new URL(String(rawUrl || "").trim()); }
  catch { throw new Error("Send a valid HTTPS page URL from one of the supported sites."); }
  validateSourceUrl(url);
  const { response, url: finalUrl } = await fetchSourcePage(url);
  if (!response.ok) throw new Error(`Source page request failed (${response.status}).`);
  const declaredLength = Number(response.headers.get("content-length") || 0);
  if (declaredLength > 2_000_000) throw new Error("The source page is larger than the 2 MB metadata limit.");
  const contentType = response.headers.get("content-type") || "";
  if (!/text\/html|application\/xhtml\+xml/i.test(contentType)) throw new Error("The supplied URL did not return an HTML page.");
  const html = (await response.text()).slice(0, 2_000_000);
  const ldBlocks = [...html.matchAll(/<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)];
  const candidates = [];
  for (const match of ldBlocks) {
    try { candidates.push(...flattenJsonLd(JSON.parse(match[1].trim()))); } catch { /* Skip malformed structured metadata. */ }
  }
  const structured = candidates.find((item) => {
    const type = Array.isArray(item["@type"]) ? item["@type"].join(" ") : String(item["@type"] || "");
    return /Movie|TVSeries|TVEpisode|CreativeWork/i.test(type) && (item.name || item.headline);
  }) || {};
  const pickText = (value) => typeof value === "string" ? value : value?.name || "";
  const actorNames = Array.isArray(structured.actor) ? structured.actor.map(pickText).filter(Boolean).slice(0, 8) : [];
  const genres = Array.isArray(structured.genre) ? structured.genre.map(pickText).filter(Boolean) : structured.genre ? [pickText(structured.genre)] : [];
  const title = pickText(structured.name || structured.headline) || metaContent(html, "og:title") || decodeHtml(html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1] || "");
  const description = pickText(structured.description) || metaContent(html, "og:description") || metaContent(html, "description");
  const imageValue = structured.image?.url || structured.image?.[0]?.url || (typeof structured.image === "string" ? structured.image : "") || metaContent(html, "og:image");
  const rating = structured.aggregateRating?.ratingValue || "";
  const ratingCount = structured.aggregateRating?.ratingCount || structured.aggregateRating?.reviewCount || "";
  return {
    title: shortText(title, 200),
    description: shortText(description, 1200),
    image: /^https:\/\//i.test(imageValue) ? imageValue : "",
    date: pickText(structured.datePublished || structured.dateCreated || structured.dateModified) || metaContent(html, "article:published_time"),
    genres: genres.slice(0, 8),
    actors: actorNames,
    director: Array.isArray(structured.director) ? structured.director.map(pickText).filter(Boolean).join(", ") : pickText(structured.director),
    rating: rating ? `${rating}${ratingCount ? ` (${ratingCount})` : ""}` : "",
    pageUrl: finalUrl.href
  };
}

const SITE_LINK_SOURCES = Object.freeze({
  dorna: { name: "درنا تی‌وی", host: "dornatv.com" },
  movieplus: { name: "MoviePlus", host: "movieplus.top" },
  animex: { name: "AnimeX", host: "animex.pro" }
});

function normalizeSearchText(value = "") {
  return String(value)
    .toLocaleLowerCase()
    .replace(/[يى]/g, "ی")
    .replace(/ك/g, "ک")
    .replace(/[\u064b-\u065f\u0670]/g, "")
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim();
}

function titleMatchScore(title, query) {
  const normalizedTitle = normalizeSearchText(title);
  const terms = normalizeSearchText(query).split(/\s+/).filter((term) => term.length > 1);
  if (!normalizedTitle || !terms.length) return 0;
  const matched = terms.filter((term) => normalizedTitle.includes(term)).length;
  const required = terms.length <= 2 ? terms.length : Math.ceil(terms.length * 0.6);
  return matched >= required ? matched / terms.length : 0;
}

function safeContentLink(rawHref, baseUrl) {
  let url;
  try { url = new URL(decodeHtml(rawHref), baseUrl); }
  catch { return null; }
  if (url.protocol !== "https:" || url.hostname.toLowerCase() !== baseUrl.hostname.toLowerCase()) return null;
  if (url.username || url.password || (url.port && url.port !== "443")) return null;
  const path = url.pathname.toLowerCase();
  if (!path || path === "/" || /\.(?:m3u8?|mpd|mp4|m4v|mkv|avi|mov|mp3|zip|rar|7z|pdf|jpe?g|png|webp|gif|vtt|srt)$/i.test(path)) return null;
  if (/\/(?:wp-admin|wp-login|wp-json|feed|tag|category|author|search|page|embed|player|play|stream|watch|download)(?:\/|$)/i.test(path)) return null;
  if (["url", "src", "file", "download", "stream", "playlist"].some((key) => url.searchParams.has(key))) return null;
  url.hash = "";
  return url.href;
}

function extractSiteSearchResults(html, searchUrl, query, limit = 6) {
  const results = [];
  const seen = new Set();
  const anchorPattern = /<a\b([^>]*)>([\s\S]*?)<\/a>/gi;
  for (const match of html.matchAll(anchorPattern)) {
    const attributes = match[1] || "";
    const href = attributes.match(/\bhref\s*=\s*(["'])(.*?)\1/i)?.[2];
    if (!href) continue;
    const url = safeContentLink(href, searchUrl);
    if (!url || seen.has(url)) continue;
    const titleAttribute = attributes.match(/\btitle\s*=\s*(["'])(.*?)\1/i)?.[2] || "";
    const anchorText = decodeHtml((match[2] || "")
      .replace(/<script\b[\s\S]*?<\/script>/gi, " ")
      .replace(/<style\b[\s\S]*?<\/style>/gi, " ")
      .replace(/<[^>]+>/g, " ")
      .replace(/&nbsp;/gi, " "))
      .replace(/\s+/g, " ")
      .trim();
    const title = shortText(decodeHtml(titleAttribute) || anchorText, 160);
    const score = titleMatchScore(title, query);
    if (!title || score <= 0) continue;
    seen.add(url);
    results.push({ title, url, score });
  }
  return results
    .sort((a, b) => b.score - a.score || a.title.length - b.title.length)
    .slice(0, Math.max(1, Math.min(10, limit)))
    .map(({ title, url }) => ({ title, url }));
}

async function fetchSiteSearchPage(startUrl, expectedHost) {
  let current = startUrl;
  for (let hop = 0; hop <= 2; hop += 1) {
    const response = await fetchWithRetry(current, {
      method: "GET",
      redirect: "manual",
      headers: { accept: "text/html,application/xhtml+xml" },
      signal: AbortSignal.timeout(9000)
    });
    if ([301, 302, 303, 307, 308].includes(response.status)) {
      const location = response.headers.get("location");
      if (!location || hop === 2) throw new Error("Search page redirected too many times.");
      const next = new URL(location, current);
      if (next.protocol !== "https:" || next.hostname.toLowerCase() !== expectedHost) {
        throw new Error("Search page redirected outside its selected site.");
      }
      current = next;
      continue;
    }
    if (!response.ok) throw new Error(`Site search failed (HTTP ${response.status}).`);
    const contentType = response.headers.get("content-type") || "";
    if (!/text\/html|application\/xhtml\+xml/i.test(contentType)) {
      throw new Error("The selected site did not return an HTML search page.");
    }
    const declaredLength = Number(response.headers.get("content-length") || 0);
    if (declaredLength > 3_000_000) throw new Error("The site search page is larger than the 3 MB limit.");
    const html = (await response.text()).slice(0, 3_000_000);
    return { html, finalUrl: new URL(current) };
  }
  throw new Error("The selected site's search page could not be loaded safely.");
}

export function getSiteLinkSources() {
  return Object.entries(SITE_LINK_SOURCES).map(([key, site]) => ({ key, ...site }));
}

export async function searchSiteTitles(siteKey, query, limit = 6) {
  const site = SITE_LINK_SOURCES[String(siteKey || "")];
  const normalizedQuery = String(query || "").trim();
  if (!site) throw new Error("Unsupported site selection.");
  if (normalizedQuery.length < 2 || normalizedQuery.length > 160) {
    throw new Error("Search title must contain between 2 and 160 characters.");
  }

  const root = new URL(`https://${site.host}/`);
  const strategies = [
    (url) => { url.searchParams.set("s", normalizedQuery); },
    (url) => { url.pathname = "/search/"; url.searchParams.set("q", normalizedQuery); },
    (url) => { url.pathname = `/search/${encodeURIComponent(normalizedQuery)}/`; }
  ];
  let fallbackUrl = null;
  let lastError = null;

  for (const buildSearchUrl of strategies) {
    const searchUrl = new URL(root);
    buildSearchUrl(searchUrl);
    fallbackUrl ||= searchUrl.href;
    try {
      const { html, finalUrl } = await fetchSiteSearchPage(searchUrl, site.host);
      const results = extractSiteSearchResults(html, finalUrl, normalizedQuery, limit);
      if (results.length) {
        return { siteKey, siteName: site.name, query: normalizedQuery, searchUrl: finalUrl.href, results };
      }
    } catch (error) {
      lastError = error;
    }
  }

  return {
    siteKey,
    siteName: site.name,
    query: normalizedQuery,
    searchUrl: fallbackUrl,
    results: [],
    unavailable: Boolean(lastError)
  };
}

export function formatSourceMetadata(item, expectedTitle = "") {
  const lines = [
    `<b>🗂 Source-page metadata</b>`,
    `Site title: ${escapeHtml(item.title || "Not exposed by page")}`,
    item.date ? `Date: ${escapeHtml(item.date)}` : "",
    item.genres?.length ? `Genres: ${escapeHtml(item.genres.join(", "))}` : "",
    item.director ? `Director: ${escapeHtml(item.director)}` : "",
    item.actors?.length ? `Cast: ${escapeHtml(item.actors.join(", "))}` : "",
    item.rating ? `Rating: ${escapeHtml(item.rating)}` : "",
    "",
    item.description ? `<b>Description</b>\n${escapeHtml(item.description)}` : "No structured synopsis was found on this page.",
    expectedTitle ? `\nRequested title: ${escapeHtml(expectedTitle)}` : "",
    `\n<a href="${escapeHtml(item.pageUrl)}">Open the source page</a>`
  ].filter(Boolean);
  return lines.join("\n");
}

export async function searchTrendingNews(language = "fa") {
  const query = language === "fa"
    ? "اخبار سینما فیلم سریال فروش گیشه تریلر جدید"
    : "trending movies OR trending TV series OR film box office OR new trailers";
  return searchNews(query, true, language);
}

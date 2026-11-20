import test from "node:test";
import assert from "node:assert/strict";
import {
  mapOmdbSearchItem, mapOmdbTitle, mapOmdbSeason,
  searchTitles, getTitle, getSeason, getSourceMetadata, validateGeminiKey
} from "../src/providers.js";

test("maps OMDb search results to IMDb IDs and bot kinds", () => {
  const item = mapOmdbSearchItem({
    Title: "The Example", Year: "2024", imdbID: "tt3896198", Type: "series", Poster: "https://img.example/poster.jpg"
  }, "tv");
  assert.equal(item.id, "tt3896198");
  assert.equal(item.imdbID, "tt3896198");
  assert.equal(item.Title, "The Example");
  assert.equal(item.Year, "2024");
  assert.equal(item.cineKind, "tv");
  assert.equal(item.poster_path, "https://img.example/poster.jpg");
});

test("maps OMDb title details, IMDb URL, seasons, cast and genres", () => {
  const item = mapOmdbTitle({
    Title: "The Example", Year: "2020–2024", imdbID: "tt1234567", Type: "series",
    totalSeasons: "3", Genre: "Drama, Mystery", Actors: "Actor One, Actor Two",
    Director: "Director One", Writer: "Writer One", Plot: "A short plot.",
    Poster: "N/A", imdbRating: "8.2", imdbVotes: "12,345"
  }, "tv");
  assert.equal(item.imdbUrl, "https://www.imdb.com/title/tt1234567/");
  assert.equal(item.number_of_seasons, 3);
  assert.equal(item.seasons.length, 3);
  assert.deepEqual(item.genres.map((x) => x.name), ["Drama", "Mystery"]);
  assert.deepEqual(item.credits.cast.map((x) => x.name), ["Actor One", "Actor Two"]);
  assert.equal(item.vote_average, 8.2);
  assert.equal(item.vote_count, 12345);
});

test("maps OMDb season episode fields", () => {
  const season = mapOmdbSeason({ Episodes: [
    { Episode: "1", Title: "Pilot", Released: "01 Jan 2024", imdbRating: "8.1", imdbID: "tt1000001" }
  ] }, 1);
  assert.equal(season.season_number, 1);
  assert.equal(season.episodes[0].episode_number, 1);
  assert.equal(season.episodes[0].name, "Pilot");
  assert.equal(season.episodes[0].imdb_rating, "8.1");
});

test("calls OMDb search, details, and season endpoints with the correct parameters", async () => {
  const originalFetch = globalThis.fetch;
  const requested = [];
  globalThis.fetch = async (input) => {
    const url = new URL(input);
    requested.push(url);
    let body;
    if (url.searchParams.has("s")) {
      body = { Response: "True", Search: [{ Title: "The Example", Year: "2024", imdbID: "tt3896198", Type: "movie", Poster: "N/A" }] };
    } else if (url.searchParams.has("Season")) {
      body = { Response: "True", Season: "2", Episodes: [{ Episode: "1", Title: "Second Start", Released: "02 Feb 2024" }] };
    } else {
      body = { Response: "True", Title: "The Example", Year: "2024", imdbID: "tt3896198", Type: "movie", Plot: "Example plot" };
    }
    return new Response(JSON.stringify(body), { status: 200, headers: { "content-type": "application/json" } });
  };
  try {
    const env = { OMDB_API_KEY: "test-key" };
    const search = await searchTitles(env, "movie", "The Example");
    const detail = await getTitle(env, "movie", "tt3896198");
    const season = await getSeason(env, "tt3896198", 2);
    assert.equal(search[0].imdbID, "tt3896198");
    assert.equal(detail.Title, "The Example");
    assert.equal(season.episodes[0].name, "Second Start");
    assert.equal(requested[0].searchParams.get("s"), "The Example");
    assert.equal(requested[0].searchParams.get("type"), "movie");
    assert.equal(requested[1].searchParams.get("i"), "tt3896198");
    assert.equal(requested[2].searchParams.get("Season"), "2");
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("source metadata accepts only the configured HTTPS hosts", async () => {
  await assert.rejects(
    () => getSourceMetadata("https://example.com/a-title"),
    /Only HTTPS detail pages/,
  );
  await assert.rejects(
    () => getSourceMetadata("http://dornatv.com/a-title"),
    /Only HTTPS detail pages/,
  );
});

test("extracts structured metadata from an allowed source page", async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => new Response(`<!doctype html><html><head>
    <meta property="og:title" content="Sample Film">
    <meta property="og:description" content="A sample synopsis">
    <script type="application/ld+json">{"@type":"Movie","name":"Sample Film","genre":["Drama"],"datePublished":"2024-01-01","actor":[{"name":"Actor A"}]}</script>
    </head><body></body></html>`, {
    status: 200,
    headers: { "content-type": "text/html; charset=utf-8" }
  });
  try {
    const metadata = await getSourceMetadata("https://dornatv.com/sample-film/");
    assert.equal(metadata.title, "Sample Film");
    assert.equal(metadata.description, "A sample synopsis");
    assert.deepEqual(metadata.genres, ["Drama"]);
    assert.deepEqual(metadata.actors, ["Actor A"]);
    assert.equal(metadata.date, "2024-01-01");
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("rejects source-page redirects to hosts outside the allowlist", async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => new Response(null, {
    status: 302,
    headers: { location: "https://example.com/redirected" }
  });
  try {
    await assert.rejects(
      () => getSourceMetadata("https://dornatv.com/sample-film/"),
      /Only HTTPS detail pages/
    );
  } finally {
    globalThis.fetch = originalFetch;
  }
});


test("validates a Gemini key by calling generateContent rather than models.list", async () => {
  const originalFetch = globalThis.fetch;
  let requestedUrl;
  let requestOptions;
  globalThis.fetch = async (input, options) => {
    requestedUrl = String(input);
    requestOptions = options;
    return new Response(JSON.stringify({
      candidates: [{ content: { parts: [{ text: "OK" }] } }]
    }), { status: 200, headers: { "content-type": "application/json" } });
  };
  try {
    const result = await validateGeminiKey("test-gemini-key", { GEMINI_MODEL: "gemini-test-model" });
    assert.deepEqual(result, { ok: true });
    assert.match(requestedUrl, /models\/gemini-test-model:generateContent$/);
    assert.equal(requestOptions.headers["x-goog-api-key"], "test-gemini-key");
    assert.equal(JSON.parse(requestOptions.body).generationConfig.maxOutputTokens, 8);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("distinguishes a project-level Gemini denial from an invalid API key", async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => new Response(JSON.stringify({
    error: { code: 403, status: "PERMISSION_DENIED", message: "Your project has been denied access. Please contact support." }
  }), { status: 403, headers: { "content-type": "application/json" } });
  try {
    const result = await validateGeminiKey("test-gemini-key", {});
    assert.equal(result.ok, false);
    assert.equal(result.reason, "project_denied");
    assert.match(result.message, /project has been denied access/);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("reports invalid Gemini API keys separately", async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => new Response(JSON.stringify({
    error: { code: 400, status: "INVALID_ARGUMENT", message: "API key not valid. Please pass a valid API key.", details: [{ reason: "API_KEY_INVALID" }] }
  }), { status: 400, headers: { "content-type": "application/json" } });
  try {
    const result = await validateGeminiKey("test-gemini-key", {});
    assert.equal(result.ok, false);
    assert.equal(result.reason, "invalid_key");
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("reports unavailable Gemini model separately", async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => new Response(JSON.stringify({
    error: { code: 404, status: "NOT_FOUND", message: "Model not found." }
  }), { status: 404, headers: { "content-type": "application/json" } });
  try {
    const result = await validateGeminiKey("test-gemini-key", {});
    assert.equal(result.ok, false);
    assert.equal(result.reason, "model_unavailable");
  } finally {
    globalThis.fetch = originalFetch;
  }
});

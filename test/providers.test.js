import test from "node:test";
import assert from "node:assert/strict";
import {
  mapOmdbSearchItem, mapOmdbTitle, mapOmdbSeason,
  searchTitles, getTitle, getSeason, getSourceMetadata, validateGeminiKey,
  getSiteLinkSources, searchSiteTitles
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
    assert.equal(JSON.parse(requestOptions.body).generationConfig.maxOutputTokens, 128);
    assert.equal("temperature" in JSON.parse(requestOptions.body).generationConfig, false);
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


test("defaults Gemini validation to the Gemini 4 Hydrogen model", async () => {
  const originalFetch = globalThis.fetch;
  let requestedUrl;
  globalThis.fetch = async (input) => {
    requestedUrl = String(input);
    return new Response(JSON.stringify({
      candidates: [{ content: { parts: [{ text: "OK" }] } }]
    }), { status: 200, headers: { "content-type": "application/json" } });
  };
  try {
    const result = await validateGeminiKey("test-gemini-key", {});
    assert.deepEqual(result, { ok: true });
    assert.match(requestedUrl, /models\/gemini-4-hydrogen:generateContent$/);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("distinguishes an authorization-key type error from an invalid key", async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => new Response(JSON.stringify({
    error: {
      code: 401,
      status: "UNAUTHENTICATED",
      message: "API key not valid. Please pass a valid API key.",
      details: [{ reason: "ACCESS_TOKEN_TYPE_UNSUPPORTED" }]
    }
  }), { status: 401, headers: { "content-type": "application/json" } });
  try {
    const result = await validateGeminiKey("test-gemini-key", {});
    assert.equal(result.ok, false);
    assert.equal(result.reason, "auth_key_rejected");
    assert.equal(result.status, 401);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("classifies Gemini API key restrictions separately", async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => new Response(JSON.stringify({
    error: {
      code: 403,
      status: "PERMISSION_DENIED",
      message: "Requests to this API are blocked.",
      details: [{ reason: "API_KEY_SERVICE_BLOCKED" }]
    }
  }), { status: 403, headers: { "content-type": "application/json" } });
  try {
    const result = await validateGeminiKey("test-gemini-key", {});
    assert.equal(result.ok, false);
    assert.equal(result.reason, "api_restricted");
  } finally {
    globalThis.fetch = originalFetch;
  }
});


test("lists only the three configured title-link sources", () => {
  assert.deepEqual(getSiteLinkSources().map((site) => site.key), ["dorna", "movieplus", "animex"]);
  assert.deepEqual(getSiteLinkSources().map((site) => site.host), ["dornatv.com", "movieplus.top", "animex.pro"]);
});

test("fetches matching public title pages and filters external or direct-media links", async () => {
  const originalFetch = globalThis.fetch;
  let requestedUrl;
  globalThis.fetch = async (input) => {
    requestedUrl = new URL(input);
    return new Response(`<!doctype html><html><body>
      <a href="/john-wick-2014/">دانلود فیلم John Wick (2014)</a>
      <a href="/john-wick-chapter-2/">John Wick Chapter 2</a>
      <a href="https://evil.example/john-wick/">John Wick</a>
      <a href="/john-wick-stream.m3u8">John Wick stream</a>
      <a href="/other-film/">Other Film</a>
      <a href="/category/action/">John Wick</a>
    </body></html>`, {
      status: 200,
      headers: { "content-type": "text/html; charset=utf-8" }
    });
  };
  try {
    const result = await searchSiteTitles("dorna", "John Wick", 6);
    assert.equal(requestedUrl.hostname, "dornatv.com");
    assert.equal(requestedUrl.searchParams.get("s"), "John Wick");
    assert.equal(result.siteName, "درنا تی‌وی");
    assert.equal(result.results.length, 2);
    assert.ok(result.results.every((item) => new URL(item.url).hostname === "dornatv.com"));
    assert.ok(result.results.some((item) => item.url.endsWith("/john-wick-2014/")));
    assert.ok(result.results.some((item) => item.url.endsWith("/john-wick-chapter-2/")));
    assert.ok(result.results.every((item) => !/\.m3u8?($|\?)/i.test(item.url)));
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("returns the selected site's search page when no matching title is found", async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => new Response(
    '<html><body><a href="/unrelated/">Unrelated movie</a></body></html>',
    { status: 200, headers: { "content-type": "text/html" } }
  );
  try {
    const result = await searchSiteTitles("movieplus", "John Wick");
    assert.equal(result.results.length, 0);
    assert.equal(result.unavailable, false);
    assert.equal(new URL(result.searchUrl).hostname, "movieplus.top");
    assert.equal(new URL(result.searchUrl).searchParams.get("s"), "John Wick");
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("never follows a site search redirect to another host", async () => {
  const originalFetch = globalThis.fetch;
  const requestedHosts = [];
  globalThis.fetch = async (input) => {
    requestedHosts.push(new URL(input).hostname);
    return new Response(null, {
      status: 302,
      headers: { location: "https://example.com/redirected" }
    });
  };
  try {
    const result = await searchSiteTitles("animex", "Naruto");
    assert.equal(result.results.length, 0);
    assert.equal(result.unavailable, true);
    assert.ok(requestedHosts.every((host) => host === "animex.pro"));
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("rejects invalid site keys and empty search titles", async () => {
  await assert.rejects(() => searchSiteTitles("unknown", "John Wick"), /Unsupported site selection/);
  await assert.rejects(() => searchSiteTitles("dorna", " "), /between 2 and 160 characters/);
});

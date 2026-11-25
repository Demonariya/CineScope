import test from "node:test";
import assert from "node:assert/strict";
import { fetchWithRetry } from "../src/http.js";

test("retries transient HTTP 503 responses before returning success", async () => {
  const originalFetch = globalThis.fetch;
  let attempts = 0;
  globalThis.fetch = async () => {
    attempts += 1;
    return attempts < 3
      ? new Response("busy", { status: 503 })
      : new Response("ok", { status: 200 });
  };
  try {
    const response = await fetchWithRetry("https://example.test", {}, {
      attempts: 3, baseDelayMs: 0, maxDelayMs: 0, sleep: async () => {}
    });
    assert.equal(response.status, 200);
    assert.equal(await response.text(), "ok");
    assert.equal(attempts, 3);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("returns the final 503 after the bounded retry budget is exhausted", async () => {
  const originalFetch = globalThis.fetch;
  let attempts = 0;
  globalThis.fetch = async () => {
    attempts += 1;
    return new Response("still unavailable", { status: 503 });
  };
  try {
    const response = await fetchWithRetry("https://example.test", {}, {
      attempts: 3, baseDelayMs: 0, maxDelayMs: 0, sleep: async () => {}
    });
    assert.equal(response.status, 503);
    assert.equal(attempts, 3);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("retries transient network errors", async () => {
  const originalFetch = globalThis.fetch;
  let attempts = 0;
  globalThis.fetch = async () => {
    attempts += 1;
    if (attempts < 2) throw new TypeError("fetch failed");
    return new Response("ok", { status: 200 });
  };
  try {
    const response = await fetchWithRetry("https://example.test", {}, {
      attempts: 3, baseDelayMs: 0, maxDelayMs: 0, sleep: async () => {}
    });
    assert.equal(response.status, 200);
    assert.equal(attempts, 2);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("does not retry HTTP 429 quota responses", async () => {
  const originalFetch = globalThis.fetch;
  let attempts = 0;
  globalThis.fetch = async () => {
    attempts += 1;
    return new Response("quota", { status: 429 });
  };
  try {
    const response = await fetchWithRetry("https://example.test", {}, {
      attempts: 4, baseDelayMs: 0, maxDelayMs: 0, sleep: async () => {}
    });
    assert.equal(response.status, 429);
    assert.equal(attempts, 1);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

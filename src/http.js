const RETRYABLE_STATUSES = new Set([408, 425, 500, 502, 503, 504]);

function retryAfterMs(response, attempt, baseDelayMs, maxDelayMs) {
  const header = response?.headers?.get?.("retry-after");
  if (header) {
    const seconds = Number(header);
    if (Number.isFinite(seconds) && seconds >= 0) {
      return Math.min(maxDelayMs, seconds * 1000);
    }
    const date = Date.parse(header);
    if (Number.isFinite(date)) return Math.min(maxDelayMs, Math.max(0, date - Date.now()));
  }
  return Math.min(maxDelayMs, baseDelayMs * (2 ** attempt));
}

function isTransientNetworkError(error) {
  return error instanceof TypeError ||
    error?.name === "AbortError" ||
    error?.name === "TimeoutError" ||
    /network|fetch failed|connection|socket|timeout/i.test(String(error?.message || ""));
}

/**
 * Retries transient upstream failures with a short exponential backoff.
 * It intentionally does not retry 429: quota/rate-limit responses need
 * provider-specific handling and may include a long Retry-After value.
 */
export async function fetchWithRetry(input, init = {}, options = {}) {
  const attempts = Math.max(1, Math.min(4, Number(options.attempts) || 3));
  const baseDelayMs = Math.max(0, Number(options.baseDelayMs ?? 250));
  const maxDelayMs = Math.max(0, Number(options.maxDelayMs ?? 1200));
  const sleep = options.sleep || ((ms) => new Promise((resolve) => setTimeout(resolve, ms)));

  for (let attempt = 0; attempt < attempts; attempt += 1) {
    let response;
    try {
      response = await fetch(input, init);
    } catch (error) {
      if (attempt + 1 >= attempts || !isTransientNetworkError(error)) throw error;
      await sleep(Math.min(maxDelayMs, baseDelayMs * (2 ** attempt)));
      continue;
    }

    if (!RETRYABLE_STATUSES.has(response.status) || attempt + 1 >= attempts) {
      return response;
    }

    const delay = retryAfterMs(response, attempt, baseDelayMs, maxDelayMs);
    try { await response.body?.cancel(); } catch { /* Ignore cleanup errors before retry. */ }
    await sleep(delay);
  }

  throw new Error("Upstream request failed after retries.");
}

import { localizeMarkup, translateText } from "./i18n.js";
import { fetchWithRetry } from "./http.js";

const API = "https://api.telegram.org";

export async function telegram(env, method, payload = {}) {
  if (!env.BOT_TOKEN) throw new Error("BOT_TOKEN is not configured");
  let response;
  try {
    response = await fetchWithRetry(`${API}/bot${env.BOT_TOKEN}/${method}`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(10000)
    }, { attempts: 3, baseDelayMs: 200, maxDelayMs: 900 });
  } catch (cause) {
    const error = new Error("Telegram API connection failed after retries.");
    error.code = "TELEGRAM_NETWORK_ERROR";
    error.cause = cause;
    throw error;
  }
  const result = await response.json().catch(() => ({}));
  if (!response.ok || !result.ok) {
    const description = result.description || `Telegram API error (${response.status})`;
    const error = new Error(description);
    error.code = response.status === 503 || response.status === 502 || response.status === 504
      ? "TELEGRAM_SERVICE_UNAVAILABLE"
      : response.status === 429 ? "TELEGRAM_RATE_LIMITED" : "TELEGRAM_API_ERROR";
    error.status = response.status;
    throw error;
  }
  return result.result;
}

export async function sendMessage(env, chatId, text, replyMarkup, options = {}) {
  return telegram(env, "sendMessage", {
    chat_id: chatId,
    text: translateText(text, "fa"),
    parse_mode: "HTML",
    disable_web_page_preview: true,
    ...(replyMarkup ? { reply_markup: localizeMarkup(replyMarkup, "fa") } : {}),
    ...options
  });
}

export async function editMessage(env, chatId, messageId, text, replyMarkup) {
  return telegram(env, "editMessageText", {
    chat_id: chatId,
    message_id: messageId,
    text: translateText(text, "fa"),
    parse_mode: "HTML",
    disable_web_page_preview: true,
    ...(replyMarkup ? { reply_markup: localizeMarkup(replyMarkup, "fa") } : {})
  });
}

export async function answerCallback(env, callbackId, text = "", showAlert = false) {
  return telegram(env, "answerCallbackQuery", {
    callback_query_id: callbackId,
    ...(text ? { text: translateText(text, "fa") } : {}),
    show_alert: showAlert
  });
}

export async function deleteMessage(env, chatId, messageId) {
  try {
    await telegram(env, "deleteMessage", { chat_id: chatId, message_id: messageId });
  } catch {
    // Deletion is best-effort; Telegram may reject it because of permissions or timing.
  }
}

export async function sendPhoto(env, chatId, photo, caption, replyMarkup) {
  return telegram(env, "sendPhoto", {
    chat_id: chatId,
    photo,
    caption: translateText(caption, "fa"),
    parse_mode: "HTML",
    ...(replyMarkup ? { reply_markup: localizeMarkup(replyMarkup, "fa") } : {})
  });
}

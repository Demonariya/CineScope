import { handleUpdate } from "./bot.js";
import { sendMessage } from "./telegram.js";

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "content-type": "application/json; charset=utf-8" }
  });
}

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    if (request.method === "GET" && url.pathname === "/health") {
      return json({ ok: true, service: "CineScope", timestamp: new Date().toISOString() });
    }
    if (request.method !== "POST" || url.pathname !== "/webhook") {
      return new Response("Not found", { status: 404 });
    }
    if (!env.TELEGRAM_WEBHOOK_SECRET) return new Response("Webhook secret is not configured", { status: 503 });
    const suppliedSecret = request.headers.get("X-Telegram-Bot-Api-Secret-Token") || "";
    if (suppliedSecret !== env.TELEGRAM_WEBHOOK_SECRET) return new Response("Unauthorized", { status: 401 });

    let update;
    try {
      update = await request.json();
    } catch {
      return new Response("Invalid JSON", { status: 400 });
    }

    const task = handleUpdate(env, update).catch(async (error) => {
      // Never log update bodies: they may contain a user-submitted API key.
      console.error("Update processing failed", { message: error.message, updateId: update?.update_id });
      const chatId = update?.message?.chat?.id || update?.callback_query?.message?.chat?.id;
      if (chatId) {
        try { await sendMessage(env, chatId, "CineScope hit an internal error while handling that request. Please try again."); }
        catch { /* Keep background processing isolated from Telegram delivery failures. */ }
      }
    });
    if (ctx?.waitUntil) ctx.waitUntil(task);
    else await task;
    return new Response("ok");
  }
};

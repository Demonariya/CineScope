const token = process.env.BOT_TOKEN;
const workerUrl = process.env.WORKER_URL;
const secret = process.env.TELEGRAM_WEBHOOK_SECRET;

if (!token || !workerUrl || !secret) {
  console.error("Set BOT_TOKEN, WORKER_URL and TELEGRAM_WEBHOOK_SECRET before running this script.");
  process.exit(1);
}

const normalizedUrl = workerUrl.replace(/\/+$/, "");
const response = await fetch(`https://api.telegram.org/bot${token}/setWebhook`, {
  method: "POST",
  headers: { "content-type": "application/json" },
  body: JSON.stringify({
    url: `${normalizedUrl}/webhook`,
    secret_token: secret,
    allowed_updates: ["message", "callback_query"],
    drop_pending_updates: true
  })
});
const result = await response.json();
if (!response.ok || !result.ok) {
  console.error(result.description || `Telegram returned HTTP ${response.status}`);
  process.exit(1);
}
console.log(`Webhook configured: ${normalizedUrl}/webhook`);

const token = process.env.BOT_TOKEN;
if (!token) {
  console.error("Set BOT_TOKEN before running this script.");
  process.exit(1);
}
const response = await fetch(`https://api.telegram.org/bot${token}/deleteWebhook`, {
  method: "POST",
  headers: { "content-type": "application/json" },
  body: JSON.stringify({ drop_pending_updates: false })
});
const result = await response.json();
if (!response.ok || !result.ok) {
  console.error(result.description || `Telegram returned HTTP ${response.status}`);
  process.exit(1);
}
console.log("Webhook removed.");

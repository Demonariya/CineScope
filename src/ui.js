export const MAIN_KEYBOARD = {
  keyboard: [
    [{ text: "🔎 Search movie" }, { text: "📺 Search series" }],
    [{ text: "📰 Cinema news" }, { text: "🔥 Trending" }],
    [{ text: "📚 Watchlist" }, { text: "🤖 Ask AI" }],
    [{ text: "🔑 My API keys" }, { text: "🗂 Site metadata" }],
    [{ text: "❔ Help" }]
  ],
  resize_keyboard: true,
  is_persistent: true,
  input_field_placeholder: "Send a movie or series title…"
};

export const CANCEL_KEYBOARD = {
  keyboard: [[{ text: "✖️ Cancel" }]],
  resize_keyboard: true,
  one_time_keyboard: true
};

export function inline(rows) {
  return { inline_keyboard: rows };
}

export function escapeHtml(value = "") {
  return String(value).replace(/[&<>"']/g, (char) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
  })[char]);
}

export function shortText(value, max = 500) {
  const text = String(value || "").trim();
  return text.length > max ? `${text.slice(0, max - 1).trimEnd()}…` : text;
}

export function formatDate(value) {
  if (!value) return "Unknown";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? String(value) : date.toLocaleDateString("en-US", {
    year: "numeric", month: "short", day: "numeric", timeZone: "UTC"
  });
}

export function mainMenuText() {
  return [
    "<b>🎬 CineScope</b>",
    "Your movie &amp; series companion.",
    "",
    "Choose an action below, or send a title directly.",
    "<i>Tip: Search supports movie and TV-show titles.</i>"
  ].join("\n");
}

export function keyLabel(key, activeKeyId) {
  const state = key.status === "rate_limited" ? "⏳ Limited" : key.status === "invalid" ? "⚠️ Invalid" : "✅ Ready";
  const active = key.id === activeKeyId ? " · ACTIVE" : "";
  return `${state}${active} · ${key.label}`;
}

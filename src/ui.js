export const MAIN_KEYBOARD = {
  keyboard: [
    [{ text: "🔎 جست‌وجوی فیلم" }, { text: "📺 جست‌وجوی سریال" }],
    [{ text: "📰 اخبار سینما" }, { text: "🔥 ترندها" }],
    [{ text: "📚 فهرست تماشا" }, { text: "🤖 پرسش از هوش مصنوعی" }],
    [{ text: "🔑 کلیدهای API من" }, { text: "🗂 اطلاعات سایت" }],
    [{ text: "❔ راهنما" }]
  ],
  resize_keyboard: true,
  is_persistent: true,
  input_field_placeholder: "نام فیلم یا سریال را ارسال کنید…"
};

export const CANCEL_KEYBOARD = {
  keyboard: [[{ text: "✖️ لغو" }]],
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

export function formatDate(value, language = "en") {
  if (!value) return language === "fa" ? "نامشخص" : "Unknown";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return date.toLocaleDateString(language === "fa" ? "fa-IR" : "en-US", {
    year: "numeric", month: "short", day: "numeric", timeZone: "UTC"
  });
}

export function mainMenuText() {
  return [
    "<b>🎬 CineScope</b>",
    "همراه شما برای دنیای فیلم و سریال.",
    "",
    "یکی از گزینه‌های زیر را انتخاب کنید یا نام فیلم و سریال را مستقیم بفرستید.",
    "<i>نکته: جست‌وجو از عنوان فیلم و سریال پشتیبانی می‌کند.</i>"
  ].join("\n");
}

export function keyLabel(key, activeKeyId) {
  const state = key.status === "rate_limited" ? "⏳ محدودیت درخواست" : key.status === "invalid" ? "⚠️ نامعتبر" : "✅ آماده";
  const active = key.id === activeKeyId ? " · فعال" : "";
  return `${state}${active} · ${key.label}`;
}

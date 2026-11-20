import test from "node:test";
import assert from "node:assert/strict";
import { languageFromTelegram, localizeMarkup, normalizeInput, translateText } from "../src/i18n.js";

test("keeps the bot language Persian regardless of Telegram client locale", () => {
  assert.equal(languageFromTelegram("fa"), "fa");
  assert.equal(languageFromTelegram("fa-IR"), "fa");
  assert.equal(languageFromTelegram("en"), "fa");
  assert.equal(languageFromTelegram("az"), "fa");
  assert.equal(languageFromTelegram(""), "fa");
});

test("translates interface text while preserving movie titles", () => {
  assert.equal(translateText("Your watchlist is empty. Search for a title and tap Save to watchlist.", "fa"),
    "فهرست تماشای شما خالی است. یک عنوان جست‌وجو کنید و «افزودن به فهرست تماشا» را بزنید.");
  assert.equal(translateText("<b>🎬 The English Patient</b>\nType: Movie", "fa"),
    "<b>🎬 The English Patient</b>\nنوع: فیلم");
  assert.equal(translateText("<b>🎬 Unknown</b>", "fa"), "<b>🎬 Unknown</b>");
  assert.equal(translateText("Your watchlist is empty.", "en"), "Your watchlist is empty.");
});

test("normalizes Persian reply-keyboard labels to bot actions", () => {
  assert.equal(normalizeInput("🔎 جست‌وجوی فیلم"), "🔎 Search movie");
  assert.equal(normalizeInput("✖️ لغو"), "✖️ Cancel");
  assert.equal(normalizeInput("🌐 زبان"), "/language");
  assert.equal(normalizeInput("🌐 زبان / زبان"), "/language");
  assert.equal(normalizeInput("/language"), "/language");
});

test("localizes keyboard labels while retaining callback data", () => {
  const markup = { inline_keyboard: [[{ text: "Main menu", callback_data: "menu" }]] };
  const localized = localizeMarkup(markup, "fa");
  assert.equal(localized.inline_keyboard[0][0].text, "منوی اصلی");
  assert.equal(localized.inline_keyboard[0][0].callback_data, "menu");
  assert.equal(markup.inline_keyboard[0][0].text, "Main menu");
  const season = localizeMarkup({ inline_keyboard: [[{ text: "Season 2", callback_data: "season:tt123:2" }]] }, "fa");
  assert.equal(season.inline_keyboard[0][0].text, "فصل 2");
});

test("formats episode counts in Persian", () => {
  assert.equal(translateText("Showing 3 of 12 episodes.", "fa"), "نمایش 3 از 12 قسمت.");
});

test("translates fallback result types and private-chat errors into Persian", () => {
  assert.equal(translateText("A title · 2024 · Movie", "fa"), "A title · 2024 · فیلم");
  assert.equal(translateText("A title · 2024 · Series", "fa"), "A title · 2024 · سریال");
  assert.equal(
    translateText("Please use CineScope in a private chat. API-key management is disabled in groups.", "fa"),
    "لطفاً از CineScope در گفت‌وگوی خصوصی استفاده کنید. مدیریت کلید API در گروه‌ها غیرفعال است."
  );
});

test("translates remaining inline controls and technical labels into Persian", () => {
  const markup = localizeMarkup({
    inline_keyboard: [[
      { text: "🧪 Test all keys", callback_data: "key:test" },
      { text: "⬅️ Main menu", callback_data: "menu" }
    ]]
  }, "fa");
  assert.equal(markup.inline_keyboard[0][0].text, "🧪 آزمایش همه کلیدها");
  assert.equal(markup.inline_keyboard[0][1].text, "⬅️ منوی اصلی");
  assert.equal(translateText("Testing saved keys with Google…", "fa"), "در حال آزمایش کلیدهای ذخیره‌شده با Google…");
  assert.equal(translateText("AI gateway", "fa"), "درگاه هوش مصنوعی");
});

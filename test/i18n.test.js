import test from "node:test";
import assert from "node:assert/strict";
import { languageFromTelegram, localizeMarkup, normalizeInput, translateText } from "../src/i18n.js";

test("detects Persian Telegram clients and defaults other locales to English", () => {
  assert.equal(languageFromTelegram("fa"), "fa");
  assert.equal(languageFromTelegram("fa-IR"), "fa");
  assert.equal(languageFromTelegram("en"), "en");
  assert.equal(languageFromTelegram("az"), "en");
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
  assert.equal(normalizeInput("/language"), "/language");
});

test("localizes keyboard labels while retaining callback data", () => {
  const markup = { inline_keyboard: [[{ text: "Main menu", callback_data: "menu" }]] };
  const localized = localizeMarkup(markup, "fa");
  assert.equal(localized.inline_keyboard[0][0].text, "منوی اصلی");
  assert.equal(localized.inline_keyboard[0][0].callback_data, "menu");
  assert.equal(markup.inline_keyboard[0][0].text, "Main menu");
});

test("formats episode counts in Persian", () => {
  assert.equal(translateText("Showing 3 of 12 episodes.", "fa"), "نمایش 3 از 12 قسمت.");
});

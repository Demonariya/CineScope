import test from "node:test";
import assert from "node:assert/strict";
import { randomBytes, webcrypto } from "node:crypto";
import { getUser, saveUser } from "../src/storage.js";

globalThis.crypto ||= webcrypto;

function createEnv() {
  const values = new Map();
  return {
    ENCRYPTION_KEY: randomBytes(32).toString("base64"),
    CINE_KV: {
      async get(key) { return values.get(key) ?? null; },
      async put(key, value) { values.set(key, value); },
      async delete(key) { values.delete(key); }
    },
    _values: values
  };
}

test("user records are encrypted at rest and can be read back", async () => {
  const env = createEnv();
  const record = await getUser(env, "12345");
  record.keys.push({ id: "one", secret: "AIza-example-super-secret-key", label: "Gemini ••••key" });
  await saveUser(env, "12345", record);
  const raw = env._values.get("user:12345");
  assert.ok(raw.startsWith("v1."));
  assert.equal(raw.includes("AIza-example-super-secret-key"), false);
  const restored = await getUser(env, "12345");
  assert.equal(restored.keys[0].secret, "AIza-example-super-secret-key");
});

test("records cannot be decrypted with a different encryption key", async () => {
  const env = createEnv();
  const record = await getUser(env, "777");
  record.keys.push({ id: "one", secret: "private-value" });
  await saveUser(env, "777", record);
  const wrongEnv = { ...env, ENCRYPTION_KEY: randomBytes(32).toString("base64") };
  await assert.rejects(() => getUser(wrongEnv, "777"), /could not be read/);
});

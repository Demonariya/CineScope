const encoder = new TextEncoder();
const decoder = new TextDecoder();

function toBase64(bytes) {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary);
}

function fromBase64(value) {
  const binary = atob(value);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

async function getCryptoKey(env) {
  if (!env.ENCRYPTION_KEY) throw new Error("ENCRYPTION_KEY is not configured");
  const raw = fromBase64(env.ENCRYPTION_KEY.trim());
  if (raw.byteLength !== 32) {
    throw new Error("ENCRYPTION_KEY must be a base64-encoded 32-byte value");
  }
  return crypto.subtle.importKey("raw", raw, { name: "AES-GCM" }, false, ["encrypt", "decrypt"]);
}

export function createDefaultUser() {
  return {
    version: 1,
    keys: [],
    activeKeyId: null,
    watchlist: [],
    pending: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
}

async function encryptJson(value, env) {
  const key = await getCryptoKey(env);
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const plaintext = encoder.encode(JSON.stringify(value));
  const ciphertext = new Uint8Array(await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, plaintext));
  return `v1.${toBase64(iv)}.${toBase64(ciphertext)}`;
}

async function decryptJson(value, env) {
  const [version, ivText, ciphertextText] = String(value).split(".");
  if (version !== "v1" || !ivText || !ciphertextText) throw new Error("Unsupported encrypted user record");
  const key = await getCryptoKey(env);
  const plaintext = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv: fromBase64(ivText) },
    key,
    fromBase64(ciphertextText)
  );
  return JSON.parse(decoder.decode(plaintext));
}

export async function getUser(env, userId) {
  const raw = await env.CINE_KV.get(`user:${userId}`);
  if (!raw) return createDefaultUser();
  try {
    return { ...createDefaultUser(), ...(await decryptJson(raw, env)) };
  } catch (error) {
    console.error("User record could not be decrypted", { userId, message: error.message });
    throw new Error("Your saved data could not be read. Check the ENCRYPTION_KEY configuration.");
  }
}

export async function saveUser(env, userId, data) {
  const updated = { ...data, updatedAt: new Date().toISOString() };
  const encrypted = await encryptJson(updated, env);
  await env.CINE_KV.put(`user:${userId}`, encrypted);
  return updated;
}

export async function getFlow(env, userId) {
  const value = await env.CINE_KV.get(`flow:${userId}`, { type: "json" });
  if (!value || !value.expiresAt || value.expiresAt < Date.now()) return null;
  return value;
}

export async function setFlow(env, userId, flow, ttlSeconds = 600) {
  await env.CINE_KV.put(`flow:${userId}`, JSON.stringify({ ...flow, expiresAt: Date.now() + ttlSeconds * 1000 }), {
    expirationTtl: ttlSeconds
  });
}

export async function clearFlow(env, userId) {
  await env.CINE_KV.delete(`flow:${userId}`);
}

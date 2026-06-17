// All crypto runs client-side. Never called server-side.

export function bufferToBase64(buf: ArrayBuffer): string {
  return btoa(String.fromCharCode(...new Uint8Array(buf)));
}

export function base64ToBuffer(b64: string): ArrayBuffer {
  const bin = atob(b64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return bytes.buffer;
}

export function randomBuffer(bytes = 32): ArrayBuffer {
  return crypto.getRandomValues(new Uint8Array(bytes)).buffer;
}

export async function deriveKey(secret: string, salt: ArrayBuffer): Promise<CryptoKey> {
  const mat = await crypto.subtle.importKey(
    "raw", new TextEncoder().encode(secret), "PBKDF2", false, ["deriveKey"]
  );
  return crypto.subtle.deriveKey(
    { name: "PBKDF2", salt, iterations: 150000, hash: "SHA-256" },
    mat,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"]
  );
}

export async function generateMasterKey(): Promise<CryptoKey> {
  return crypto.subtle.generateKey({ name: "AES-GCM", length: 256 }, true, ["encrypt", "decrypt"]);
}

export async function exportKey(key: CryptoKey): Promise<ArrayBuffer> {
  return crypto.subtle.exportKey("raw", key);
}

export async function importKey(raw: ArrayBuffer): Promise<CryptoKey> {
  return crypto.subtle.importKey("raw", raw, { name: "AES-GCM", length: 256 }, false, ["encrypt", "decrypt"]);
}

export async function encryptRaw(key: CryptoKey, plaintext: string): Promise<{ c: string; iv: string }> {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const enc = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, new TextEncoder().encode(plaintext));
  return { c: bufferToBase64(enc), iv: bufferToBase64(iv.buffer) };
}

export async function decryptRaw(key: CryptoKey, c: string, iv: string): Promise<string> {
  const dec = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv: base64ToBuffer(iv) },
    key,
    base64ToBuffer(c)
  );
  return new TextDecoder().decode(dec);
}

export function generateRecoveryCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // no O/0/I/1
  const rand = crypto.getRandomValues(new Uint8Array(24));
  const groups: string[] = [];
  for (let g = 0; g < 6; g++) {
    let s = "";
    for (let i = 0; i < 4; i++) s += chars[rand[g * 4 + i] % chars.length];
    groups.push(s);
  }
  return groups.join("-");
}

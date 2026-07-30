import { safeStorage } from "electron";
import { db, getSetting, setSetting } from "./db";

// The Anthropic API key (BYO) is encrypted with the OS keychain via Electron
// safeStorage and stored as base64 in the settings table. Plaintext never
// touches disk and is only decrypted in-memory in the main process.

const AI_KEY = "secret:anthropic-key";

function encryptionAvailable(): boolean {
  try {
    return safeStorage.isEncryptionAvailable();
  } catch {
    return false;
  }
}

export function setAiKey(plaintext: string): void {
  const trimmed = plaintext.trim();
  if (!trimmed) {
    clearAiKey();
    return;
  }
  if (!encryptionAvailable()) {
    throw new Error("OS keychain encryption is unavailable; cannot store the key securely.");
  }
  setSetting(db(), AI_KEY, safeStorage.encryptString(trimmed).toString("base64"));
}

export function clearAiKey(): void {
  setSetting(db(), AI_KEY, "");
}

export function hasAiKey(): boolean {
  return !!getSetting(db(), AI_KEY);
}

export function getAiKey(): string | null {
  const v = getSetting(db(), AI_KEY);
  if (!v || !encryptionAvailable()) return null;
  try {
    return safeStorage.decryptString(Buffer.from(v, "base64"));
  } catch {
    return null;
  }
}

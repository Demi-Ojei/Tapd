/**
 * TAPD — Secure Key Storage
 * Falls back to memory storage when SecureStore
 * is unavailable (web, Expo Go preview).
 */

export interface StoredRoomKey {
  rawToken: string;
  roomNumber: string;
  hotelName: string;
  expiresAt: string;
  guestName: string;
  checkIn: string;
  checkOut: string;
}

const memoryStore: Record<string, string> = {};

async function setItem(key: string, value: string): Promise<void> {
  try {
    const SecureStore = require("expo-secure-store");
    await SecureStore.setItemAsync(key, value);
  } catch {
    memoryStore[key] = value;
  }
}

async function getItem(key: string): Promise<string | null> {
  try {
    const SecureStore = require("expo-secure-store");
    const val = await SecureStore.getItemAsync(key);
    return val ?? memoryStore[key] ?? null;
  } catch {
    return memoryStore[key] ?? null;
  }
}

async function deleteItem(key: string): Promise<void> {
  try {
    const SecureStore = require("expo-secure-store");
    await SecureStore.deleteItemAsync(key);
  } catch {
    delete memoryStore[key];
  }
}

const ACTIVE_KEY_PREFIX = "tapd_room_key_";
const ADMIN_API_KEY = "tapd_admin_api_key";

// Preview mock key — shows real UI in Expo Go without needing a backend call
const MOCK_KEY: StoredRoomKey = {
  rawToken: "preview-token-not-real",
  roomNumber: "101",
  hotelName: "Grand Plaza Hotel",
  expiresAt: new Date(Date.now() + 86_400_000 * 2).toISOString(),
  guestName: "Demo Guest",
  checkIn: new Date().toISOString().slice(0, 10),
  checkOut: new Date(Date.now() + 86_400_000 * 3).toISOString().slice(0, 10),
};

export async function saveRoomKey(reservationId: number, key: StoredRoomKey): Promise<void> {
  await setItem(`${ACTIVE_KEY_PREFIX}${reservationId}`, JSON.stringify(key));
}

export async function getRoomKey(reservationId: number): Promise<StoredRoomKey | null> {
  const raw = await getItem(`${ACTIVE_KEY_PREFIX}${reservationId}`);
  if (raw) return JSON.parse(raw);
  return MOCK_KEY;
}

export async function deleteRoomKey(reservationId: number): Promise<void> {
  await deleteItem(`${ACTIVE_KEY_PREFIX}${reservationId}`);
}

export async function saveAdminApiKey(apiKey: string, hotelId: number): Promise<void> {
  await setItem(ADMIN_API_KEY, JSON.stringify({ apiKey, hotelId }));
}

export async function getAdminSession(): Promise<{ apiKey: string; hotelId: number } | null> {
  const raw = await getItem(ADMIN_API_KEY);
  return raw ? JSON.parse(raw) : null;
}

export async function clearAdminSession(): Promise<void> {
  await deleteItem(ADMIN_API_KEY);
}

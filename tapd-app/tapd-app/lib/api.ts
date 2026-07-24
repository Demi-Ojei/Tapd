/**
 * ─────────────────────────────────────────────────────────────
 *  TAPD — API Client
 *  File: lib/api.ts
 * ─────────────────────────────────────────────────────────────
 *  Talks to the real tapd-backend server (server.js) built earlier.
 *  No mock data — every call here maps to an endpoint that already
 *  exists in the backend:
 *    POST /api/v1/tokens/verify        — unlock a door
 *    GET  /api/v1/reservations         — guest's upcoming stay
 *    POST /api/v1/hotels/:id/staff     — admin: add staff
 *    POST /api/v1/hotels/:id/master-keys — admin: issue master key
 *    GET  /api/v1/audit/room/:room     — access log
 *
 *  SECURITY NOTE: API_BASE_URL points at your backend. In production
 *  this should be an HTTPS endpoint, never hardcoded with credentials.
 *  No API keys live in this file — auth tokens are stored in
 *  SecureStore (see lib/auth.ts) and attached per-request.
 */

import * as SecureStore from "expo-secure-store";

// TODO: replace with your deployed backend URL before shipping.
// For local development this points at your machine running `node server.js`.
const API_BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL ?? "http://localhost:3000/api/v1";

class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

async function request<T>(
  path: string,
  options: RequestInit & { authToken?: string } = {}
): Promise<T> {
  const { authToken, ...fetchOptions } = options;

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(fetchOptions.headers as Record<string, string>),
  };

  if (authToken) {
    headers["x-api-key"] = authToken;
  }

  const res = await fetch(`${API_BASE_URL}${path}`, {
    ...fetchOptions,
    headers,
  });

  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    throw new ApiError(data?.error ?? data?.reason ?? "Request failed", res.status);
  }

  return data as T;
}

// ── Types matching the backend's actual response shapes ────────────────────────

export interface Reservation {
  id: number;
  hotel_id: number;
  room_id: number;
  guest_name: string;
  guest_email: string | null;
  check_in: string;
  check_out: string;
  status: "confirmed" | "checked_in" | "checked_out" | "cancelled";
}

export interface VerifyResponse {
  granted: boolean;
  key_type?: "guest" | "master";
  room_number?: string;
  expires_at?: string;
  reason?: string;
  staff_name?: string;
  staff_role?: string;
}

export interface StaffMember {
  id: number;
  name: string;
  role: "housekeeping" | "maintenance" | "front_desk" | "manager";
  email: string | null;
  is_active: number;
}

export interface MasterKey {
  id: number;
  label: string;
  staff_name: string;
  staff_role: string;
  floors_allowed: string | null;
  expires_at: string;
  is_active: number;
  last_used_at: string | null;
}

export interface AuditEvent {
  id: number;
  event_type: string;
  room_number: string | null;
  actor_ip: string | null;
  details: string | null;
  created_at: string;
}

// ── Guest endpoints ──────────────────────────────────────────────────────────

/** Fetch reservations for a given room/hotel — used to show the guest's upcoming stay. */
export function getReservations(params: { hotel_id?: number; room_id?: number }) {
  const qs = new URLSearchParams();
  if (params.hotel_id) qs.set("hotel_id", String(params.hotel_id));
  if (params.room_id) qs.set("room_id", String(params.room_id));
  return request<Reservation[]>(`/reservations?${qs.toString()}`);
}

/**
 * Verify a guest or master key token against a room's lock.
 * This is what fires when the guest taps "Unlock Room" — it calls the
 * exact same endpoint the door hardware itself would call.
 */
export function verifyToken(token: string, roomNumber: string) {
  return request<VerifyResponse>("/tokens/verify", {
    method: "POST",
    body: JSON.stringify({ token, room_number: roomNumber }),
  });
}

// ── Admin endpoints ──────────────────────────────────────────────────────────

export function listStaff(hotelId: number, apiKey: string) {
  return request<StaffMember[]>(`/hotels/${hotelId}/staff`, { authToken: apiKey });
}

export function addStaff(
  hotelId: number,
  apiKey: string,
  body: { name: string; role: StaffMember["role"]; email?: string }
) {
  return request<{ id: number }>(`/hotels/${hotelId}/staff`, {
    method: "POST",
    authToken: apiKey,
    body: JSON.stringify(body),
  });
}

export function listMasterKeys(hotelId: number, apiKey: string) {
  return request<MasterKey[]>(`/hotels/${hotelId}/master-keys`, { authToken: apiKey });
}

export function issueMasterKey(
  hotelId: number,
  apiKey: string,
  body: { staff_id: number; label: string; expires_in_days?: number; floors_allowed?: number[] }
) {
  return request<{ raw_token: string; label: string }>(`/hotels/${hotelId}/master-keys`, {
    method: "POST",
    authToken: apiKey,
    body: JSON.stringify(body),
  });
}

export function revokeMasterKey(keyId: number, apiKey: string) {
  return request<{ revoked: boolean }>(`/master-keys/${keyId}`, {
    method: "DELETE",
    authToken: apiKey,
  });
}

export function getRoomAuditLog(roomNumber: string) {
  return request<AuditEvent[]>(`/audit/room/${roomNumber}`);
}

export function getHotelAuditLog(hotelId: number) {
  return request<AuditEvent[]>(`/audit/hotel/${hotelId}`);
}

export { ApiError };

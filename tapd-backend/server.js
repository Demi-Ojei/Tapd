"use strict";

/**
 * TAPD — Core API Server  v1.1.0
 *
 * Key behaviours added in this version:
 *  1. ONE KEY PER RESERVATION — issueToken returns the existing active token
 *     for a reservation instead of creating a duplicate. A new token is only
 *     generated when none exists or the existing one has expired.
 *  2. STAFF MASTER KEYS — StaffMembers table tracks hotel staff with roles
 *     (housekeeping | maintenance | front_desk | manager). MasterKeys table
 *     holds long-lived tokens that can open ANY room in a hotel, or optionally
 *     only rooms on specific floors. Verify endpoint handles master keys.
 *  3. FULL ACCESS LOG — every door open, denial, and revocation is written to
 *     AuditLog. New GET /api/v1/audit/room/:room_number and
 *     GET /api/v1/audit/hotel/:hotel_id endpoints expose the log cleanly.
 */

const express = require("express");
const sqlite3 = require("sqlite3").verbose();
const crypto  = require("crypto");
const path    = require("path");

const { BRAND, SERVER, SECURITY, PMS } = require("./config");

const app = express();
const TAG = `[${BRAND.slug}]`;

// ── Middleware ─────────────────────────────────────────────────────────────────
app.use(express.json());
app.use((req, _res, next) => {
  req.clientIp =
    (req.headers["x-forwarded-for"] || "").split(",")[0].trim() ||
    req.socket?.remoteAddress || "unknown";
  next();
});

// ── Database ───────────────────────────────────────────────────────────────────
const DB_PATH = path.join(__dirname, `${BRAND.slug}.db`);
const db = new sqlite3.Database(DB_PATH, (err) => {
  if (err) { console.error("Failed to open database:", err); process.exit(1); }
  console.log(`${TAG} Database ready → ${DB_PATH}`);
});

db.serialize(() => {
  db.run("PRAGMA foreign_keys = ON");
  db.run("PRAGMA journal_mode = WAL");
});

// ── Promisified DB helpers (all queries use parameterised inputs) ───────────────
const dbRun = (sql, params = []) =>
  new Promise((resolve, reject) =>
    db.run(sql, params, function (err) {
      if (err) reject(err); else resolve({ lastID: this.lastID, changes: this.changes });
    })
  );
const dbGet = (sql, params = []) =>
  new Promise((resolve, reject) =>
    db.get(sql, params, (err, row) => (err ? reject(err) : resolve(row)))
  );
const dbAll = (sql, params = []) =>
  new Promise((resolve, reject) =>
    db.all(sql, params, (err, rows) => (err ? reject(err) : resolve(rows)))
  );

// ── Schema ────────────────────────────────────────────────────────────────────
db.serialize(() => {

  // Hotels
  db.run(`CREATE TABLE IF NOT EXISTS Hotels (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    name       TEXT    NOT NULL,
    address    TEXT, city TEXT, country TEXT,
    api_key    TEXT    NOT NULL UNIQUE,
    created_at TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
    updated_at TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
  )`);

  // Rooms
  db.run(`CREATE TABLE IF NOT EXISTS Rooms (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    hotel_id    INTEGER NOT NULL REFERENCES Hotels(id) ON DELETE CASCADE,
    room_number TEXT    NOT NULL,
    floor       INTEGER, room_type TEXT,
    is_active   INTEGER NOT NULL DEFAULT 1,
    created_at  TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
    updated_at  TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
    UNIQUE(hotel_id, room_number)
  )`);

  // Reservations
  db.run(`CREATE TABLE IF NOT EXISTS Reservations (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    hotel_id      INTEGER NOT NULL REFERENCES Hotels(id) ON DELETE CASCADE,
    room_id       INTEGER NOT NULL REFERENCES Rooms(id)  ON DELETE CASCADE,
    guest_name    TEXT    NOT NULL,
    guest_email   TEXT,
    check_in      TEXT    NOT NULL,
    check_out     TEXT    NOT NULL,
    status        TEXT    NOT NULL DEFAULT 'confirmed',
    pms_source    TEXT, pms_event_id TEXT,
    created_at    TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
    updated_at    TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
  )`);

  // Guest tokens — ONE per reservation. Raw token never stored.
  db.run(`CREATE TABLE IF NOT EXISTS ActiveTokens (
    id               INTEGER PRIMARY KEY AUTOINCREMENT,
    room_id          INTEGER NOT NULL REFERENCES Rooms(id) ON DELETE CASCADE,
    reservation_id   INTEGER UNIQUE REFERENCES Reservations(id) ON DELETE SET NULL,
    room_number      TEXT    NOT NULL,
    token_hash       TEXT    NOT NULL UNIQUE,
    ip_address       TEXT,
    expires_at       TEXT    NOT NULL,
    last_verified_at TEXT,
    created_at       TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
    updated_at       TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
  )`);

  // Staff members — people who work at the hotel
  db.run(`CREATE TABLE IF NOT EXISTS StaffMembers (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    hotel_id   INTEGER NOT NULL REFERENCES Hotels(id) ON DELETE CASCADE,
    name       TEXT    NOT NULL,
    role       TEXT    NOT NULL CHECK(role IN ('housekeeping','maintenance','front_desk','manager')),
    email      TEXT,
    is_active  INTEGER NOT NULL DEFAULT 1,
    created_at TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
    updated_at TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
  )`);

  // Master keys — long-lived, open ANY room in the hotel (or scoped to floors)
  // floors_allowed: JSON array e.g. [1,2,3] or null = all floors
  db.run(`CREATE TABLE IF NOT EXISTS MasterKeys (
    id             INTEGER PRIMARY KEY AUTOINCREMENT,
    hotel_id       INTEGER NOT NULL REFERENCES Hotels(id) ON DELETE CASCADE,
    staff_id       INTEGER REFERENCES StaffMembers(id) ON DELETE SET NULL,
    label          TEXT    NOT NULL,
    token_hash     TEXT    NOT NULL UNIQUE,
    floors_allowed TEXT,
    expires_at     TEXT    NOT NULL,
    is_active      INTEGER NOT NULL DEFAULT 1,
    last_used_at   TEXT,
    created_at     TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
    updated_at     TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
  )`);

  // Audit log — immutable, append-only
  db.run(`CREATE TABLE IF NOT EXISTS AuditLog (
    id             INTEGER PRIMARY KEY AUTOINCREMENT,
    event_type     TEXT NOT NULL,
    token_hash     TEXT,
    room_number    TEXT,
    hotel_id       INTEGER,
    reservation_id INTEGER,
    staff_id       INTEGER,
    actor_ip       TEXT,
    details        TEXT,
    created_at     TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
  )`);
});

// ── Core helpers ──────────────────────────────────────────────────────────────
function generateRawToken() {
  return crypto.randomBytes(SECURITY.tokenBytes).toString("base64url");
}
function hashToken(raw) {
  return crypto.createHash(SECURITY.hashAlgorithm).update(raw, "utf8").digest("hex");
}
function hoursFromNow(h) {
  return new Date(Date.now() + h * 3_600_000).toISOString();
}
function daysFromNow(d) {
  return new Date(Date.now() + d * 86_400_000).toISOString();
}
function isExpired(iso) {
  return new Date(iso) <= new Date();
}
async function audit(event_type, fields = {}) {
  await dbRun(
    `INSERT INTO AuditLog
       (event_type, token_hash, room_number, hotel_id, reservation_id, staff_id, actor_ip, details)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      event_type,
      fields.token_hash      ?? null,
      fields.room_number     ?? null,
      fields.hotel_id        ?? null,
      fields.reservation_id  ?? null,
      fields.staff_id        ?? null,
      fields.actor_ip        ?? null,
      fields.details ? JSON.stringify(fields.details) : null,
    ]
  );
}

/**
 * issueToken — ONE TOKEN PER RESERVATION
 *
 * If an active, non-expired token already exists for this reservation_id,
 * the SAME raw token cannot be re-derived (it was never stored), so we
 * return the existing token_hash and a flag indicating it was reused.
 * The caller (guest app) already holds the raw token from the first issuance.
 *
 * If no token exists, or it has expired, a fresh one is created.
 */
async function issueToken({ room_id, reservation_id, expires_in_hours, actorIp }) {
  const room = await dbGet("SELECT * FROM Rooms WHERE id = ?", [room_id]);
  if (!room) throw Object.assign(new Error("Room not found"), { status: 404 });

  // Check for an existing active token for this reservation
  if (reservation_id) {
    const existing = await dbGet(
      `SELECT * FROM ActiveTokens
       WHERE reservation_id = ? AND expires_at > strftime('%Y-%m-%dT%H:%M:%fZ','now')`,
      [reservation_id]
    );
    if (existing) {
      // Token already exists and is still valid — do NOT create a duplicate
      await audit("token_reused", {
        token_hash:    existing.token_hash,
        room_number:   existing.room_number,
        hotel_id:      room.hotel_id,
        reservation_id,
        actor_ip:      actorIp,
        details:       { reason: "existing_active_token_returned" },
      });
      return {
        raw_token:  null, // raw token was issued once; guest app already has it
        token_hash: existing.token_hash,
        room,
        expires_at: existing.expires_at,
        id:         existing.id,
        reused:     true,
      };
    }
  }

  // No active token — create a new one
  const raw       = generateRawToken();
  const tokenHash = hashToken(raw);
  const expiresAt = hoursFromNow(expires_in_hours ?? SECURITY.tokenTTLHours);

  const info = await dbRun(
    `INSERT INTO ActiveTokens
       (room_id, reservation_id, room_number, token_hash, ip_address, expires_at)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [room_id, reservation_id ?? null, room.room_number, tokenHash, actorIp ?? null, expiresAt]
  );

  await audit("token_issued", {
    token_hash:    tokenHash,
    room_number:   room.room_number,
    hotel_id:      room.hotel_id,
    reservation_id: reservation_id ?? null,
    actor_ip:      actorIp,
  });

  return { raw_token: raw, token_hash: tokenHash, room, expires_at: expiresAt, id: info.lastID, reused: false };
}

const wrap = fn => (req, res, next) => fn(req, res, next).catch(next);

// ═══════════════════════════════════════════════════════════════════════════════
// HOTELS
// ═══════════════════════════════════════════════════════════════════════════════
app.post(`${SERVER.apiPrefix}/hotels`, wrap(async (req, res) => {
  const { name, address, city, country } = req.body;
  if (!name) return res.status(400).json({ error: "name is required" });
  const api_key = crypto.randomBytes(24).toString("base64url");
  const info = await dbRun(
    "INSERT INTO Hotels (name, address, city, country, api_key) VALUES (?, ?, ?, ?, ?)",
    [name, address ?? null, city ?? null, country ?? null, api_key]
  );
  res.status(201).json({ id: info.lastID, name, api_key });
}));

app.get(`${SERVER.apiPrefix}/hotels`, wrap(async (_req, res) => {
  res.json(await dbAll("SELECT * FROM Hotels"));
}));

app.get(`${SERVER.apiPrefix}/hotels/:id`, wrap(async (req, res) => {
  const hotel = await dbGet("SELECT * FROM Hotels WHERE id = ?", [req.params.id]);
  if (!hotel) return res.status(404).json({ error: "Hotel not found" });
  res.json(hotel);
}));

// ═══════════════════════════════════════════════════════════════════════════════
// ROOMS
// ═══════════════════════════════════════════════════════════════════════════════
app.post(`${SERVER.apiPrefix}/hotels/:hotel_id/rooms`, wrap(async (req, res) => {
  const { room_number, floor, room_type } = req.body;
  if (!room_number) return res.status(400).json({ error: "room_number is required" });
  const hotel = await dbGet("SELECT id FROM Hotels WHERE id = ?", [req.params.hotel_id]);
  if (!hotel) return res.status(404).json({ error: "Hotel not found" });
  try {
    const info = await dbRun(
      "INSERT INTO Rooms (hotel_id, room_number, floor, room_type) VALUES (?, ?, ?, ?)",
      [req.params.hotel_id, room_number, floor ?? null, room_type ?? null]
    );
    res.status(201).json({ id: info.lastID, room_number });
  } catch (err) {
    if (err.message.includes("UNIQUE"))
      return res.status(409).json({ error: "Room number already exists in this hotel" });
    throw err;
  }
}));

app.get(`${SERVER.apiPrefix}/hotels/:hotel_id/rooms`, wrap(async (req, res) => {
  res.json(await dbAll("SELECT * FROM Rooms WHERE hotel_id = ?", [req.params.hotel_id]));
}));

// ═══════════════════════════════════════════════════════════════════════════════
// RESERVATIONS
// ═══════════════════════════════════════════════════════════════════════════════
app.post(`${SERVER.apiPrefix}/reservations`, wrap(async (req, res) => {
  const { hotel_id, room_id, guest_name, guest_email, check_in, check_out } = req.body;
  if (!hotel_id || !room_id || !guest_name || !check_in || !check_out)
    return res.status(400).json({ error: "hotel_id, room_id, guest_name, check_in, check_out are required" });
  const info = await dbRun(
    `INSERT INTO Reservations (hotel_id, room_id, guest_name, guest_email, check_in, check_out, pms_source)
     VALUES (?, ?, ?, ?, ?, ?, 'manual')`,
    [hotel_id, room_id, guest_name, guest_email ?? null, check_in, check_out]
  );
  res.status(201).json({ id: info.lastID, guest_name, check_in, check_out });
}));

app.get(`${SERVER.apiPrefix}/reservations`, wrap(async (req, res) => {
  const conditions = ["1=1"];
  const params = [];
  if (req.query.hotel_id) { conditions.push("hotel_id = ?"); params.push(req.query.hotel_id); }
  if (req.query.room_id)  { conditions.push("room_id = ?");  params.push(req.query.room_id); }
  res.json(await dbAll(
    `SELECT * FROM Reservations WHERE ${conditions.join(" AND ")} ORDER BY check_in DESC`, params
  ));
}));

app.patch(`${SERVER.apiPrefix}/reservations/:id/status`, wrap(async (req, res) => {
  const valid = ["confirmed", "checked_in", "checked_out", "cancelled"];
  const { status } = req.body;
  if (!valid.includes(status))
    return res.status(400).json({ error: `status must be one of: ${valid.join(", ")}` });
  const info = await dbRun(
    "UPDATE Reservations SET status = ?, updated_at = strftime('%Y-%m-%dT%H:%M:%fZ','now') WHERE id = ?",
    [status, req.params.id]
  );
  if (info.changes === 0) return res.status(404).json({ error: "Reservation not found" });
  res.json({ updated: true, status });
}));

// ═══════════════════════════════════════════════════════════════════════════════
// GUEST TOKENS
// ═══════════════════════════════════════════════════════════════════════════════

// Issue (or retrieve existing) guest token
app.post(`${SERVER.apiPrefix}/tokens/issue`, wrap(async (req, res) => {
  const { room_id, reservation_id, expires_in_hours } = req.body;
  if (!room_id) return res.status(400).json({ error: "room_id is required" });
  const result = await issueToken({ room_id, reservation_id, expires_in_hours, actorIp: req.clientIp });

  if (result.reused) {
    // Token already existed — raw token was already delivered at first issuance.
    // We return the hash and expiry so the caller knows the token is still valid.
    return res.status(200).json({
      id:          result.id,
      raw_token:   null,
      token_hash:  result.token_hash,
      room_number: result.room.room_number,
      expires_at:  result.expires_at,
      reused:      true,
      note: "An active token already exists for this reservation. The guest app already holds the raw token.",
    });
  }

  res.status(201).json({
    id:          result.id,
    raw_token:   result.raw_token,
    token_hash:  result.token_hash,
    room_number: result.room.room_number,
    expires_at:  result.expires_at,
    reused:      false,
    note: "Save raw_token — it will not be shown again.",
  });
}));

/**
 * POST /api/v1/tokens/verify
 * Called by the door lock hardware/app when a guest taps their phone.
 * Accepts the raw guest token OR a master key raw token.
 *
 * Body: { token: "<raw>", room_number: "101" }
 * Returns: { granted: true/false, key_type: "guest"|"master", ... }
 */
app.post(`${SERVER.apiPrefix}/tokens/verify`, wrap(async (req, res) => {
  const { token, room_number } = req.body ?? {};
  if (!token || !room_number)
    return res.status(400).json({ granted: false, reason: "token and room_number are required" });

  const incomingHash = hashToken(token);

  // ── Check guest token first ──────────────────────────────────────────────────
  const guestRecord = await dbGet(
    "SELECT * FROM ActiveTokens WHERE token_hash = ?", [incomingHash]
  );

  if (guestRecord) {
    if (guestRecord.room_number !== room_number) {
      await audit("verify_denied", { room_number, actor_ip: req.clientIp, details: { reason: "room_mismatch", key_type: "guest" } });
      return res.status(403).json({ granted: false, reason: "Room number mismatch" });
    }
    if (isExpired(guestRecord.expires_at)) {
      await dbRun("DELETE FROM ActiveTokens WHERE id = ?", [guestRecord.id]);
      await audit("verify_denied", { room_number, actor_ip: req.clientIp, details: { reason: "token_expired", key_type: "guest" } });
      return res.status(403).json({ granted: false, reason: "Token expired" });
    }
    // Constant-time comparison
    const storedBuf   = Buffer.from(guestRecord.token_hash, "hex");
    const incomingBuf = Buffer.from(incomingHash, "hex");
    if (storedBuf.length !== incomingBuf.length || !crypto.timingSafeEqual(storedBuf, incomingBuf)) {
      await audit("verify_denied", { room_number, actor_ip: req.clientIp, details: { reason: "hash_mismatch", key_type: "guest" } });
      return res.status(403).json({ granted: false, reason: "Invalid token" });
    }
    // Update verification timestamp
    await dbRun(
      `UPDATE ActiveTokens SET ip_address = ?, last_verified_at = strftime('%Y-%m-%dT%H:%M:%fZ','now'),
       updated_at = strftime('%Y-%m-%dT%H:%M:%fZ','now') WHERE id = ?`,
      [req.clientIp, guestRecord.id]
    );
    await audit("verify_granted", {
      token_hash: guestRecord.token_hash, room_number,
      reservation_id: guestRecord.reservation_id, actor_ip: req.clientIp,
      details: { key_type: "guest" },
    });
    console.log(`${TAG} GRANTED (guest key) — room ${room_number} from ${req.clientIp}`);
    return res.json({ granted: true, key_type: "guest", room_number, expires_at: guestRecord.expires_at });
  }

  // ── Check master key ─────────────────────────────────────────────────────────
  const masterRecord = await dbGet(
    "SELECT mk.*, sm.name AS staff_name, sm.role AS staff_role FROM MasterKeys mk LEFT JOIN StaffMembers sm ON sm.id = mk.staff_id WHERE mk.token_hash = ? AND mk.is_active = 1",
    [incomingHash]
  );

  if (masterRecord) {
    if (isExpired(masterRecord.expires_at)) {
      await dbRun("UPDATE MasterKeys SET is_active = 0 WHERE id = ?", [masterRecord.id]);
      await audit("verify_denied", { room_number, actor_ip: req.clientIp, staff_id: masterRecord.staff_id, details: { reason: "master_key_expired" } });
      return res.status(403).json({ granted: false, reason: "Master key expired" });
    }
    // Check floor restriction if set
    if (masterRecord.floors_allowed) {
      const room = await dbGet(
        "SELECT floor FROM Rooms WHERE room_number = ? AND hotel_id = ?",
        [room_number, masterRecord.hotel_id]
      );
      if (room) {
        const allowedFloors = JSON.parse(masterRecord.floors_allowed);
        if (!allowedFloors.includes(room.floor)) {
          await audit("verify_denied", { room_number, actor_ip: req.clientIp, staff_id: masterRecord.staff_id, details: { reason: "floor_not_allowed", floor: room.floor } });
          return res.status(403).json({ granted: false, reason: "Master key not authorised for this floor" });
        }
      }
    }
    // Update last used
    await dbRun(
      "UPDATE MasterKeys SET last_used_at = strftime('%Y-%m-%dT%H:%M:%fZ','now'), updated_at = strftime('%Y-%m-%dT%H:%M:%fZ','now') WHERE id = ?",
      [masterRecord.id]
    );
    await audit("verify_granted", {
      token_hash: masterRecord.token_hash, room_number,
      hotel_id: masterRecord.hotel_id, staff_id: masterRecord.staff_id,
      actor_ip: req.clientIp,
      details: { key_type: "master", staff_name: masterRecord.staff_name, staff_role: masterRecord.staff_role },
    });
    console.log(`${TAG} GRANTED (master key) — room ${room_number}, staff: ${masterRecord.staff_name} [${masterRecord.staff_role}]`);
    return res.json({
      granted:    true,
      key_type:   "master",
      room_number,
      staff_name: masterRecord.staff_name,
      staff_role: masterRecord.staff_role,
      expires_at: masterRecord.expires_at,
    });
  }

  // Neither guest nor master key found
  await audit("verify_denied", { room_number, actor_ip: req.clientIp, details: { reason: "token_not_found" } });
  return res.status(403).json({ granted: false, reason: "Token not found" });
}));

// Revoke a guest token by hash
app.delete(`${SERVER.apiPrefix}/tokens/:hash`, wrap(async (req, res) => {
  const record = await dbGet("SELECT * FROM ActiveTokens WHERE token_hash = ?", [req.params.hash]);
  if (!record) return res.status(404).json({ error: "Token not found" });
  await dbRun("DELETE FROM ActiveTokens WHERE id = ?", [record.id]);
  await audit("token_revoked", { token_hash: record.token_hash, room_number: record.room_number, actor_ip: req.clientIp });
  res.json({ revoked: true });
}));

// List all active guest tokens
app.get(`${SERVER.apiPrefix}/tokens`, wrap(async (_req, res) => {
  res.json(await dbAll(`
    SELECT id, room_id, reservation_id, room_number,
           substr(token_hash,1,8)||'...'||substr(token_hash,-8) AS token_hash_preview,
           ip_address, expires_at, last_verified_at, created_at
    FROM ActiveTokens
    WHERE expires_at > strftime('%Y-%m-%dT%H:%M:%fZ','now')
    ORDER BY expires_at
  `));
}));

// ═══════════════════════════════════════════════════════════════════════════════
// STAFF MEMBERS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * POST /api/v1/hotels/:hotel_id/staff
 * Add a staff member to the hotel.
 * Body: { name, role, email }
 * role must be: housekeeping | maintenance | front_desk | manager
 */
app.post(`${SERVER.apiPrefix}/hotels/:hotel_id/staff`, wrap(async (req, res) => {
  const { name, role, email } = req.body;
  const validRoles = ["housekeeping", "maintenance", "front_desk", "manager"];
  if (!name || !role) return res.status(400).json({ error: "name and role are required" });
  if (!validRoles.includes(role)) return res.status(400).json({ error: `role must be one of: ${validRoles.join(", ")}` });
  const hotel = await dbGet("SELECT id FROM Hotels WHERE id = ?", [req.params.hotel_id]);
  if (!hotel) return res.status(404).json({ error: "Hotel not found" });
  const info = await dbRun(
    "INSERT INTO StaffMembers (hotel_id, name, role, email) VALUES (?, ?, ?, ?)",
    [req.params.hotel_id, name, role, email ?? null]
  );
  res.status(201).json({ id: info.lastID, name, role });
}));

// List staff at a hotel
app.get(`${SERVER.apiPrefix}/hotels/:hotel_id/staff`, wrap(async (req, res) => {
  res.json(await dbAll(
    "SELECT id, name, role, email, is_active, created_at FROM StaffMembers WHERE hotel_id = ? ORDER BY role, name",
    [req.params.hotel_id]
  ));
}));

// Deactivate a staff member (does NOT delete — preserves audit history)
app.patch(`${SERVER.apiPrefix}/staff/:id/deactivate`, wrap(async (req, res) => {
  const info = await dbRun(
    "UPDATE StaffMembers SET is_active = 0, updated_at = strftime('%Y-%m-%dT%H:%M:%fZ','now') WHERE id = ?",
    [req.params.id]
  );
  if (info.changes === 0) return res.status(404).json({ error: "Staff member not found" });
  res.json({ deactivated: true });
}));

// ═══════════════════════════════════════════════════════════════════════════════
// MASTER KEYS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * POST /api/v1/hotels/:hotel_id/master-keys
 * Issue a master key card for a staff member.
 *
 * Body: {
 *   staff_id: 3,             — links to StaffMembers.id (required)
 *   label: "Housekeeping 2", — human-readable name shown in the dashboard
 *   expires_in_days: 90,     — default 90 days
 *   floors_allowed: [1,2,3]  — omit or null = access to ALL floors/rooms
 * }
 *
 * Returns raw_token ONCE — this is the token loaded onto the staff member's
 * Tapd app or NFC card. It is never stored in plaintext.
 *
 * PHYSICAL CARD NOTE:
 * Master keys do NOT need to be physical. The Tapd staff app holds the token
 * in the same way a guest app does. However if the hotel prefers a physical
 * NFC card (e.g. for housekeeping staff without smartphones), an NFC card can
 * be provisioned with the raw_token at the time of issuance. The card itself
 * is then the physical master key. This is a hardware provisioning step done
 * at the hotel — Tapd's backend does not change either way.
 */
app.post(`${SERVER.apiPrefix}/hotels/:hotel_id/master-keys`, wrap(async (req, res) => {
  const { staff_id, label, expires_in_days, floors_allowed } = req.body;
  if (!staff_id || !label) return res.status(400).json({ error: "staff_id and label are required" });

  const hotel = await dbGet("SELECT id FROM Hotels WHERE id = ?", [req.params.hotel_id]);
  if (!hotel) return res.status(404).json({ error: "Hotel not found" });

  const staff = await dbGet(
    "SELECT * FROM StaffMembers WHERE id = ? AND hotel_id = ? AND is_active = 1",
    [staff_id, req.params.hotel_id]
  );
  if (!staff) return res.status(404).json({ error: "Active staff member not found in this hotel" });

  // Validate floors_allowed if provided
  if (floors_allowed !== undefined && floors_allowed !== null) {
    if (!Array.isArray(floors_allowed) || !floors_allowed.every(f => Number.isInteger(f)))
      return res.status(400).json({ error: "floors_allowed must be an array of integers" });
  }

  const raw       = generateRawToken();
  const tokenHash = hashToken(raw);
  const expiresAt = daysFromNow(expires_in_days ?? 90);

  const info = await dbRun(
    `INSERT INTO MasterKeys (hotel_id, staff_id, label, token_hash, floors_allowed, expires_at)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [
      req.params.hotel_id,
      staff_id,
      label,
      tokenHash,
      floors_allowed ? JSON.stringify(floors_allowed) : null,
      expiresAt,
    ]
  );

  await audit("master_key_issued", {
    token_hash: tokenHash,
    hotel_id:   parseInt(req.params.hotel_id),
    staff_id,
    actor_ip:   req.clientIp,
    details:    { label, floors_allowed: floors_allowed ?? "all", expires_at: expiresAt },
  });

  console.log(`${TAG} Master key issued — staff: ${staff.name} [${staff.role}] label: "${label}"`);

  res.status(201).json({
    id:             info.lastID,
    raw_token:      raw,
    token_hash:     tokenHash,
    label,
    staff_name:     staff.name,
    staff_role:     staff.role,
    floors_allowed: floors_allowed ?? "all",
    expires_at:     expiresAt,
    note: "Load raw_token into the Tapd staff app or provision onto an NFC card. It will not be shown again.",
  });
}));

// List active master keys for a hotel
app.get(`${SERVER.apiPrefix}/hotels/:hotel_id/master-keys`, wrap(async (req, res) => {
  res.json(await dbAll(`
    SELECT mk.id, mk.label, mk.floors_allowed, mk.expires_at, mk.is_active, mk.last_used_at, mk.created_at,
           sm.name AS staff_name, sm.role AS staff_role,
           substr(mk.token_hash,1,8)||'...'||substr(mk.token_hash,-8) AS token_hash_preview
    FROM MasterKeys mk
    LEFT JOIN StaffMembers sm ON sm.id = mk.staff_id
    WHERE mk.hotel_id = ?
    ORDER BY mk.created_at DESC
  `, [req.params.hotel_id]));
}));

// Revoke a master key
app.delete(`${SERVER.apiPrefix}/master-keys/:id`, wrap(async (req, res) => {
  const key = await dbGet("SELECT * FROM MasterKeys WHERE id = ?", [req.params.id]);
  if (!key) return res.status(404).json({ error: "Master key not found" });
  await dbRun(
    "UPDATE MasterKeys SET is_active = 0, updated_at = strftime('%Y-%m-%dT%H:%M:%fZ','now') WHERE id = ?",
    [req.params.id]
  );
  await audit("master_key_revoked", {
    token_hash: key.token_hash, hotel_id: key.hotel_id,
    staff_id: key.staff_id, actor_ip: req.clientIp,
    details: { label: key.label },
  });
  res.json({ revoked: true, label: key.label });
}));

// ═══════════════════════════════════════════════════════════════════════════════
// PMS WEBHOOK
// ═══════════════════════════════════════════════════════════════════════════════
app.post(`${SERVER.apiPrefix}/pms/webhook`, wrap(async (req, res) => {
  const { event, event_id, source, reservation: r } = req.body ?? {};

  if (!PMS.supportedEvents.includes(event))
    return res.status(400).json({ error: `Unsupported event. Supported: ${PMS.supportedEvents.join(", ")}` });
  if (!r?.hotel_id || !r?.room_id)
    return res.status(400).json({ error: "reservation.hotel_id and reservation.room_id are required" });

  if (event_id) {
    const dupe = await dbGet("SELECT id FROM Reservations WHERE pms_event_id = ?", [event_id]);
    if (dupe) return res.json({ status: "duplicate_ignored", event_id });
  }

  const hotel = await dbGet("SELECT id FROM Hotels WHERE id = ?", [r.hotel_id]);
  if (!hotel) return res.status(404).json({ error: `Hotel ${r.hotel_id} not found` });
  const room  = await dbGet("SELECT * FROM Rooms WHERE id = ? AND hotel_id = ?", [r.room_id, r.hotel_id]);
  if (!room)  return res.status(404).json({ error: `Room ${r.room_id} not found` });

  if (event === "reservation.checked_in") {
    const existing = await dbGet(
      "SELECT id FROM Reservations WHERE room_id = ? AND status = 'confirmed'", [r.room_id]
    );
    let reservationId;
    if (existing) {
      await dbRun(
        "UPDATE Reservations SET status='checked_in', pms_source=?, pms_event_id=?, updated_at=strftime('%Y-%m-%dT%H:%M:%fZ','now') WHERE id=?",
        [source ?? null, event_id ?? null, existing.id]
      );
      reservationId = existing.id;
    } else {
      const info = await dbRun(
        `INSERT INTO Reservations (hotel_id, room_id, guest_name, guest_email, check_in, check_out, status, pms_source, pms_event_id)
         VALUES (?, ?, ?, ?, ?, ?, 'checked_in', ?, ?)`,
        [r.hotel_id, r.room_id, r.guest_name ?? "Unknown Guest", r.guest_email ?? null,
         r.check_in  ?? new Date().toISOString().slice(0,10),
         r.check_out ?? new Date(Date.now()+86_400_000).toISOString().slice(0,10),
         source ?? null, event_id ?? null]
      );
      reservationId = info.lastID;
    }

    // issueToken handles deduplication — returns existing token if one already exists
    const result = await issueToken({ room_id: r.room_id, reservation_id: reservationId, actorIp: req.clientIp });

    await audit("pms_webhook", {
      room_number: room.room_number, hotel_id: r.hotel_id,
      reservation_id: reservationId, actor_ip: req.clientIp,
      details: { event, source, event_id, reused: result.reused },
    });
    console.log(`${TAG} [pms] check-in — room ${room.room_number}, guest "${r.guest_name}", token_reused=${result.reused}`);

    return res.status(result.reused ? 200 : 201).json({
      status:         result.reused ? "existing_token_active" : "token_issued",
      event,
      reservation_id: reservationId,
      room_number:    room.room_number,
      raw_token:      result.raw_token, // null if reused
      expires_at:     result.expires_at,
      reused:         result.reused,
      note: result.reused
        ? "An active token already exists for this reservation. Guest app already holds the raw token."
        : "Deliver raw_token to the guest app. It is not stored and cannot be retrieved again.",
    });
  }

  if (event === "reservation.checked_out") {
    await dbRun(
      "UPDATE Reservations SET status='checked_out', pms_event_id=?, updated_at=strftime('%Y-%m-%dT%H:%M:%fZ','now') WHERE room_id=? AND status='checked_in'",
      [event_id ?? null, r.room_id]
    );
    const tokens = await dbAll("SELECT * FROM ActiveTokens WHERE room_id = ?", [r.room_id]);
    for (const t of tokens) {
      await dbRun("DELETE FROM ActiveTokens WHERE id = ?", [t.id]);
      await audit("token_revoked", { token_hash: t.token_hash, room_number: t.room_number, actor_ip: req.clientIp, details: { trigger: "pms_checkout" } });
    }
    console.log(`${TAG} [pms] check-out — room_id ${r.room_id}, ${tokens.length} token(s) revoked`);
    return res.json({ status: "tokens_revoked", count: tokens.length });
  }
}));

// ═══════════════════════════════════════════════════════════════════════════════
// AUDIT LOG
// ═══════════════════════════════════════════════════════════════════════════════

// All events (paginated)
app.get(`${SERVER.apiPrefix}/audit`, wrap(async (req, res) => {
  const limit = Math.min(parseInt(req.query.limit) || 100, 1000);
  res.json(await dbAll("SELECT * FROM AuditLog ORDER BY created_at DESC LIMIT ?", [limit]));
}));

// Events for a specific room — every door open, denial, revocation
app.get(`${SERVER.apiPrefix}/audit/room/:room_number`, wrap(async (req, res) => {
  const limit = Math.min(parseInt(req.query.limit) || 200, 1000);
  res.json(await dbAll(
    "SELECT * FROM AuditLog WHERE room_number = ? ORDER BY created_at DESC LIMIT ?",
    [req.params.room_number, limit]
  ));
}));

// Events for a whole hotel
app.get(`${SERVER.apiPrefix}/audit/hotel/:hotel_id`, wrap(async (req, res) => {
  const limit = Math.min(parseInt(req.query.limit) || 500, 2000);
  res.json(await dbAll(
    "SELECT * FROM AuditLog WHERE hotel_id = ? ORDER BY created_at DESC LIMIT ?",
    [req.params.hotel_id, limit]
  ));
}));

// ── HEALTH ────────────────────────────────────────────────────────────────────
app.get("/health", (_req, res) =>
  res.json({ status: "ok", brand: BRAND.name, version: BRAND.version, ts: new Date().toISOString() })
);

// ── Global error handler ──────────────────────────────────────────────────────
app.use((err, _req, res, _next) => {
  console.error(`${TAG} Error:`, err.message);
  res.status(err.status ?? 500).json({ error: err.message });
});

// ── START ─────────────────────────────────────────────────────────────────────
app.listen(SERVER.port, () => {
  console.log(`${TAG} ${BRAND.name} v${BRAND.version} running → http://localhost:${SERVER.port}`);
  console.log(`${TAG} Health check        → http://localhost:${SERVER.port}/health`);
  console.log(`${TAG} Guest tokens        → POST /api/v1/tokens/issue`);
  console.log(`${TAG} Token verify        → POST /api/v1/tokens/verify`);
  console.log(`${TAG} Staff master keys   → POST /api/v1/hotels/:id/master-keys`);
  console.log(`${TAG} Audit log           → GET  /api/v1/audit`);
});

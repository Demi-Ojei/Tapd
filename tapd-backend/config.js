"use strict";

// ─────────────────────────────────────────────────────────────
//  TAPD — Brand & Platform Configuration
//
//  To rebrand: edit BRAND.name and BRAND.slug.
//  Everything else in the app reads from these values.
// ─────────────────────────────────────────────────────────────

const BRAND = {
  name:    "Tapd",           // Display name used in logs and responses
  slug:    "tapd",           // Lowercase, no spaces — used for the DB filename
  version: "1.0.0",
};

const SERVER = {
  port:      process.env.PORT || 3000,
  apiPrefix: "/api/v1",
};

const SECURITY = {
  tokenBytes:    32,         // Raw entropy bytes before hashing
  hashAlgorithm: "sha256",   // Algorithm used to hash tokens
  tokenTTLHours: 24,         // Default token lifetime in hours
};

const PMS = {
  // In production, validate inbound webhooks using this shared HMAC secret.
  // For the prototype this check is skipped, but the variable is here ready to wire up.
  webhookSecret:   process.env.PMS_WEBHOOK_SECRET || "CHANGE_ME_IN_PRODUCTION",
  supportedEvents: ["reservation.checked_in", "reservation.checked_out"],
};

module.exports = { BRAND, SERVER, SECURITY, PMS };

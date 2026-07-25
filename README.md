# Tapd — Mobile App

React Native + Expo prototype for the Tapd digital hotel key platform.
Connects to the `tapd-backend` Express/SQLite server built earlier — no
mock data, every screen reads from real endpoints.

## Structure

```
tapd-app/
├── app/
│   ├── _layout.tsx              Root layout, route groups
│   ├── (guest)/
│   │   ├── index.tsx            Reservation + Unlock Room screen
│   │   └── how-it-works.tsx     Guided demo (locked-in plan item)
│   └── (admin)/
│       ├── index.tsx            Admin dashboard home
│       ├── login.tsx            Request-and-approve admin access
│       └── zones/new.tsx        Add Zone (guided setup step 1)
├── components/
│   ├── UnlockButton.tsx         Animated unlock interaction
│   └── ReservationCard.tsx      Wallet-style room key card
├── lib/
│   ├── api.ts                   Client for the real backend
│   ├── secureKeyStore.ts        SecureStore wrapper (Keychain/Keystore)
│   └── useUnlockDoor.ts         NFC unlock flow, isolated transport layer
└── constants/theme.ts           Navy/gold design tokens matching the website
```

## Why NFC, not Bluetooth

The original ESP32/BLE prototype was retired when physical hardware was
dropped from the project. The backend's `/tokens/verify` endpoint and the
whole security model (SHA-256 hashed tokens, PMS webhook issuance) is built
around the NFC-tap pattern used by Apple Wallet, Google Wallet, and real
commercial lock hardware (Assa Abloy, dormakaba, Salto). The unlock flow in
this app calls that same endpoint — it is not a simulation.

## Running locally

```bash
npm install
npx expo install   # syncs native module versions to your Expo SDK
npm start
```

Scan the QR code with Expo Go **for everything except NFC** — NFC requires
a custom dev client since it's a native module Expo Go doesn't include:

```bash
npx expo prebuild
npx expo run:ios       # or run:android
```

Set your backend URL before running:

```bash
EXPO_PUBLIC_API_BASE_URL=http://YOUR_LOCAL_IP:3000/api/v1 npm start
```

Use your computer's LAN IP, not `localhost` — a physical phone can't reach
your laptop's localhost over Expo Go.

## What's wired to the real backend vs. stubbed

**Real, hits actual endpoints:**
- Token verification (`POST /tokens/verify`) — the actual unlock call
- Reservation fetching (`GET /reservations`)
- Staff listing/creation (`GET`/`POST /hotels/:id/staff`)
- Master key listing/issuance (`GET`/`POST /hotels/:id/master-keys`)
- Audit log reads (`GET /audit/room/:room`, `GET /audit/hotel/:id`)

**Stubbed, waiting on planned backend additions:**
- Zones (`Zones` table doesn't exist yet — locked-in plan item)
- Admin approval requests (`AdminUsers` table doesn't exist yet)

These are marked with `TODO` comments at the exact line where the real
API call will go once those backend pieces are built.

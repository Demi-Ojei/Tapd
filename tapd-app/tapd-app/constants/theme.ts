/**
 * ─────────────────────────────────────────────────────────────
 *  TAPD — Design Tokens
 *  File: constants/theme.ts
 * ─────────────────────────────────────────────────────────────
 *  Single source of truth for colors, spacing, and typography.
 *  Mirrors the navy/gold palette used on the Tapd marketing site
 *  (tapd-site/index.html) so the app and web feel like one brand.
 * ─────────────────────────────────────────────────────────────
 */

export const colors = {
  // Core navy scale (background layers, darkest to lightest)
  navy: "#080C14",
  navy50: "#0D1525",
  navy100: "#111D30",
  navy200: "#1A2744",
  navy300: "#243558",

  // Gold accent scale
  gold: "#C9A96E",
  goldLight: "#DEC28A",
  goldDim: "#9A7D4F",

  // Warm text scale
  warm: "#E8E2D9",
  warmMuted: "#A09890",
  warmFaint: "#4A4540",

  // Semantic
  success: "#7FB069",
  successBg: "#16241099",
  danger: "#C97A7A",
  dangerBg: "#2A121299",
  warning: "#C9A96E",

  // Pure
  white: "#FFFFFF",
  black: "#000000",
  transparent: "transparent",
} as const;

export const gradients = {
  navyBg: [colors.navy, "#0A1628", colors.navy] as const,
  goldButton: [colors.gold, colors.goldDim] as const,
  cardSheen: ["rgba(201,169,110,0.08)", "rgba(201,169,110,0)"] as const,
};

export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
  xxxl: 64,
} as const;

export const radius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  pill: 999,
} as const;

export const typography = {
  // Display font for headings — pair with a serif like Cormorant Garamond if loaded
  displayFamily: "System",
  bodyFamily: "System",

  display: {
    fontSize: 32,
    fontWeight: "300" as const,
    letterSpacing: 0.2,
  },
  h1: {
    fontSize: 26,
    fontWeight: "300" as const,
    letterSpacing: 0.2,
  },
  h2: {
    fontSize: 20,
    fontWeight: "500" as const,
    letterSpacing: 0.1,
  },
  body: {
    fontSize: 15,
    fontWeight: "400" as const,
    lineHeight: 22,
  },
  bodySmall: {
    fontSize: 13,
    fontWeight: "400" as const,
    lineHeight: 19,
  },
  caption: {
    fontSize: 11,
    fontWeight: "500" as const,
    letterSpacing: 1.5,
    textTransform: "uppercase" as const,
  },
  mono: {
    fontSize: 13,
    fontFamily: "Courier",
  },
} as const;

export const shadows = {
  card: {
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 8,
  },
  goldGlow: {
    shadowColor: colors.gold,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.4,
    shadowRadius: 24,
    elevation: 12,
  },
} as const;

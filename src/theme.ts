// Akosian
// Copyright (C) 2026 Pranesh Shivaraj
//
// This program is free software: you can redistribute it and/or modify
// it under the terms of the GNU General Public License as published by
// the Free Software Foundation, either version 3 of the License, or
// (at your option) any later version.

export const colors = {
  // Warm editorial canvas + botanical ink — calm, premium, and easy to scan
  bg: "#F7F7F9",
  card: "#FFFFFF",
  border: "#E7E8EC",
  surfaceElevated: "#F0F1F4",
  cardBg: "#FFFFFF",
  // Bevel-inspired module surfaces: deep ink for primary signals, softer
  // tinted planes for secondary modules, and warm paper for the canvas.
  deep: "#FFFFFF",
  deepElevated: "#F0F1F4",
  deepMuted: "#9698A1",
  lime: "#E56F63",
  coral: "#E56F63",
  lilac: "#8A72C8",
  sky: "#5B7BE1",

  // Text
  ink: "#202126",
  body: "#666871",
  muted: "#9698A1",

  // Status accents — warm enough to feel human, restrained enough for health data
  success: "#55A477",
  warning: "#D69A43",
  danger: "#E56F63",
  info: "#5B7BE1",

  // Primary / interactive
  primary: "#202126",
  "primary-active": "#111216",
  "on-primary": "#FFFFFF",

  // Ring / gauge colors
  strain: "#C96D63",
  recovery: "#5D8793",
  sleep: "#6B83A5",
  stress: "#C68D46",
  energy: "#4B9678",

  // Tab bar
  tabBar: "#FFFFFF",
  tabBarInactive: "#9698A1",
  tabBarActive: "#202126",

  // Legacy aliases (kept so older screens don't break)
  canvas: "#F7F7F9",
  "surface-soft": "#F0F1F4",
  "surface-strong": "#E7E8EC",
  "surface-dark": "#F7F7F9",
  "surface-dark-elevated": "#FFFFFF",
  hairline: "#E7E8EC",
  "border-strong": "#9698A1",
  "signature-coral": "#E56F63",
  "signature-forest": "#202126",
  "signature-cream": "#F7F7F9",
  "signature-peach": "#F0B1A6",
  "signature-mint": "#A8C9B8",
  "signature-yellow": "#E8C66A",
  "signature-mustard": "#D69A43",
  link: "#202126",
};

export const typography = {
  displayXl: {
    fontSize: 40,
    letterSpacing: -1.2,
    fontFamily: "Nunito_700Bold",
    fontWeight: "700" as const,
  },
  displayLg: {
    fontSize: 34,
    letterSpacing: -1.05,
    fontFamily: "Nunito_700Bold",
    fontWeight: "700" as const,
  },
  displayMd: {
    fontSize: 26,
    letterSpacing: -0.5,
    fontFamily: "Nunito_700Bold",
    fontWeight: "700" as const,
  },
  titleLg: {
    fontSize: 19,
    letterSpacing: -0.3,
    fontFamily: "Nunito_600SemiBold",
    fontWeight: "600" as const,
  },
  titleMd: {
    fontSize: 16,
    letterSpacing: -0.1,
    fontFamily: "Nunito_600SemiBold",
    fontWeight: "600" as const,
  },
  titleSm: {
    fontSize: 14,
    letterSpacing: 0,
    fontFamily: "Nunito_600SemiBold",
    fontWeight: "600" as const,
  },
  labelMd: {
    fontSize: 13,
    letterSpacing: 0,
    fontFamily: "Nunito_600SemiBold",
    fontWeight: "600" as const,
  },
  button: {
    fontSize: 14,
    letterSpacing: 0,
    fontFamily: "Nunito_600SemiBold",
    fontWeight: "600" as const,
  },
  bodyMd: {
    fontSize: 14,
    letterSpacing: 0,
    fontFamily: "Nunito_400Regular",
    fontWeight: "400" as const,
  },
  caption: {
    fontSize: 12,
    letterSpacing: 0.2,
    fontFamily: "Nunito_500Medium",
    fontWeight: "500" as const,
  },
  legal: {
    fontSize: 11,
    letterSpacing: 0,
    fontFamily: "Nunito_400Regular",
    fontWeight: "400" as const,
  },
  metricValue: {
    fontSize: 28,
    letterSpacing: -0.6,
    fontFamily: "Nunito_700Bold",
    fontWeight: "700" as const,
  },
};

export const spacing = {
  xxs: 4,
  xs: 8,
  sm: 12,
  md: 16,
  lg: 20,
  xl: 24,
  xxl: 32,
  xxxl: 48,
  section: 64,
};

export const radii = {
  xs: 5,
  sm: 10,
  md: 16,
  lg: 22,
  xl: 30,
  pill: 9999,
  full: 9999,
};

export const shadows = {
  card: {
    shadowColor: "#202126",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.055,
    shadowRadius: 12,
    elevation: 2,
  },
  cardSoft: {
    shadowColor: "#202126",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.035,
    shadowRadius: 7,
    elevation: 1,
  },
  elevated: {
    shadowColor: "#202126",
    shadowOffset: { width: 0, height: 7 },
    shadowOpacity: 0.14,
    shadowRadius: 18,
    elevation: 6,
  },
  header: {
    shadowColor: "#202126",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.035,
    shadowRadius: 6,
    elevation: 1,
  },
  module: {
    shadowColor: "#202126",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 20,
    elevation: 5,
  },
  darkModule: {
    shadowColor: "#202126",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.22,
    shadowRadius: 24,
    elevation: 7,
  },
};

export const theme = {
  colors,
  typography,
  spacing,
  radii,
  shadows,
};

/** Format a Date as "Today, July 15" or "Mon, July 14". */
export function formatFriendlyDate(d: Date = new Date()): string {
  const today = new Date();
  const isToday =
    d.getFullYear() === today.getFullYear() &&
    d.getMonth() === today.getMonth() &&
    d.getDate() === today.getDate();

  const month = d.toLocaleDateString("en-US", { month: "long" });
  const day = d.getDate();
  if (isToday) return `Today, ${month} ${day}`;
  const weekday = d.toLocaleDateString("en-US", { weekday: "short" });
  return `${weekday}, ${month} ${day}`;
}

export function formatMonthYear(d: Date = new Date()): string {
  return d.toLocaleDateString("en-US", { month: "short", year: "numeric" });
}

export function formatAsOf(d: Date = new Date()): string {
  return `As of ${d.toLocaleDateString("en-US", { month: "long", day: "numeric" })}`;
}

/**
 * Format a decimal-hours sleep duration as hours + minutes ("7h 24m")
 * instead of a decimal ("7.4h"). Rounds to the nearest minute.
 * Returns "—" for null/NaN.
 */
export function formatSleepDuration(
  hours: number | null | undefined
): string {
  if (hours == null || !Number.isFinite(hours)) return "—";
  const total = Math.max(0, Math.round(hours * 60));
  const h = Math.floor(total / 60);
  const m = total % 60;
  if (h <= 0) return `${m}m`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}m`;
}

function channel(hex: string, index: number): number {
  return parseInt(hex.slice(1 + index * 2, 3 + index * 2), 16);
}

/**
 * Composite a translucent tint over an opaque base and return the resulting
 * solid color — `solidTint(colors.sleep, "10")` is what `${colors.sleep}10`
 * actually looks like over the canvas.
 *
 * Needed because Android paints an elevated view's shadow *through* a
 * translucent background, so a tinted card with `theme.shadows.card` shows the
 * shadow as a smudge across its own surface (the sleep/strain hero cards). Use
 * this anywhere a tinted card also carries a shadow.
 *
 * `alphaSuffix` is the two hex digits you would have put in the color string.
 */
export function solidTint(hex: string, alphaSuffix: string, base: string = colors.bg): string {
  const alpha = parseInt(alphaSuffix, 16) / 255;
  return (
    "#" +
    [0, 1, 2]
      .map((i) => {
        const mixed = Math.round(channel(hex, i) * alpha + channel(base, i) * (1 - alpha));
        return mixed.toString(16).padStart(2, "0");
      })
      .join("")
  );
}

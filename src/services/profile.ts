// Myrri Health
// Copyright (C) 2026 Pranesh Shivaraj
//
// This program is free software: you can redistribute it and/or modify
// it under the terms of the GNU General Public License as published by
// the Free Software Foundation, either version 3 of the License, or
// (at your option) any later version.

import AsyncStorage from "@react-native-async-storage/async-storage";

const PROFILE_KEY = "health_profile";

export type BiologicalSex = "female" | "male" | "unspecified";

export interface HealthProfile {
  chronologicalAge: number;
  biologicalSex: BiologicalSex;
  /** Height in centimetres. Optional — asked at onboarding, editable later. */
  heightCm?: number | null;
  /** Body weight in kilograms. Optional — device/manual logs take precedence. */
  weightKg?: number | null;
}

export const HEIGHT_CM_MIN = 120;
export const HEIGHT_CM_MAX = 230;
export const WEIGHT_KG_MIN = 30;
export const WEIGHT_KG_MAX = 300;

export function sanitizeHeightCm(value: unknown): number | null {
  const num = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(num)) return null;
  const rounded = Math.round(num * 10) / 10;
  if (rounded < HEIGHT_CM_MIN || rounded > HEIGHT_CM_MAX) return null;
  return rounded;
}

export function sanitizeWeightKg(value: unknown): number | null {
  const num = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(num)) return null;
  const rounded = Math.round(num * 10) / 10;
  if (rounded < WEIGHT_KG_MIN || rounded > WEIGHT_KG_MAX) return null;
  return rounded;
}

export async function getHealthProfile(): Promise<HealthProfile | null> {
  try {
    const raw = await AsyncStorage.getItem(PROFILE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<HealthProfile>;
    if (
      typeof parsed.chronologicalAge !== "number" ||
      !Number.isFinite(parsed.chronologicalAge) ||
      parsed.chronologicalAge < 18 ||
      parsed.chronologicalAge > 100
    ) {
      return null;
    }
    const biologicalSex: BiologicalSex =
      parsed.biologicalSex === "female" || parsed.biologicalSex === "male"
        ? parsed.biologicalSex
        : "unspecified";
    // Older installs stored age + sex only — height/weight stay empty.
    const heightCm = sanitizeHeightCm(parsed.heightCm);
    const weightKg = sanitizeWeightKg(parsed.weightKg);
    return { chronologicalAge: parsed.chronologicalAge, biologicalSex, heightCm, weightKg };
  } catch {
    return null;
  }
}

export async function saveHealthProfile(profile: HealthProfile): Promise<void> {
  await AsyncStorage.setItem(
    PROFILE_KEY,
    JSON.stringify({
      chronologicalAge: profile.chronologicalAge,
      biologicalSex: profile.biologicalSex,
      heightCm: sanitizeHeightCm(profile.heightCm),
      weightKg: sanitizeWeightKg(profile.weightKg),
    })
  );
}

/** Merges a partial update into the stored profile (no-op when none exists). */
export async function patchHealthProfile(
  partial: Partial<Pick<HealthProfile, "chronologicalAge" | "biologicalSex" | "heightCm" | "weightKg">>
): Promise<HealthProfile | null> {
  const current = await getHealthProfile();
  if (!current) return null;
  const updated: HealthProfile = { ...current };
  if (partial.chronologicalAge != null) updated.chronologicalAge = partial.chronologicalAge;
  if (partial.biologicalSex != null) updated.biologicalSex = partial.biologicalSex;
  if (partial.heightCm !== undefined) updated.heightCm = sanitizeHeightCm(partial.heightCm);
  if (partial.weightKg !== undefined) updated.weightKg = sanitizeWeightKg(partial.weightKg);
  await saveHealthProfile(updated);
  return updated;
}

/** Body-mass index from weight (kg) and height (cm). Null when either is missing. */
export function calculateBmi(
  weightKg: number | null | undefined,
  heightCm: number | null | undefined
): number | null {
  if (
    weightKg == null ||
    heightCm == null ||
    !Number.isFinite(weightKg) ||
    !Number.isFinite(heightCm) ||
    weightKg <= 0 ||
    heightCm <= 0
  ) {
    return null;
  }
  const bmi = weightKg / ((heightCm / 100) ** 2);
  if (!Number.isFinite(bmi)) return null;
  return Math.round(bmi * 10) / 10;
}

/** Short "72 kg · 178 cm" style summary for settings rows. Null when empty. */
export function formatProfileBodySummary(profile: HealthProfile): string | null {
  const parts: string[] = [];
  if (profile.weightKg != null) parts.push(`${profile.weightKg} kg`);
  if (profile.heightCm != null) parts.push(`${profile.heightCm} cm`);
  return parts.length ? parts.join(" · ") : null;
}

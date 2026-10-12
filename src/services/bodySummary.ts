// Myrri Health
// Copyright (C) 2026 Pranesh Shivaraj
//
// This program is free software: you can redistribute it and/or modify
// it under the terms of the GNU General Public License as published by
// the Free Software Foundation, either version 3 of the License, or
// (at your option) any later version.

/**
 * Merged body metrics for the coach: wearable data first, then manual logs,
 * then the onboarding profile — so the AI can personalize (protein per kg,
 * calorie plausibility, BMI) even with no device connected.
 */

import { HealthService } from "./health";
import { getLatestManualValue } from "./manualMetrics";
import { calculateBmi, getHealthProfile } from "./profile";

export type BodyValueSource = "device" | "manual" | "profile" | null;

export interface BodySummary {
  weightKg: number | null;
  weightSource: BodyValueSource;
  weightDate?: string;
  heightCm: number | null;
  heightSource: BodyValueSource;
  bodyFatPercent: number | null;
  leanBodyMassKg: number | null;
  vo2Max: number | null;
  /** Rounded to 1 dp when weight + height are both known. */
  bmi: number | null;
}

export async function getBodySummary(): Promise<BodySummary> {
  let weightKg: number | null = null;
  let weightSource: BodyValueSource = null;
  let weightDate: string | undefined;
  let heightCm: number | null = null;
  let heightSource: BodyValueSource = null;
  let bodyFatPercent: number | null = null;
  let leanBodyMassKg: number | null = null;
  let vo2Max: number | null = null;

  try {
    await HealthService.initialize(false);
    const data = await HealthService.getTodayData();
    if (data.weight != null && data.weight > 0) {
      weightKg = data.weight;
      weightSource = "device";
    }
    if (data.height != null && data.height > 0) {
      heightCm = data.height;
      heightSource = "device";
    }
    bodyFatPercent = data.bodyFat;
    leanBodyMassKg = data.leanBodyMass;
    vo2Max = data.vo2Max;
  } catch {
    // Device data is optional — manual logs and profile fill the gaps.
  }

  if (
    weightKg == null ||
    bodyFatPercent == null ||
    leanBodyMassKg == null ||
    vo2Max == null
  ) {
    try {
      const [manualWeight, manualFat, manualLean, manualVo2] = await Promise.all([
        getLatestManualValue("weight"),
        getLatestManualValue("bodyFat"),
        getLatestManualValue("leanBodyMass"),
        getLatestManualValue("vo2Max"),
      ]);
      if (weightKg == null && manualWeight) {
        weightKg = manualWeight.value;
        weightSource = "manual";
        weightDate = manualWeight.date;
      }
      if (bodyFatPercent == null && manualFat) bodyFatPercent = manualFat.value;
      if (leanBodyMassKg == null && manualLean) leanBodyMassKg = manualLean.value;
      if (vo2Max == null && manualVo2) vo2Max = manualVo2.value;
    } catch {
      // Manual logs are optional too.
    }
  }

  if (weightKg == null || heightCm == null) {
    try {
      const profile = await getHealthProfile();
      if (weightKg == null && profile?.weightKg != null) {
        weightKg = profile.weightKg;
        weightSource = "profile";
      }
      if (heightCm == null && profile?.heightCm != null) {
        heightCm = profile.heightCm;
        heightSource = "profile";
      }
    } catch {
      // Profile is optional too.
    }
  }

  return {
    weightKg,
    weightSource,
    weightDate,
    heightCm,
    heightSource,
    bodyFatPercent,
    leanBodyMassKg,
    vo2Max,
    bmi: calculateBmi(weightKg, heightCm),
  };
}

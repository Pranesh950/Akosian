// Myrri Health
// Copyright (C) 2026 Pranesh Shivaraj
//
// This program is free software: you can redistribute it and/or modify
// it under the terms of the GNU General Public License as published by
// the Free Software Foundation, either version 3 of the License, or
// (at your option) any later version.

import AsyncStorage from "@react-native-async-storage/async-storage";
import { MetricSample } from "./health";

export type ManualMetric =
  | "weight"
  | "leanBodyMass"
  | "bodyFat"
  | "bloodOxygen"
  | "vo2Max"
  | "restingHeartRate"
  | "heartRateVariability";

const KEY = "manual_metrics_v1";

type Store = Partial<Record<ManualMetric, Record<string, number>>>;

async function readStore(): Promise<Store> {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as Store) : {};
  } catch {
    return {};
  }
}

function todayKey(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export async function setManualMetric(
  metric: ManualMetric,
  value: number,
  date = todayKey()
): Promise<void> {
  const store = await readStore();
  store[metric] = { ...(store[metric] ?? {}), [date]: value };
  await AsyncStorage.setItem(KEY, JSON.stringify(store));
}

export async function getManualSamples(metric: ManualMetric): Promise<MetricSample[]> {
  const store = await readStore();
  return Object.entries(store[metric] ?? {})
    .map(([date, value]) => ({ date, value }))
    .sort((a, b) => a.date.localeCompare(b.date));
}

export async function getManualValueToday(
  metric: ManualMetric
): Promise<number | null> {
  return getManualValueForDate(metric, todayKey());
}

export async function getManualValueForDate(
  metric: ManualMetric,
  dateKey: string
): Promise<number | null> {
  const store = await readStore();
  const v = store[metric]?.[dateKey];
  return typeof v === "number" && Number.isFinite(v) ? v : null;
}

/** Latest logged value on or before the given date (defaults to today). */
export async function getLatestManualValue(
  metric: ManualMetric,
  beforeOrOn: string = todayKey()
): Promise<{ date: string; value: number } | null> {
  const samples = await getManualSamples(metric);
  const eligible = samples.filter(
    (s) => s.date <= beforeOrOn && Number.isFinite(s.value)
  );
  if (!eligible.length) return null;
  const last = eligible[eligible.length - 1];
  return { date: last.date, value: last.value };
}

/** Merge manual samples into native history; manual wins on the same day. */
export function mergeSamples(
  native: MetricSample[],
  manual: MetricSample[]
): MetricSample[] {
  const map = new Map<string, number>();
  for (const s of native) map.set(s.date, s.value);
  for (const s of manual) map.set(s.date, s.value);
  return Array.from(map.entries())
    .map(([date, value]) => ({ date, value }))
    .sort((a, b) => a.date.localeCompare(b.date));
}

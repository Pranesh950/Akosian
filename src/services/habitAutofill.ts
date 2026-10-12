// Myrri Health
// Copyright (C) 2026 Pranesh Shivaraj
//
// This program is free software: you can redistribute it and/or modify
// it under the terms of the GNU General Public License as published by
// the Free Software Foundation, either version 3 of the License, or
// (at your option) any later version.

// Auto-fills journal habits from data already logged elsewhere in the app
// (food log, workouts, sleep, weight, hydration). Habits with no source data
// are left blank. A value the user entered by hand always wins over a
// derived one.

import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  HabitLog,
  getHabitLog,
  saveHabitLog,
} from "./journal";
import { getMeals } from "./foodDatabase";
import { HealthService } from "./health";

/** Grams of protein counted as one "protein serving". */
export const PROTEIN_G_PER_SERVING = 25;
/** Grams of fiber counted as one "fiber serving". */
export const FIBER_G_PER_SERVING = 5;
/** A breakfast needs at least this much protein to count. */
const PROTEIN_BREAKFAST_MIN_G = 15;
/** Breakfast window ends at this hour (local time). */
const PROTEIN_BREAKFAST_END_HOUR = 11;
/** Minimum duration for a workout to count as a Zone 2 session. */
const ZONE2_MIN_DURATION_MIN = 20;

const SNAPSHOT_PREFIX = "habit_autofill_snapshot_";

type Snapshot = Record<string, number | boolean>;

async function getSnapshot(date: string): Promise<Snapshot> {
  try {
    const raw = await AsyncStorage.getItem(`${SNAPSHOT_PREFIX}${date}`);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" ? (parsed as Snapshot) : {};
  } catch {
    return {};
  }
}

async function saveSnapshot(date: string, snap: Snapshot): Promise<void> {
  try {
    await AsyncStorage.setItem(`${SNAPSHOT_PREFIX}${date}`, JSON.stringify(snap));
  } catch {
    // Best-effort; a missing snapshot just means the next load treats
    // existing values as manual, which is the safe direction.
  }
}

function sameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

function matchesName(w: { name: string; type: string }, re: RegExp): boolean {
  return re.test(w.name) || re.test(w.type);
}

/**
 * Derives habit values from logged data for a date. Keys absent from the
 * result mean "no data" — callers must leave those habits blank.
 */
export async function computeHabitAutofill(date: string): Promise<{
  counters: Record<string, number>;
  completed: Record<string, boolean>;
}> {
  const counters: Record<string, number> = {};
  const completed: Record<string, boolean> = {};
  const target = new Date(`${date}T00:00:00`);

  // ── Food log ──────────────────────────────────────────────
  try {
    const meals = await getMeals(date);
    if (meals.length > 0) {
      completed["food_log"] = true;

      const totalProtein = meals.reduce((s, m) => s + (m.protein || 0), 0);
      const proteinServings = Math.floor(totalProtein / PROTEIN_G_PER_SERVING);
      if (proteinServings > 0) counters["protein_goal"] = proteinServings;

      const totalFiber = meals.reduce((s, m) => s + (m.fiber || 0), 0);
      const fiberServings = Math.floor(totalFiber / FIBER_G_PER_SERVING);
      if (fiberServings > 0) counters["fiber_goal"] = fiberServings;

      const hadProteinBreakfast = meals.some((m) => {
        const t = new Date(m.timestamp);
        return (
          Number.isFinite(t.getTime()) &&
          sameDay(t, target) &&
          t.getHours() < PROTEIN_BREAKFAST_END_HOUR &&
          (m.protein || 0) >= PROTEIN_BREAKFAST_MIN_G
        );
      });
      if (hadProteinBreakfast) completed["protein_breakfast"] = true;
    }
  } catch {
    // Food fill is best-effort; never block the journal on it.
  }

  // ── Workouts + weight + sleep (health data) ───────────────
  try {
    const [workouts, weightHistory, sleepHistory] = await Promise.all([
      HealthService.getWorkouts(7).catch(() => []),
      HealthService.getMetricHistory("weight", 30).catch(() => []),
      HealthService.getSleepHistory(30).catch(() => []),
    ]);

    const dayWorkouts = workouts.filter(
      (w) => w.startTime instanceof Date && sameDay(w.startTime, target)
    );

    if (dayWorkouts.length > 0) {
      // "Gym / workout" counts any logged training session.
      completed["gym"] = true;

      const isRun = (w: (typeof dayWorkouts)[number]) =>
        w.exerciseType === 56 ||
        w.exerciseType === 57 ||
        matchesName(w, /run|jog/i);
      const runMeters = dayWorkouts
        .filter(isRun)
        .reduce((sum, w) => sum + (w.distance ?? 0), 0);
      if (runMeters > 0) {
        counters["run_km"] = Math.round((runMeters / 1000) * 10) / 10;
      }

      const isWalk = (w: (typeof dayWorkouts)[number]) =>
        w.exerciseType === 79 ||
        w.exerciseType === 37 ||
        matchesName(w, /walk|hik/i);
      if (dayWorkouts.some(isWalk)) counters["walk"] = 1;

      const isStretch = (w: (typeof dayWorkouts)[number]) =>
        w.exerciseType === 83 ||
        w.exerciseType === 48 ||
        matchesName(w, /yoga|pilates|stretch|mobility/i);
      if (dayWorkouts.some(isStretch)) completed["stretch"] = true;

      const looksZone2 = (w: (typeof dayWorkouts)[number]) => {
        if (w.durationMin < ZONE2_MIN_DURATION_MIN) return false;
        // Zone 2 sits roughly at 60–70% of max HR. Without a known max,
        // accept a plausible aerobic band and any session with no HR data.
        if (w.avgHeartRate == null) return true;
        return w.avgHeartRate >= 90 && w.avgHeartRate <= 155;
      };
      if (dayWorkouts.some(looksZone2)) completed["zone2"] = true;
    }

    const weight = weightHistory.find((s) => s.date === date);
    if (weight && weight.value > 0) {
      counters["weight_kg"] = Math.round(weight.value * 10) / 10;
    }

    const sleep = sleepHistory.find((s) => s.date === date);
    if (sleep && sleep.value > 0) {
      counters["sleep_hours"] = Math.round(sleep.value * 10) / 10;
    }
  } catch {
    // Health fill is best-effort; never block the journal on it.
  }

  return { counters, completed };
}

/**
 * Applies derived values to a day's habit log. Only blank habits — or
 * habits whose current value is still the last autofilled one — are
 * touched, so hand-entered values always win. Returns the (possibly
 * updated) log plus which habits were auto-filled (for the "auto" badge).
 */
export async function applyHabitAutofill(
  date: string,
  log: HabitLog
): Promise<{ log: HabitLog; auto: Record<string, boolean> }> {
  // Hydration lives on the same log, so the water counter can mirror it.
  const derived = await computeHabitAutofill(date);
  if (log.hydration > 0) {
    derived.counters["water_goal"] = Math.round(log.hydration);
  }

  const snapshot = await getSnapshot(date);
  const nextSnapshot: Snapshot = { ...derived.counters, ...derived.completed };
  const auto: Record<string, boolean> = {};
  let changed = false;

  const applyCounter = (id: string) => {
    const fresh = derived.counters[id];
    const prev = snapshot[id];
    const current = log.counters[id] ?? 0;
    const stillAuto = current === 0 || current === prev;
    if (stillAuto) {
      if (fresh != null && fresh > 0) {
        if (current !== fresh) {
          log.counters[id] = fresh;
          changed = true;
        }
        auto[id] = true;
      } else if (current !== 0) {
        delete log.counters[id];
        changed = true;
      }
    } else if (fresh != null && current === fresh) {
      auto[id] = true;
    }
  };

  const applyBinary = (id: string) => {
    const fresh = derived.completed[id];
    const prev = snapshot[id];
    const current = log.completed[id];
    const stillAuto = current === undefined || current === prev;
    if (stillAuto) {
      if (fresh === true) {
        if (current !== true) {
          log.completed[id] = true;
          changed = true;
        }
        auto[id] = true;
      } else if (current !== undefined) {
        delete log.completed[id];
        changed = true;
      }
    } else if (fresh === true && current === true) {
      auto[id] = true;
    }
  };

  for (const id of Object.keys(derived.counters)) applyCounter(id);
  for (const id of Object.keys(snapshot)) {
    if (typeof snapshot[id] === "number" && !(id in derived.counters)) {
      applyCounter(id);
    }
  }
  for (const id of Object.keys(derived.completed)) applyBinary(id);
  for (const id of Object.keys(snapshot)) {
    if (typeof snapshot[id] === "boolean" && !(id in derived.completed)) {
      applyBinary(id);
    }
  }

  if (changed) await saveHabitLog(log);
  await saveSnapshot(date, nextSnapshot);
  return { log, auto };
}

/** Convenience: loads the log, autofills it, and returns both. */
export async function getAutofilledHabitLog(
  date: string
): Promise<{ log: HabitLog; auto: Record<string, boolean> }> {
  const log = await getHabitLog(date);
  return applyHabitAutofill(date, log);
}

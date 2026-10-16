// Akosian
// Copyright (C) 2026 Pranesh Shivaraj
//
// This program is free software: you can redistribute it and/or modify
// it under the terms of the GNU General Public License as published by
// the Free Software Foundation, either version 3 of the License, or
// (at your option) any later version.

/**
 * Phase 2 of the AI-harness migration (see AI_CHAT_REBUILD_PLAN.md §5).
 *
 * The 13 health/coach tools currently declared in `app/health-chat.tsx`,
 * re-expressed as typed AI SDK `tool()`s with Zod `inputSchema`s. The handler
 * bodies are ported verbatim — they are the valuable, tested part — they just
 * return the payload object directly instead of a JSON string.
 *
 * Additive: nothing here runs until a screen points at `createHealthAgent()`.
 */

import { tool, type ToolSet } from "ai";
import { z } from "zod";
import {
  HealthService,
  computeStrainScore,
  computeSleepScore,
  type HealthConnectionStatus,
} from "../health";
import { formatSleepDuration } from "../../theme";
import { getBodySummary } from "../bodySummary";
import { getHabitLog, formatDateKey } from "../journal";
import {
  estimateServing,
  getFoodByFdcId,
  getMeals,
  logMeal,
  searchFood,
  getFoodDatabaseAttribution,
  type FoodItem,
  type MealEntry,
} from "../foodDatabase";
import { calculateReadiness } from "../readiness";
import { getReadinessHistory } from "../insights";
import { buildCoachChatToolHandlers } from "../coachPlan";

export const HEALTH_AGENT_ENABLED =
  process.env.EXPO_PUBLIC_AKOSIAN_HEALTH_AGENT === "1" ||
  process.env.EXPO_PUBLIC_MYRRI_HEALTH_AGENT === "1";

export const HEALTH_AGENT_INSTRUCTIONS = `You are a health coach AI. You have access to the user's health data through tools. ALWAYS call the right tool before answering — never make up numbers.

RULES:
- NEVER guess data. If the user asks about sleep, call get_sleep first. Steps? get_steps. Recovery? get_recovery.
- Every device-data tool result (steps, heart, workouts, trends, vitals, body, sleep, recovery) includes "healthStatus".
  "connected" = the numbers are real. "connected_no_data" or "access_requested" = permission exists but nothing has synced — say the connection is on but empty, and suggest checking the wearable sync. Any other value (needs_permission, not_connected, unavailable, error) = you do NOT have the user's health data: say so plainly, NEVER quote the zero/empty values as real measurements, and NEVER claim access you don't have. Tell the user to connect from Overview → Connect.
- get_journal "hasData": false means no entry that day. get_meals with count 0 means nothing logged — say so, don't claim otherwise.
- For body metrics, weightSource/heightSource say where each value came from (wearable, manual log, or profile) — cite the source when it matters.
- Pick the most specific tool. Don't call get_recovery if the user only asked about steps.
- For questions about trends or history, use period "week" or "month".
- For today's data use period "today" (or omit period).
- When the user asks to make, change, or personalise a plan: call get_goal_guidance (at least the "targets" chunk) for their goal(s), then update_plan with concrete numbers, then reply. Habit ids must be real ids from the goal guidance's habits list. Only change what the user asked to change.
- Connect dots between sleep, activity, nutrition, and vitals in your reply.
- Be warm, encouraging, concise (2-4 sentences). Mention actual numbers.
- Always state sleep durations in hours and minutes (e.g. 7h 24m, 8h) — never decimals like 7.4 hours. Quote the sleepDuration/duration fields verbatim.
- If data is missing, acknowledge it and suggest how to get it.
- FOOD LOGGING: you can log what the user ate. Search first (search_food), then log_meal
  with the fdcId from the search results and the serving in grams (1 egg ≈ 50g,
  1 banana ≈ 120g, 1 apple ≈ 180g, 1 slice bread ≈ 30g). For multi-food meals, search
  and log every ingredient. If the amount is vague, do NOT silently log an estimate —
  ask one brief clarifying question with your best guess as options, and log once
  confirmed. If search returns several plausible matches, ask which one. When you log
  with an estimated serving, state the assumption ("Logged as ~150g"). After logging,
  confirm briefly what was added. Use get_meals
  when the user asks what they ate. Never invent nutrition numbers — only log catalog rows
  returned by search_food.`;

let todaySnapshotCache: ReturnType<typeof HealthService.getTodayData> | null = null;

/** Clear the per-turn health snapshot. Call once per user message. */
export function resetHealthSnapshot(): void {
  todaySnapshotCache = null;
  healthAccessCache = null;
}

function getTodaySnapshot(): ReturnType<typeof HealthService.getTodayData> {
  if (!todaySnapshotCache) {
    todaySnapshotCache = (async () => {
      await HealthService.initialize(false);
      return HealthService.getTodayData();
    })().catch((e) => {
      // A rejected snapshot is never cached — a later tool in the same turn may retry.
      todaySnapshotCache = null;
      throw e;
    });
  }
  return todaySnapshotCache;
}

let healthAccessCache: Promise<HealthConnectionStatus> | null = null;

/**
 * Connection state for this turn, memoized like the snapshot. Without this the
 * model cannot tell "0 steps measured" from "never granted access" — an
 * unconnected device yields all-zero snapshots that read as real data.
 */
function getHealthAccess(): Promise<HealthConnectionStatus> {
  if (!healthAccessCache) {
    healthAccessCache = HealthService.getConnectionStatus().catch(() => {
      healthAccessCache = null;
      return "error" as HealthConnectionStatus;
    });
  }
  return healthAccessCache;
}

function resolvePeriod(raw?: unknown): { days: number; label: string; dateOffset: number } {
  const p = String(raw ?? "today").toLowerCase();
  if (p === "today") return { days: 1, label: "today", dateOffset: 0 };
  if (p === "yesterday") return { days: 1, label: "yesterday", dateOffset: -1 };
  if (p === "week") return { days: 7, label: "last 7 days", dateOffset: 0 };
  if (p === "month") return { days: 30, label: "last 30 days", dateOffset: 0 };
  const n = Number(raw);
  if (Number.isFinite(n) && n > 0) return { days: n, label: `last ${n} days`, dateOffset: 0 };
  return { days: 1, label: "today", dateOffset: 0 };
}

function resolveDate(raw?: unknown): string {
  const p = String(raw ?? "today").toLowerCase();
  if (p === "today") return formatDateKey(new Date());
  if (p === "yesterday") {
    const d = new Date();
    d.setDate(d.getDate() - 1);
    return formatDateKey(d);
  }
  if (/^\d{4}-\d{2}-\d{2}$/.test(p)) return p;
  return formatDateKey(new Date());
}

const periodSchema = z
  .enum(["today", "yesterday", "week", "month"])
  .optional()
  .describe("Time window for the metric. Defaults to today.");

const dateSchema = z
  .string()
  .optional()
  .describe("'today', 'yesterday', or a YYYY-MM-DD date.");

/** Whole calories, one decimal for macros — matches the food agent exactly. */
const round1 = (value: number) => Math.round(value * 10) / 10;

/** Per-100g catalog values scaled to a serving. */
function macrosFor(food: FoodItem, servingGrams: number) {
  const multiplier = servingGrams / 100;
  return {
    calories: Math.round(food.calories * multiplier),
    protein: round1(food.protein * multiplier),
    carbs: round1(food.carbs * multiplier),
    fat: round1(food.fat * multiplier),
    fiber: round1(food.fiber * multiplier),
  };
}

/**
 * Resolve a model-supplied reference to a real catalog row (id → name →
 * id-as-text). The caller sees which lookup matched, so a substitution is
 * never silent.
 */
async function resolveFood(
  fdcId: string,
  foodName: string
): Promise<{ food: FoodItem; matchedBy: "fdcId" | "foodName" | "fdcIdAsText" } | null> {
  if (fdcId) {
    const byId = await getFoodByFdcId(fdcId);
    if (byId) return { food: byId, matchedBy: "fdcId" };
  }
  if (foodName) {
    const results = await searchFood(foodName);
    if (results.length > 0) return { food: results[0], matchedBy: "foodName" };
  }
  if (fdcId) {
    const results = await searchFood(fdcId);
    if (results.length > 0) return { food: results[0], matchedBy: "fdcIdAsText" };
  }
  return null;
}

async function logFoodEntry(input: {
  fdcId?: string;
  foodName?: string;
  servingGrams?: number;
  calorieTarget?: number;
}) {
  const fdcId = input.fdcId ?? "";
  const foodName = input.foodName ?? "";
  const resolved = await resolveFood(fdcId, foodName);
  if (!resolved) {
    return { ok: false as const, error: `Food not found: ${foodName || fdcId}` };
  }

  const { food, matchedBy } = resolved;
  let servingGrams = input.servingGrams && input.servingGrams > 0 ? input.servingGrams : 0;
  if (servingGrams <= 0) {
    const target = input.calorieTarget ?? 0;
    servingGrams = target > 0 && food.calories > 0
      ? Math.round((target / food.calories) * 100)
      : estimateServing(food.description);
  }

  const now = new Date();
  const entry: MealEntry = {
    id: `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    date: formatDateKey(now),
    timestamp: now.toISOString(),
    fdcId: food.fdcId,
    foodName: food.description,
    servingGrams,
    ...macrosFor(food, servingGrams),
  };

  await logMeal(entry);
  return { ok: true as const, entry, matchedBy };
}

// Coach tools stay defined in coachPlan.ts; wrap their JSON-string results.
const coachHandlers = buildCoachChatToolHandlers();

export const healthTools = {
  // ── Coach planning ─────────────────────────────────────
  get_goal_guidance: tool({
    description:
      "Answer questions about goals: call with the user's goalId and a topic (e.g. 'targets', 'nutrition'). Returns knowledge-base guidance, habits, and sleep/step targets.",
    inputSchema: z.object({
      goalId: z.string().describe("Goal id from the goal library."),
      topic: z.string().optional().describe("Section to read, e.g. 'targets' or 'nutrition'."),
    }),
    execute: async (args) =>
      JSON.parse((await coachHandlers.get_goal_guidance(args)).toolResult),
  }),

  get_plan: tool({
    description: "Read the user's current saved coaching plan.",
    inputSchema: z.object({}),
    execute: async () => JSON.parse((await coachHandlers.get_plan({})).toolResult),
  }),

  update_plan: tool({
    description:
      "Save or update the coaching plan. Only change what the user asked to change; omitted fields keep their existing values.",
    inputSchema: z.object({
      habitIds: z.array(z.string()).max(14).optional(),
      nutrition: z
        .object({
          calories: z.number().min(1200).max(6000).optional(),
          proteinG: z.number().min(40).max(400).optional(),
          carbsG: z.number().min(0).max(900).optional(),
          fatG: z.number().min(20).max(300).optional(),
        })
        .optional(),
      sleepHours: z.number().min(5).max(12).optional(),
      stepsPerDay: z.number().min(1000).max(30000).optional(),
      trainingDays: z.number().min(0).max(7).optional(),
      focusNote: z.string().optional(),
    }),
    execute: async (args) =>
      JSON.parse((await coachHandlers.update_plan(args)).toolResult),
  }),

  // ── Activity ───────────────────────────────────────────
  get_steps: tool({
    description: "Step count for a period, with distance and active calories.",
    inputSchema: z.object({ period: periodSchema }),
    execute: async ({ period }) => {
      const { days, label, dateOffset } = resolvePeriod(period);
      try {
        const healthStatus = await getHealthAccess();
        await HealthService.initialize(false);
        if (days === 1 && dateOffset < 0) {
          const date = resolveDate("yesterday");
          const daily = await HealthService.getDailyActivity(2);
          const row = daily.find((d) => d.date === date);
          return {
            tool: "get_steps", period: label, date, healthStatus,
            steps: row?.steps ?? 0,
            activeCalories: Math.round(row?.activeCalories ?? 0),
            hasData: row?.hasData ?? false,
          };
        }
        if (days === 1) {
          const data = await getTodaySnapshot();
          return {
            tool: "get_steps", period: label, healthStatus,
            steps: data.steps ?? 0,
            distanceMeters: Math.round(data.distance),
            activeCalories: Math.round(data.activeCalories),
          };
        }
        const daily = await HealthService.getDailyActivity(days);
        const totalSteps = daily.reduce((s, d) => s + d.steps, 0);
        return {
          tool: "get_steps", period: label, days: daily.length, healthStatus,
          totalSteps, avgSteps: daily.length ? Math.round(totalSteps / daily.length) : 0,
          daily: daily.slice(-7).map((d) => ({ date: d.date, steps: d.steps })),
        };
      } catch {
        return { tool: "get_steps", error: "Could not access step data" };
      }
    },
  }),

  get_heart: tool({
    description: "Heart rate, resting HR, and HRV for a period.",
    inputSchema: z.object({ period: periodSchema }),
    execute: async ({ period }) => {
      const { days, label } = resolvePeriod(period);
      try {
        const healthStatus = await getHealthAccess();
        const data = await getTodaySnapshot();
        const hr = data.heartRate?.length
          ? {
              avg: Math.round(data.heartRate.reduce((a, b) => a + b, 0) / data.heartRate.length),
              max: Math.max(...data.heartRate),
              min: Math.min(...data.heartRate),
              readings: data.heartRate.length,
            }
          : null;
        const result: Record<string, unknown> = {
          tool: "get_heart", period: label, healthStatus,
          heartRate: hr,
          restingHeartRate: data.restingHeartRate,
          heartRateVariability: data.heartRateVariability,
        };
        if (days > 1) {
          const [rhrHistory, hrvHistory] = await Promise.all([
            HealthService.getMetricHistory("restingHeartRate", days),
            HealthService.getMetricHistory("heartRateVariability", days),
          ]);
          if (rhrHistory.length) result.rhrHistory = rhrHistory.slice(-7);
          if (hrvHistory.length) result.hrvHistory = hrvHistory.slice(-7);
        }
        return result;
      } catch {
        return { tool: "get_heart", error: "Could not access heart data" };
      }
    },
  }),

  get_workouts: tool({
    description: "Recent workout sessions with duration and calories.",
    inputSchema: z.object({ period: periodSchema }),
    execute: async ({ period }) => {
      const { days, label } = resolvePeriod(period ?? "week");
      try {
        const healthStatus = await getHealthAccess();
        await HealthService.initialize(false);
        const workouts = await HealthService.getWorkouts(days);
        const totalMin = workouts.reduce((s, w) => s + w.durationMin, 0);
        return {
          tool: "get_workouts", period: label, count: workouts.length, healthStatus,
          totalMinutes: Math.round(totalMin),
          workouts: workouts.slice(0, 10).map((w) => ({
            name: w.name, type: w.type, durationMin: Math.round(w.durationMin),
            calories: w.calories ? Math.round(w.calories) : null,
            date: w.startTime.toISOString().split("T")[0],
          })),
        };
      } catch {
        return { tool: "get_workouts", error: "Could not access workouts" };
      }
    },
  }),

  get_activity_trends: tool({
    description: "Daily activity totals over a period, for trends.",
    inputSchema: z.object({ period: periodSchema }),
    execute: async ({ period }) => {
      const { days, label } = resolvePeriod(period ?? "week");
      try {
        const healthStatus = await getHealthAccess();
        await HealthService.initialize(false);
        const daily = await HealthService.getDailyActivity(days);
        const totalSteps = daily.reduce((s, d) => s + d.steps, 0);
        const totalCals = daily.reduce((s, d) => s + d.activeCalories, 0);
        return {
          tool: "get_activity_trends", period: label, days: daily.length, healthStatus,
          totalSteps, totalActiveCalories: Math.round(totalCals),
          avgSteps: daily.length ? Math.round(totalSteps / daily.length) : 0,
          daily: daily.map((d) => ({
            date: d.date, steps: d.steps,
            activeCalories: Math.round(d.activeCalories), workouts: d.workoutCount,
          })),
        };
      } catch {
        return { tool: "get_activity_trends", error: "Could not access activity trends" };
      }
    },
  }),

  // ── Body & vitals ──────────────────────────────────────
  get_vitals: tool({
    description: "Blood oxygen, respiratory rate, body temperature, blood pressure.",
    inputSchema: z.object({}),
    execute: async () => {
      try {
        const healthStatus = await getHealthAccess();
        const data = await getTodaySnapshot();
        return {
          tool: "get_vitals", healthStatus,
          bloodOxygen: data.bloodOxygen != null ? Math.round(data.bloodOxygen) : null,
          respiratoryRate: data.respiratoryRate,
          bodyTemperature: data.bodyTemperature,
          bloodPressure: data.bloodPressure,
        };
      } catch {
        return { tool: "get_vitals", error: "Could not access vitals" };
      }
    },
  }),

  get_body: tool({
    description:
      "Weight, height, BMI, body fat, lean mass, VO2 max. Falls back from the wearable to manual logs to the onboarding profile — weightSource/heightSource say where each value came from. Use weightKg for per-kg protein guidance.",
    inputSchema: z.object({}),
    execute: async () => {
      try {
        const healthStatus = await getHealthAccess();
        const body = await getBodySummary();
        return {
          tool: "get_body", healthStatus,
          weightKg: body.weightKg,
          weightSource: body.weightSource,
          ...(body.weightDate ? { weightDate: body.weightDate } : {}),
          heightCm: body.heightCm,
          heightSource: body.heightSource,
          bmi: body.bmi,
          bodyFatPercent: body.bodyFatPercent,
          leanBodyMassKg: body.leanBodyMassKg,
          vo2Max: body.vo2Max,
        };
      } catch {
        return { tool: "get_body", error: "Could not access body metrics" };
      }
    },
  }),

  // ── Recovery ───────────────────────────────────────────
  get_sleep: tool({
    description:
      "Sleep duration and score; multi-day periods return per-night history. Durations come preformatted as hours+minutes (sleepDuration, duration) — quote those verbatim, never decimals.",
    inputSchema: z.object({ period: periodSchema }),
    execute: async ({ period }) => {
      try {
        const healthStatus = await getHealthAccess();
        const data = await getTodaySnapshot();
        const sleepScore = computeSleepScore(data);
        const result: Record<string, unknown> = {
          tool: "get_sleep", period: "today", healthStatus,
          sleepHours: data.sleepHours ? +data.sleepHours.toFixed(1) : 0,
          sleepDuration: formatSleepDuration(data.sleepHours),
          sleepScore,
          hasSleepStages: !!data.sleepHasStages,
        };
        if (data.sleepHasStages) {
          result.sleepStages = {
            deepHours: +(data.sleepDeepHours ?? 0).toFixed(1),
            deepDuration: formatSleepDuration(data.sleepDeepHours ?? 0),
            remHours: +(data.sleepRemHours ?? 0).toFixed(1),
            remDuration: formatSleepDuration(data.sleepRemHours ?? 0),
            awakeMinutes: Math.round((data.sleepAwakeHours ?? 0) * 60),
          };
        }
        const { days, dateOffset, label } = resolvePeriod(period);
        if (days > 1) {
          const history = await HealthService.getSleepHistory(days);
          const nights = history
            .slice(-Math.min(days, 7))
            .map((h) => ({
              date: h.date,
              hours: +h.value.toFixed(1),
              duration: formatSleepDuration(h.value),
            }));
          result.period = label;
          result.nights = nights;
          const avg = nights.length
            ? nights.reduce((s, n) => s + n.hours, 0) / nights.length
            : 0;
          result.averageHours = +avg.toFixed(1);
          result.averageDuration = formatSleepDuration(avg);
        } else if (dateOffset < 0) {
          const date = resolveDate("yesterday");
          const history = await HealthService.getSleepHistory(2);
          const night = history.find((h) => h.date === date);
          result.period = label;
          result.sleepHours = night ? +night.value.toFixed(1) : 0;
          result.sleepDuration = formatSleepDuration(night?.value ?? 0);
          delete result.sleepScore;
          delete result.hasSleepStages;
          delete result.sleepStages;
        }
        return result;
      } catch {
        return { tool: "get_sleep", error: "Could not access sleep data" };
      }
    },
  }),

  get_recovery: tool({
    description: "Strain score, sleep score, readiness score and 7-day readiness trend.",
    inputSchema: z.object({}),
    execute: async () => {
      try {
        const healthStatus = await getHealthAccess();
        const data = await getTodaySnapshot();
        const readiness = await calculateReadiness(
          data.heartRateVariability,
          data.restingHeartRate,
          data.sleepHours,
        );
        const history = await getReadinessHistory(7);
        return {
          tool: "get_recovery", healthStatus,
          strainScore: computeStrainScore(data),
          sleepScore: computeSleepScore(data),
          readinessScore: readiness.score,
          readinessSummary: readiness.summary,
          hrvDeviation: readiness.hrvDeviation,
          rhrDeviation: readiness.rhrDeviation,
          recentReadiness: history.slice(-7).map((h) => ({ date: h.date, score: h.score })),
        };
      } catch {
        return { tool: "get_recovery", error: "Could not access recovery data" };
      }
    },
  }),

  // ── Lifestyle ──────────────────────────────────────────
  get_journal: tool({
    description: "Habits completed, caffeine, hydration, alcohol, mood for a date.",
    inputSchema: z.object({ date: dateSchema }),
    execute: async ({ date }) => {
      const dateKey = resolveDate(date);
      try {
        const log = await getHabitLog(dateKey);
        const completed = Object.entries(log.completed || {})
          .filter(([, v]) => v === true)
          .map(([k]) => k);
        return {
          tool: "get_journal", date: dateKey,
          habitsCompleted: completed,
          habitsTotal: Object.keys(log.completed || {}).length,
          caffeine: log.caffeine,
          hydrationCups: log.hydration,
          alcohol: log.alcohol,
          mood: log.mood,
          hasData:
            completed.length > 0 || log.caffeine > 0 || log.hydration > 0 || log.alcohol > 0,
        };
      } catch {
        return { tool: "get_journal", error: "Could not access journal" };
      }
    },
  }),

  get_meals: tool({
    description: "All meals logged on a date with per-meal nutrition.",
    inputSchema: z.object({ date: dateSchema }),
    execute: async ({ date }) => {
      const dateKey = resolveDate(date);
      try {
        const meals = await getMeals(dateKey);
        return {
          tool: "get_meals", date: dateKey, count: meals.length,
          totalCalories: meals.reduce((s, m) => s + m.calories, 0),
          totalProtein: +meals.reduce((s, m) => s + m.protein, 0).toFixed(1),
          totalCarbs: +meals.reduce((s, m) => s + m.carbs, 0).toFixed(1),
          totalFat: +meals.reduce((s, m) => s + m.fat, 0).toFixed(1),
          meals: meals.map((m) => ({
            mealId: m.id, foodName: m.foodName, servingGrams: m.servingGrams, calories: m.calories,
            protein: m.protein, carbs: m.carbs, fat: m.fat,
          })),
          nutritionSource: getFoodDatabaseAttribution(),
        };
      } catch {
        return { tool: "get_meals", error: "Could not access meals" };
      }
    },
  }),

  // ── Food logging (write path — same semantics as the food chat) ──
  search_food: tool({
    description:
      "Search the nutrition database by text before logging. Returns up to 8 matches with per-100g values. Search one food at a time.",
    inputSchema: z.object({
      query: z.string().min(1).describe("Food name to look up, e.g. 'greek yogurt'."),
    }),
    execute: async ({ query }) => {
      const results = await searchFood(query);
      return {
        tool: "search_food",
        query,
        found: results.length,
        results: results.slice(0, 8).map((f) => ({
          fdcId: f.fdcId, description: f.description, calories: f.calories,
          protein: f.protein, carbs: f.carbs, fat: f.fat, fiber: f.fiber,
        })),
      };
    },
  }),

  log_meal: tool({
    description:
      "Log one food to today's log. Call search_food first and pass its fdcId so the right catalog row is logged. Provide the serving in grams, or a calorieTarget to derive it.",
    inputSchema: z.object({
      fdcId: z.string().optional().describe("Catalog id from search_food."),
      foodName: z.string().optional().describe("Name as returned by search_food."),
      servingGrams: z.number().positive().optional().describe("Serving size in grams."),
      calorieTarget: z
        .number()
        .positive()
        .optional()
        .describe("Desired calories; the serving is derived from the per-100g value."),
    }),
    execute: async (input) => {
      const result = await logFoodEntry(input);
      if (!result.ok) return { tool: "log_meal", logged: false, error: result.error };
      const { entry, matchedBy } = result;
      return {
        tool: "log_meal",
        logged: true,
        matchedBy,
        fdcId: entry.fdcId,
        foodName: entry.foodName,
        servingGrams: entry.servingGrams,
        calories: entry.calories,
        protein: entry.protein,
        carbs: entry.carbs,
        fat: entry.fat,
        // Flagged so a name-based substitution is visible rather than silently accepted.
        substituted: matchedBy !== "fdcId",
      };
    },
  }),
} satisfies ToolSet;

// Akosian
// Copyright (C) 2026 Pranesh Shivaraj
//
// This program is free software: you can redistribute it and/or modify
// it under the terms of the GNU General Public License as published by
// the Free Software Foundation, either version 3 of the License, or
// (at your option) any later version.

import AsyncStorage from "@react-native-async-storage/async-storage";

export interface JournalEntry {
  id: string;
  time: string;
  text: string;
  mood: "great" | "good" | "okay" | "bad";
}

export interface HabitLog {
  /** Persisted journal schema version used for one-time format migrations. */
  formatVersion: number;
  date: string;
  completed: Record<string, boolean>;
  counters: Record<string, number>;
  hydration: number;
  caffeine: number;
  alcohol: number;
  weight: number | null;
  mood: number;
  note: string;
}

export interface HabitTag {
  id: string;
  label: string;
  icon: string;
  metric: string;
  positive: boolean;
}

export const HABIT_TAGS: HabitTag[] = [
  { id: "magnesium", label: "Magnesium", icon: "pill", metric: "Recovery", positive: true },
  { id: "sun", label: "Sun Exposure", icon: "weather-sunny", metric: "Recovery", positive: true },
  { id: "resistance", label: "Resistance Training", icon: "dumbbell", metric: "Recovery", positive: true },
  { id: "read", label: "Read", icon: "book-open-outline", metric: "Recovery", positive: true },
  { id: "cardio", label: "Cardio", icon: "run", metric: "Recovery", positive: false },
  { id: "caffeine", label: "Caffeine", icon: "coffee", metric: "Recovery", positive: false },
  { id: "alcohol", label: "Alcohol", icon: "glass-wine", metric: "Recovery", positive: false },
];

export type HabitType = "binary" | "counter" | "measure";

export interface LibraryHabit {
  id: string;
  label: string;
  emoji: string;
  category: "daytime" | "nighttime";
  type: HabitType;
  target?: number;
  /** Unit label for measure habits (e.g. "kg"). */
  unit?: string;
  /** Stepper increment for measure habits (e.g. 0.1). */
  step?: number;
  /** Decimal places shown for measure values. */
  decimals?: number;
  /** When set, the habit auto-fills from connected health data. */
  healthSource?: "run_distance" | "weight";
}

export const HABIT_LIBRARY: LibraryHabit[] = [
  // Daytime
  { id: "sugar", label: "No added sugar", emoji: "🍬", category: "daytime", type: "binary" },
  { id: "keto", label: "Keto diet", emoji: "🥑", category: "daytime", type: "binary" },
  { id: "low_carbs", label: "Low carbs", emoji: "🥖", category: "daytime", type: "binary" },
  { id: "intermittent_fast", label: "Intermittent fast", emoji: "⏰", category: "daytime", type: "binary" },
  { id: "protein_goal", label: "Protein servings", emoji: "🥩", category: "daytime", type: "counter", target: 4 },
  { id: "veggies", label: "Veggie servings", emoji: "🥬", category: "daytime", type: "counter", target: 5 },
  { id: "no_processed", label: "No processed food", emoji: "🥗", category: "daytime", type: "binary" },
  { id: "home_cooked", label: "Home cooked meal", emoji: "🍳", category: "daytime", type: "binary" },
  { id: "water_goal", label: "Glasses of water", emoji: "💧", category: "daytime", type: "counter", target: 8 },
  { id: "vitamins", label: "Took vitamins", emoji: "💊", category: "daytime", type: "binary" },
  { id: "walk", label: "Walks", emoji: "🚶", category: "daytime", type: "counter", target: 1 },
  { id: "gym", label: "Gym / workout", emoji: "🏋️", category: "daytime", type: "binary" },
  { id: "stretch", label: "Stretching / yoga", emoji: "🧘", category: "daytime", type: "binary" },
  { id: "sunlight", label: "Morning sunlight", emoji: "☀️", category: "daytime", type: "binary" },
  { id: "meditate", label: "Meditation", emoji: "🧠", category: "daytime", type: "binary" },
  { id: "journal", label: "Journaling", emoji: "📓", category: "daytime", type: "binary" },
  { id: "read_book", label: "Reading", emoji: "📖", category: "daytime", type: "measure", unit: "min", step: 5, decimals: 0 },
  { id: "social", label: "Talked to friends/family", emoji: "💬", category: "daytime", type: "binary" },
  { id: "weight_kg", label: "Daily weight", emoji: "⚖️", category: "daytime", type: "measure", unit: "kg", step: 0.1, decimals: 1, healthSource: "weight" },
  { id: "waist_cm", label: "Waist", emoji: "📏", category: "daytime", type: "measure", unit: "cm", step: 1, decimals: 0 },
  { id: "meal_prep", label: "Meal prep", emoji: "🥡", category: "daytime", type: "binary" },
  { id: "slow_meal", label: "Slow meal (20+ min)", emoji: "🍽️", category: "daytime", type: "binary" },
  { id: "protein_breakfast", label: "Protein breakfast", emoji: "🥚", category: "daytime", type: "binary" },
  { id: "no_screens_meals", label: "No screens at meals", emoji: "📵", category: "daytime", type: "binary" },
  { id: "morning_routine", label: "Morning routine", emoji: "🌅", category: "daytime", type: "binary" },
  { id: "sugar_free_drinks", label: "No sugary drinks", emoji: "🧃", category: "daytime", type: "binary" },
  { id: "gratitude", label: "Gratitude", emoji: "🙏", category: "daytime", type: "binary" },
  { id: "no_phone_first_hour", label: "No phone first hour", emoji: "🌤️", category: "daytime", type: "binary" },
  { id: "stress_checkin", label: "Stress check-in", emoji: "🧭", category: "daytime", type: "binary" },
  { id: "sleep_hours", label: "Sleep (hours)", emoji: "😴", category: "daytime", type: "measure", unit: "h", step: 0.5, decimals: 1 },
  { id: "food_log", label: "Logged my meals", emoji: "🧾", category: "daytime", type: "binary" },
  { id: "run_km", label: "Run distance", emoji: "🏃", category: "daytime", type: "measure", unit: "km", step: 1, decimals: 1, healthSource: "run_distance" },
  { id: "zone2", label: "Zone 2 session", emoji: "🚴", category: "daytime", type: "binary" },
  { id: "rehab", label: "Rehab exercises", emoji: "🩹", category: "daytime", type: "binary" },
  { id: "breathwork", label: "Breathwork", emoji: "🌬️", category: "daytime", type: "binary" },
  { id: "fiber_goal", label: "Fiber servings", emoji: "🌾", category: "daytime", type: "counter", target: 5 },
  { id: "oily_fish", label: "Omega-3s", emoji: "🐟", category: "daytime", type: "binary" },
  { id: "fermented", label: "Fermented food", emoji: "🥣", category: "daytime", type: "binary" },
  { id: "nuts", label: "Handful of nuts", emoji: "🥜", category: "daytime", type: "binary" },
  { id: "fruit", label: "Fruit servings", emoji: "🍎", category: "daytime", type: "counter", target: 2 },
  { id: "green_tea", label: "Green tea (1 cup)", emoji: "🍵", category: "daytime", type: "binary" },
  { id: "water_before_coffee", label: "Water before coffee", emoji: "💦", category: "daytime", type: "binary" },
  { id: "salad_first", label: "Salad or soup first", emoji: "🥗", category: "daytime", type: "binary" },
  { id: "make_bed", label: "Made my bed", emoji: "🛏️", category: "daytime", type: "binary" },
  { id: "stairs", label: "Took the stairs", emoji: "🪜", category: "daytime", type: "binary" },
  { id: "stand_breaks", label: "Hourly stand break", emoji: "🧍", category: "daytime", type: "binary" },
  { id: "pushup_sets", label: "Push-up sets", emoji: "💪", category: "daytime", type: "counter", target: 3 },
  { id: "squat_sets", label: "Squat sets", emoji: "🦵", category: "daytime", type: "counter", target: 3 },
  { id: "plank_hold", label: "Plank hold", emoji: "🧱", category: "daytime", type: "binary" },
  { id: "cold_shower", label: "Cold shower", emoji: "🚿", category: "daytime", type: "binary" },
  { id: "sunscreen", label: "Applied SPF", emoji: "🧴", category: "daytime", type: "binary" },
  { id: "floss", label: "Flossed", emoji: "🦷", category: "daytime", type: "binary" },
  { id: "tongue_scrape", label: "Tongue scrape", emoji: "👅", category: "daytime", type: "binary" },
  { id: "creatine", label: "Creatine", emoji: "🧪", category: "daytime", type: "binary" },
  { id: "legs_up", label: "Legs up the wall", emoji: "🦶", category: "daytime", type: "binary" },
  { id: "to_do_list", label: "Made a to-do list", emoji: "✅", category: "daytime", type: "binary" },
  // Nighttime
  { id: "device_bed", label: "No devices in bed", emoji: "📱", category: "nighttime", type: "binary" },
  { id: "early_bed", label: "Bed before 10pm", emoji: "🌙", category: "nighttime", type: "binary" },
  { id: "no_late_food", label: "No food after 8pm", emoji: "🚫", category: "nighttime", type: "binary" },
  { id: "sleep_routine", label: "Night routine", emoji: "🛁", category: "nighttime", type: "binary" },
  { id: "no_caffeine_pm", label: "No caffeine after 2pm", emoji: "☕", category: "nighttime", type: "binary" },
  { id: "blue_blockers", label: "Blue blockers", emoji: "👓", category: "nighttime", type: "binary" },
  { id: "cool_room", label: "Cool bedroom", emoji: "❄️", category: "nighttime", type: "binary" },
  { id: "digital_sunset", label: "Digital sunset", emoji: "🌇", category: "nighttime", type: "binary" },
  { id: "consistent_wake", label: "Consistent wake time", emoji: "⏰", category: "nighttime", type: "binary" },
  { id: "no_snooze", label: "No snooze", emoji: "🔕", category: "nighttime", type: "binary" },
  { id: "brain_dump", label: "Brain dump before bed", emoji: "📝", category: "nighttime", type: "binary" },
  { id: "consist_bedtime", label: "Same bedtime (±30 min)", emoji: "🛌", category: "nighttime", type: "binary" },
  { id: "evening_walk", label: "Evening walk", emoji: "🌆", category: "nighttime", type: "binary" },
  { id: "dim_lights", label: "Dimmed lights in evening", emoji: "🕯️", category: "nighttime", type: "binary" },
  { id: "white_noise", label: "White noise", emoji: "🔉", category: "nighttime", type: "binary" },
  { id: "sleep_mask", label: "Sleep mask", emoji: "🕶️", category: "nighttime", type: "binary" },
  { id: "wash_face", label: "Washed face before bed", emoji: "🧼", category: "nighttime", type: "binary" },
  { id: "epsom_bath", label: "Epsom salt bath", emoji: "🛀", category: "nighttime", type: "binary" },
  { id: "tidied_room", label: "Tidied room", emoji: "🧺", category: "nighttime", type: "binary" },
  { id: "prep_tomorrow", label: "Prepped for tomorrow", emoji: "🎒", category: "nighttime", type: "binary" },
];

const ACTIVE_HABITS_KEY = "active_habits";
const HABIT_FORMAT_VERSION = 2;

const CUSTOM_HABITS_KEY = "custom_habits_v1";
export const MAX_CUSTOM_HABITS = 25;
export const MAX_CUSTOM_LABEL_LENGTH = 40;

export interface CustomHabitInput {
  label: string;
  emoji: string;
  type: HabitType;
  /** Required for counter habits (1–99). */
  target?: number;
  /** Unit label for measure habits (e.g. "min", "pages"). */
  unit?: string;
  category: "daytime" | "nighttime";
}

/** User-created habits live alongside the built-in library. */
let customHabitsCache: LibraryHabit[] | null = null;

/** Built-ins plus user customs (empty until refreshHabitLibrary runs). */
export function getHabitLibrary(): LibraryHabit[] {
  return customHabitsCache ? [...HABIT_LIBRARY, ...customHabitsCache] : [...HABIT_LIBRARY];
}

export function findHabit(id: string): LibraryHabit | undefined {
  if (isCustomHabitId(id) && customHabitsCache) {
    const custom = customHabitsCache.find((h) => h.id === id);
    if (custom) return custom;
  }
  return HABIT_LIBRARY.find((h) => h.id === id) ?? customHabitsCache?.find((h) => h.id === id);
}

export function isCustomHabitId(id: string): boolean {
  return id.startsWith("custom_");
}

function sanitizeCustomHabit(raw: unknown): LibraryHabit | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Record<string, unknown>;
  if (typeof r.id !== "string" || !isCustomHabitId(r.id)) return null;
  if (typeof r.label !== "string" || !r.label.trim()) return null;
  if (r.category !== "daytime" && r.category !== "nighttime") return null;
  if (r.type !== "binary" && r.type !== "counter" && r.type !== "measure") return null;
  const habit: LibraryHabit = {
    id: r.id,
    label: r.label.trim().slice(0, MAX_CUSTOM_LABEL_LENGTH),
    emoji: typeof r.emoji === "string" && r.emoji ? Array.from(r.emoji).slice(0, 2).join("") : "⭐",
    category: r.category,
    type: r.type,
  };
  if (habit.type === "counter") {
    const target = Math.round(Number(r.target));
    habit.target = Number.isFinite(target) ? Math.min(99, Math.max(1, target)) : 1;
  }
  if (habit.type === "measure") {
    habit.unit = typeof r.unit === "string" ? r.unit.trim().slice(0, 8) : "";
    habit.decimals = 0;
    habit.step = 1;
  }
  return habit;
}

/** Loads customs from storage into the in-memory cache. Call on launch/focus. */
export async function refreshHabitLibrary(): Promise<LibraryHabit[]> {
  try {
    const raw = await AsyncStorage.getItem(CUSTOM_HABITS_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    const customs = Array.isArray(parsed)
      ? parsed
        .map(sanitizeCustomHabit)
        .filter((h): h is LibraryHabit => h != null)
      : [];
    customHabitsCache = customs;
  } catch {
    customHabitsCache = [];
  }
  return getHabitLibrary();
}

async function persistCustomHabits(customs: LibraryHabit[]): Promise<void> {
  customHabitsCache = customs;
  await AsyncStorage.setItem(CUSTOM_HABITS_KEY, JSON.stringify(customs));
}

export async function createCustomHabit(input: CustomHabitInput): Promise<LibraryHabit> {
  if (customHabitsCache == null) await refreshHabitLibrary();
  const customs = [...(customHabitsCache ?? [])];
  if (customs.length >= MAX_CUSTOM_HABITS) {
    throw new Error(`You can create up to ${MAX_CUSTOM_HABITS} custom habits.`);
  }
  const label = input.label.trim().slice(0, MAX_CUSTOM_LABEL_LENGTH);
  if (!label) throw new Error("Give your habit a name.");
  const habit = sanitizeCustomHabit({
    id: `custom_${Date.now().toString(36)}`,
    label,
    emoji: input.emoji,
    category: input.category,
    type: input.type,
    target: input.target,
    unit: input.unit,
  });
  if (!habit) throw new Error("Could not create that habit.");
  customs.push(habit);
  await persistCustomHabits(customs);
  await addActiveHabit(habit.id);
  return habit;
}

export async function deleteCustomHabit(id: string): Promise<void> {
  if (!isCustomHabitId(id)) return;
  if (customHabitsCache == null) await refreshHabitLibrary();
  const customs = (customHabitsCache ?? []).filter((h) => h.id !== id);
  await persistCustomHabits(customs);
  await removeActiveHabit(id);
}

export async function getActiveHabitIds(): Promise<string[]> {
  try {
    const raw = await AsyncStorage.getItem(ACTIVE_HABITS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    const ids = Array.isArray(parsed) ? parsed : [];
    // One-time id migration: mindful_eating became slow_meal.
    if (ids.includes("mindful_eating")) {
      const migrated = ids.map((id: string) => (id === "mindful_eating" ? "slow_meal" : id));
      await saveActiveHabitIds(migrated);
      return migrated;
    }
    // One-time id removal: training_log was retired.
    if (ids.includes("training_log")) {
      const migrated = ids.filter((id: string) => id !== "training_log");
      await saveActiveHabitIds(migrated);
      return migrated;
    }
    return ids;
  } catch {
    return [];
  }
}

export async function saveActiveHabitIds(ids: string[]): Promise<void> {
  await AsyncStorage.setItem(ACTIVE_HABITS_KEY, JSON.stringify(ids));
}

export async function addActiveHabit(id: string): Promise<string[]> {
  const ids = await getActiveHabitIds();
  if (!ids.includes(id)) {
    ids.push(id);
    await saveActiveHabitIds(ids);
  }
  return ids;
}

export async function removeActiveHabit(id: string): Promise<string[]> {
  const ids = await getActiveHabitIds();
  const filtered = ids.filter((h) => h !== id);
  await saveActiveHabitIds(filtered);
  return filtered;
}

const ENTRIES_KEY = "journal_entries";
const HABITS_KEY = "daily_habits";

export async function getJournalEntries(): Promise<JournalEntry[]> {
  try {
    const raw = await AsyncStorage.getItem(ENTRIES_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export async function saveJournalEntry(entry: JournalEntry): Promise<void> {
  const entries = await getJournalEntries();
  entries.unshift(entry);
  await AsyncStorage.setItem(ENTRIES_KEY, JSON.stringify(entries));
}

function habitsKey(date: string) {
  return `${HABITS_KEY}_${date}`;
}

export function formatDateKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export function getDefaultHabitLog(date: string): HabitLog {
  return {
    formatVersion: HABIT_FORMAT_VERSION,
    date,
    completed: {},
    counters: {},
    hydration: 0,
    caffeine: 0,
    alcohol: 0,
    weight: null,
    mood: 3,
    note: "",
  };
}

function normalizeHabitLog(date: string, parsed: Partial<HabitLog>): HabitLog {
  const base = getDefaultHabitLog(date);
  const log: HabitLog = {
    ...base,
    ...parsed,
    date,
    completed: { ...base.completed, ...(parsed.completed ?? {}) },
    counters: { ...base.counters, ...(parsed.counters ?? {}) },
  };

  // Older versions stored hydration in fluid ounces and meditation as minutes.
  // Convert those values once so existing journals remain meaningful after the
  // UI switches to cups and a yes/no meditation habit.
  if (parsed.formatVersion !== HABIT_FORMAT_VERSION) {
    const oldHydration = typeof log.hydration === "number" ? log.hydration : 0;
    log.hydration = Math.round((oldHydration / 8) * 10) / 10;

    const oldMeditation = log.counters.meditate;
    if (typeof oldMeditation === "number" && oldMeditation > 0) {
      log.completed.meditate = true;
    }
    delete log.counters.meditate;
    log.formatVersion = HABIT_FORMAT_VERSION;
  }

  return log;
}

export async function getHabitLog(date: string): Promise<HabitLog> {
  try {
    const raw = await AsyncStorage.getItem(habitsKey(date));
    if (!raw) return getDefaultHabitLog(date);
    const parsed = JSON.parse(raw) as Partial<HabitLog>;
    const normalized = normalizeHabitLog(date, parsed);
    if (parsed.formatVersion !== HABIT_FORMAT_VERSION) {
      await saveHabitLog(normalized);
    }
    return normalized;
  } catch {
    return getDefaultHabitLog(date);
  }
}

export async function saveHabitLog(log: HabitLog): Promise<void> {
  await AsyncStorage.setItem(habitsKey(log.date), JSON.stringify(log));
}

export async function toggleHabit(date: string, habitId: string): Promise<HabitLog> {
  const log = await getHabitLog(date);
  log.completed[habitId] = !log.completed[habitId];
  await saveHabitLog(log);
  return log;
}

export async function setHabitCounter(
  date: string,
  habitId: string,
  value: number
): Promise<HabitLog> {
  const log = await getHabitLog(date);
  const next = Math.max(0, value);
  if (next === 0) {
    delete log.counters[habitId];
  } else {
    log.counters[habitId] = next;
  }
  await saveHabitLog(log);
  return log;
}

export async function updateHabitValue(
  date: string,
  key: keyof Omit<HabitLog, "date" | "completed">,
  value: number | null
): Promise<HabitLog> {
  const log = await getHabitLog(date);
  (log as any)[key] = value;
  await saveHabitLog(log);
  return log;
}

export async function getRecentHabitLogs(days: number): Promise<HabitLog[]> {
  const results: HabitLog[] = [];
  const today = new Date();
  for (let i = 0; i < days; i++) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const key = formatDateKey(d);
    const log = await getHabitLog(key);
    results.push(log);
  }
  return results;
}

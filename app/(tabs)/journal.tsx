// Akosian
// Copyright (C) 2026 Pranesh Shivaraj
//
// This program is free software: you can redistribute it and/or modify
// it under the terms of the GNU General Public License as published by
// the Free Software Foundation, either version 3 of the License, or
// (at your option) any later version.

import { useCallback, useEffect, useState, useRef, useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  Animated,
  TouchableOpacity,
  TextInput,
  Modal,
  Switch,
  Easing,
} from "react-native";
import { useFocusEffect, useRouter } from "expo-router";
import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import { theme, formatSleepDuration } from "../../src/theme";
import { GradientWash } from "../../src/components/GradientWash";
import {
  HabitLog,
  getHabitLog,
  saveHabitLog,
  updateHabitValue,
  setHabitCounter,
  formatDateKey,
  HABIT_LIBRARY,
  LibraryHabit,
  getActiveHabitIds,
  saveActiveHabitIds,
  addActiveHabit,
  removeActiveHabit,
  refreshHabitLibrary,
  findHabit,
  createCustomHabit,
  deleteCustomHabit,
  isCustomHabitId,
  MAX_CUSTOM_HABITS,
  type CustomHabitInput,
  type HabitType,
} from "../../src/services/journal";
import { getMeals, deleteMeal, getFoodDatabaseAttribution, MealEntry } from "../../src/services/foodDatabase";
import { applyHabitAutofill } from "../../src/services/habitAutofill";
import { patchHealthProfile } from "../../src/services/profile";
import { getDistanceUnit, getWeightUnit, kgToLbs, lbsToKg, type DistanceUnit, type WeightUnit } from "../../src/services/units";
import AmountModal from "../../src/components/AmountModal";
import { DailyEatingCard } from "../../src/components/DailyEatingCard";
import { NutritionGoalsCard } from "../../src/components/NutritionGoalsCard";
import { loadPlan, updateNutritionTargets, type NutritionTargets } from "../../src/services/coachPlan";
import {
  getBriefSettings,
  enableMorningBrief,
  disableMorningBrief,
  sendTestBrief,
  formatBriefTime,
  ensureMorningBriefScheduled,
} from "../../src/services/morningBrief";

const SHORT_DAYS = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"];

function buildWeekDays(anchor: Date = new Date()) {
  // Center today in the middle (index 3), showing 3 days before and 3 after
  const start = new Date(anchor.getFullYear(), anchor.getMonth(), anchor.getDate());
  start.setDate(start.getDate() - 3);
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    return d;
  });
}

interface AmountConfig {
  visible: boolean;
  key: "hydration" | "mood";
  title: string;
  emoji: string;
  unit: string;
  initialValue: number;
}

function MacroField({
  label,
  unit,
  value,
  onChangeText,
  onBump,
  color,
}: {
  label: string;
  unit: string;
  value: string;
  onChangeText: (text: string) => void;
  onBump: (delta: number) => void;
  color: string;
}) {
  return (
    <View style={styles.macroField}>
      <View style={styles.macroFieldLabelRow}>
        <View style={[styles.macroFieldDot, { backgroundColor: color }]} />
        <Text style={styles.macroFieldLabel}>{label}</Text>
      </View>
      <View style={styles.macroFieldControl}>
        <TouchableOpacity
          style={styles.macroStepBtn}
          onPress={() => onBump(-1)}
          activeOpacity={0.7}
          accessibilityLabel={`Decrease ${label}`}
        >
          <MaterialCommunityIcons name="minus" size={18} color={theme.colors.ink} />
        </TouchableOpacity>
        <View style={styles.macroInputWrap}>
          <TextInput
            style={styles.macroInput}
            value={value}
            onChangeText={onChangeText}
            keyboardType="number-pad"
            selectTextOnFocus
            placeholder="0"
            placeholderTextColor={theme.colors.muted}
          />
          <Text style={styles.macroUnit}>{unit}</Text>
        </View>
        <TouchableOpacity
          style={styles.macroStepBtn}
          onPress={() => onBump(1)}
          activeOpacity={0.7}
          accessibilityLabel={`Increase ${label}`}
        >
          <MaterialCommunityIcons name="plus" size={18} color={theme.colors.ink} />
        </TouchableOpacity>
      </View>
    </View>
  );
}

/** Animated press wrapper — scales down on touch */
function AnimatedPress({
  children,
  onPress,
  style = {},
  disabled,
  activeOpacity,
  ...rest
}: {
  children: React.ReactNode;
  onPress?: () => void;
  style?: any;
  disabled?: boolean;
  activeOpacity?: number;
  [key: string]: any;
}) {
  const scale = useRef(new Animated.Value(1)).current;

  const handlePressIn = () => {
    Animated.spring(scale, {
      toValue: 0.96,
      damping: 12,
      stiffness: 200,
      useNativeDriver: true,
    }).start();
  };

  const handlePressOut = () => {
    Animated.spring(scale, {
      toValue: 1,
      damping: 10,
      stiffness: 200,
      useNativeDriver: true,
    }).start();
  };

  return (
    <Animated.View style={[{ transform: [{ scale }] }, style]}>
      <TouchableOpacity
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        activeOpacity={activeOpacity ?? 0.7}
        disabled={disabled}
        {...rest}
      >
        {children}
      </TouchableOpacity>
    </Animated.View>
  );
}

/** Week-strip day pill — press feedback plus a spring pop when the selection
 *  moves, with the pill filling from the bottom by that day's completion. */
const CALENDAR_PILL_HEIGHT = 60; // keep in sync with styles.calendarPill.height

function DayCell({
  label,
  dateNum,
  score,
  isFuture,
  isSelected,
  isToday,
  onPress,
}: {
  label: string;
  dateNum: number;
  score: number;
  isFuture: boolean;
  isSelected: boolean;
  isToday: boolean;
  onPress: () => void;
}) {
  const selAnim = useRef(new Animated.Value(isSelected ? 1 : 0)).current;
  const pressAnim = useRef(new Animated.Value(1)).current;

  // Spring-pop whenever the selection moves onto (or off of) this day.
  useEffect(() => {
    Animated.spring(selAnim, {
      toValue: isSelected ? 1 : 0,
      friction: 5,
      tension: 240,
      useNativeDriver: true,
    }).start();
  }, [isSelected]);

  const clamped = Math.max(0, Math.min(1, Number.isFinite(score) ? score : 0));
  const fillHeight = Math.round(clamped * CALENDAR_PILL_HEIGHT);
  const textColor = isFuture ? theme.colors.muted : theme.colors.ink;

  return (
    <Animated.View
      style={{
        transform: [
          { scale: selAnim.interpolate({ inputRange: [0, 1], outputRange: [1, 1.12] }) },
        ],
      }}
    >
      <Animated.View style={{ transform: [{ scale: pressAnim }] }}>
        <TouchableOpacity
          onPress={onPress}
          onPressIn={() =>
            Animated.spring(pressAnim, {
              toValue: 0.92,
              friction: 4,
              tension: 280,
              useNativeDriver: true,
            }).start()
          }
          onPressOut={() =>
            Animated.spring(pressAnim, {
              toValue: 1,
              friction: 4,
              tension: 220,
              useNativeDriver: true,
            }).start()
          }
          disabled={isFuture}
          activeOpacity={0.9}
          accessibilityRole="button"
          accessibilityLabel={`${label} ${dateNum}`}
          accessibilityState={{ selected: isSelected, disabled: isFuture }}
        >
          <View
            style={[
              styles.calendarRing,
              isToday && !isSelected && styles.calendarRingToday,
              isSelected && styles.calendarRingSelected,
            ]}
          >
            <View style={[styles.calendarPill, isFuture && styles.calendarPillFuture]}>
              {fillHeight > 0 && (
                <View
                  style={[
                    styles.calendarPillFill,
                    { height: fillHeight, backgroundColor: getCompletionFillColor(clamped) },
                  ]}
                />
              )}
              <Text style={[styles.calendarDayName, { color: textColor }]}>{label}</Text>
              <Text style={[styles.calendarDate, { color: textColor }]}>{dateNum}</Text>
            </View>
          </View>
        </TouchableOpacity>
      </Animated.View>
    </Animated.View>
  );
}

interface EntryRowProps {
  emoji: string;
  label: string;
  rightControl: "triState" | "arrow";
  value?: string;
  arrowLabel?: string;
  state?: "yes" | "no" | "skip";
  onTriState?: (state: "yes" | "no" | "skip") => void;
  onArrow?: () => void;
}

function EntryRow({ emoji, label, rightControl, value, arrowLabel, state, onTriState, onArrow }: EntryRowProps) {
  return (
    <View style={styles.entryRow}>
      <View style={styles.entryLeft}>
        <Text style={styles.entryEmoji}>{emoji}</Text>
        <Text style={styles.entryLabel}>{label}</Text>
      </View>
      {rightControl === "triState" ? (
        <TriStateControl state={state ?? "skip"} onChange={onTriState ?? (() => {})} />
      ) : (
        <AnimatedPress onPress={onArrow}>
          <View style={styles.arrowButton}>
            <Text style={styles.arrowValue}>{value ?? "—"}</Text>
            {arrowLabel ? <Text style={styles.arrowLabel}>{arrowLabel}</Text> : null}
            <MaterialCommunityIcons name="chevron-right" size={16} color={theme.colors.muted} />
          </View>
        </AnimatedPress>
      )}
    </View>
  );
}

interface TriStateControlProps {
  state: "yes" | "no" | "skip";
  onChange: (state: "yes" | "no" | "skip") => void;
  small?: boolean;
}

// Counter-bar geometry — single source of truth shared by styles.stepperTrack
// and CounterControl's fill width (which animates in pixels, not percent:
// Yoga resolves a percentage width on an absolutely positioned child against
// a box that skips the track's right padding, so "100%" would paint short of
// the end and the bar never looked complete at the target).
const TRACK_WIDTH = 84;
const TRACK_BORDER = 1;

interface CounterControlProps {
  value: number;
  target?: number;
  onChange: (delta: number) => void;
}

function CounterControl({ value, target, onChange }: CounterControlProps) {
  const pop = useRef(new Animated.Value(1)).current;
  const fill = useRef(new Animated.Value(0)).current;
  // Last progress the bar animated to — lets us skip restarting the fill
  // when extra taps past the target don't change it.
  const lastProgress = useRef(0);
  const progress = target ? Math.min(Math.max(value / target, 0), 1) : 0;
  const complete = target ? value >= target : false;

  useEffect(() => {
    pop.stopAnimation();
    Animated.sequence([
      Animated.spring(pop, {
        toValue: 1.18,
        damping: 9,
        stiffness: 420,
        useNativeDriver: true,
      }),
      Animated.spring(pop, {
        toValue: 1,
        damping: 8,
        stiffness: 260,
        useNativeDriver: true,
      }),
    ]).start();
    // Fast exact timing (no spring lag/overshoot) so the bar lands precisely
    // on the target even under rapid taps — and stays put past the target.
    if (progress !== lastProgress.current) {
      lastProgress.current = progress;
      Animated.timing(fill, {
        toValue: progress,
        duration: 180,
        easing: Easing.out(Easing.quad),
        useNativeDriver: false,
      }).start();
    }
  }, [value, target]);

  // Pixel width so 100% provably spans the whole track (see TRACK_WIDTH).
  // Clamped on both sides so extra taps past the target can never push the
  // bar past full — it lands on the target and stays there.
  const fillWidth = fill.interpolate({
    inputRange: [0, 1],
    outputRange: [0, TRACK_WIDTH - TRACK_BORDER * 2],
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <View style={styles.stepperRow}>
      <TouchableOpacity
        style={[styles.stepperBtn, value <= 0 && styles.stepperBtnDisabled]}
        onPress={() => onChange(Math.max(0, value - 1))}
        activeOpacity={0.7}
        disabled={value <= 0}
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        accessibilityLabel="Decrease count"
      >
        <MaterialCommunityIcons
          name="minus"
          size={18}
          color={value <= 0 ? theme.colors.muted : theme.colors.ink}
        />
      </TouchableOpacity>

      <View style={styles.stepperTrack}>
        {target ? (
          <Animated.View
            style={[
              styles.stepperFill,
              {
                width: fillWidth,
                backgroundColor: complete
                  ? `${theme.colors.success}30`
                  : `${theme.colors.ink}14`,
              },
            ]}
          />
        ) : null}
        <Animated.View
          style={{ transform: [{ scale: pop }], flexShrink: 1, maxWidth: "100%" }}
        >
          <Text
            style={styles.stepperText}
            numberOfLines={1}
            adjustsFontSizeToFit
            minimumFontScale={0.75}
          >
            <Text
              style={[
                styles.stepperValue,
                complete && { color: theme.colors.success },
              ]}
            >
              {value}
            </Text>
            {target ? (
              <Text style={styles.stepperTarget}> / {target}</Text>
            ) : null}
          </Text>
        </Animated.View>
        {complete ? (
          <View style={styles.stepperDoneDot}>
            <MaterialCommunityIcons
              name="check"
              size={11}
              color={theme.colors.success}
            />
          </View>
        ) : null}
      </View>

      <TouchableOpacity
        style={[
          styles.stepperBtn,
          styles.stepperPlus,
          complete && styles.stepperPlusDone,
        ]}
        onPress={() => onChange(value + 1)}
        activeOpacity={0.75}
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        accessibilityLabel="Increase count"
      >
        <MaterialCommunityIcons
          name={complete ? "check" : "plus"}
          size={19}
          color="#FFFFFF"
        />
      </TouchableOpacity>
    </View>
  );
}

interface HabitItemProps {
  habit: LibraryHabit;
  state: "yes" | "no" | "skip";
  count: number;
  onTriState: (state: "yes" | "no" | "skip") => void;
  onCounter: (nextValue: number) => void;
  onMeasureTap: () => void;
  /** Pre-formatted value/unit for measure habits (unit conversion). */
  displayValue?: string;
  displayUnit?: string;
  /** Marks the value as auto-filled from health data. */
  auto?: boolean;
}

function HabitItem({
  habit,
  state,
  count,
  onTriState,
  onCounter,
  onMeasureTap,
  displayValue,
  displayUnit,
  auto,
}: HabitItemProps) {
  return (
    <View style={styles.entryRow}>
      <View style={styles.entryLeft}>
        <Text style={styles.entryEmoji}>{habit.emoji}</Text>
        <Text style={styles.entryLabel} numberOfLines={1} ellipsizeMode="tail">
          {habit.label}
        </Text>
      </View>
      {habit.type === "counter" ? (
        <View style={styles.autoRow}>
          {auto && count > 0 ? (
            <View style={styles.autoBadge}>
              <Text style={styles.autoBadgeText}>auto</Text>
            </View>
          ) : null}
          <CounterControl
            value={count}
            target={habit.target}
            onChange={onCounter}
          />
        </View>
      ) : habit.type === "measure" ? (
        <TouchableOpacity
          style={styles.measureButton}
          onPress={onMeasureTap}
          activeOpacity={0.7}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Text style={styles.measureValue}>
            {count > 0 ? displayValue ?? count.toFixed(habit.decimals ?? 0) : "—"}
          </Text>
          {count > 0 ? (
            <Text style={styles.measureUnit}>{displayUnit ?? habit.unit}</Text>
          ) : null}
          {auto && count > 0 ? (
            <View style={styles.autoBadge}>
              <Text style={styles.autoBadgeText}>auto</Text>
            </View>
          ) : null}
          <MaterialCommunityIcons name="pencil-outline" size={13} color={theme.colors.muted} />
        </TouchableOpacity>
      ) : (
        <View style={styles.autoRow}>
          {auto && state === "yes" ? (
            <View style={styles.autoBadge}>
              <Text style={styles.autoBadgeText}>auto</Text>
            </View>
          ) : null}
          <TriStateControl state={state} onChange={onTriState} />
        </View>
      )}
    </View>
  );
}

function TriStateControl({ state, onChange, small }: TriStateControlProps) {
  const yesScale = useRef(new Animated.Value(1)).current;
  const noScale = useRef(new Animated.Value(1)).current;

  const pop = (anim: Animated.Value) => {
    anim.stopAnimation();
    Animated.sequence([
      Animated.spring(anim, {
        toValue: 0.84,
        damping: 10,
        stiffness: 420,
        useNativeDriver: true,
      }),
      Animated.spring(anim, {
        toValue: 1,
        damping: 7,
        stiffness: 260,
        useNativeDriver: true,
      }),
    ]).start();
  };

  // Tapping the active choice again clears it back to "skip" — feels like a toggle.
  const handleYes = () => {
    pop(yesScale);
    onChange(state === "yes" ? "skip" : "yes");
  };
  const handleNo = () => {
    pop(noScale);
    onChange(state === "no" ? "skip" : "no");
  };

  const size = small ? 36 : 42;
  const iconSize = small ? 16 : 19;

  return (
    <View style={styles.binaryRow}>
      <Animated.View style={{ transform: [{ scale: noScale }] }}>
        <TouchableOpacity
          style={[
            styles.binaryBtn,
            { width: size, height: small ? 36 : 40 },
            state === "no" && styles.binaryNoActive,
          ]}
          onPress={handleNo}
          activeOpacity={0.75}
          accessibilityRole="button"
          accessibilityLabel="Mark as not done"
          accessibilityState={{ selected: state === "no" }}
          hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
        >
          <MaterialCommunityIcons
            name="close-thick"
            size={iconSize}
            color={state === "no" ? theme.colors.danger : theme.colors.muted}
          />
        </TouchableOpacity>
      </Animated.View>
      <Animated.View style={{ transform: [{ scale: yesScale }] }}>
        <TouchableOpacity
          style={[
            styles.binaryBtn,
            { width: size, height: small ? 36 : 40 },
            state === "yes" && styles.binaryYesActive,
          ]}
          onPress={handleYes}
          activeOpacity={0.75}
          accessibilityRole="button"
          accessibilityLabel="Mark as done"
          accessibilityState={{ selected: state === "yes" }}
          hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
        >
          <MaterialCommunityIcons
            name="check-bold"
            size={iconSize}
            color={state === "yes" ? theme.colors.success : theme.colors.muted}
          />
        </TouchableOpacity>
      </Animated.View>
    </View>
  );
}

const MOOD_LABELS = ["😞", "🙁", "😐", "🙂", "😊"];

const CUSTOM_EMOJIS = [
  "⭐", "🎯", "💧", "🏋️", "📖", "🧘", "🚶", "🥗",
  "🍎", "🥩", "💊", "☀️", "🌙", "📵", "🙏", "✍️",
  "🎨", "🎵", "📞", "🧹", "🐕", "🌿", "💰", "🧠",
  "😴", "🚭", "🍬", "💻", "🧺", "🏃", "🚴", "🧼",
];

const CUSTOM_TYPES: { value: HabitType; label: string; hint: string }[] = [
  { value: "binary", label: "Yes / No", hint: "Did you do it today?" },
  { value: "counter", label: "Counter", hint: "Tap + up to a daily target" },
  { value: "measure", label: "Amount", hint: "Log a number with a unit" },
];

/** Quick-select chips for measure habits, keyed by unit. */
const MEASURE_PRESETS: Record<string, number[]> = {
  kg: [],
  lbs: [120, 140, 160, 180, 200],
  cm: [70, 80, 90],
  min: [15, 30, 45, 60],
  h: [6, 7, 8, 9],
  km: [3, 5, 10],
};

function calculateCompletionScore(
  log: HabitLog,
  activeHabitIds: string[]
): number {
  if (activeHabitIds.length === 0) return 0;
  let total = 0;
  for (const habitId of activeHabitIds) {
    const habit = findHabit(habitId);
    if (!habit) continue;
    if (habit.type === "counter") {
      const value = log.counters?.[habitId] || 0;
      const target = habit.target || 1;
      total += Math.min(Math.max(value / target, 0), 1);
    } else if (habit.type === "measure") {
      total += (log.counters?.[habitId] || 0) > 0 ? 1 : 0;
    } else {
      total += log.completed?.[habitId] === true ? 1 : 0;
    }
  }
  return total / activeHabitIds.length;
}

function getCompletionFillColor(score: number): string {
  // Soft pastel fill (red → green) for the week-strip bars — a touch deeper
  // than the old full-pill tint so a partial fill reads at a glance.
  const hue = Math.round(Math.max(0, Math.min(1, score)) * 120);
  return `hsl(${hue}, 55%, 78%)`;
}

export default function JournalScreen() {
  const router = useRouter();
  const [refreshing, setRefreshing] = useState(false);
  const [log, setLog] = useState<HabitLog | null>(null);
  const weekDays = useMemo(() => buildWeekDays(), []);
  const today = useMemo(() => new Date(), []);
  const todayKey = formatDateKey(today);
  const [selectedKey, setSelectedKey] = useState(todayKey);
  const [dayScores, setDayScores] = useState<Record<string, number>>({});
  const [meals, setMeals] = useState<MealEntry[]>([]);
  const [nutritionTargets, setNutritionTargets] = useState<NutritionTargets | null>(null);
  const [activeHabitIds, setActiveHabitIds] = useState<string[]>([]);
  const [autoFilled, setAutoFilled] = useState<Record<string, boolean>>({});
  const [weightUnit, setWeightUnitState] = useState<WeightUnit>("kg");
  const [distanceUnit, setDistanceUnitState] = useState<DistanceUnit>("km");
  const [editGoalsVisible, setEditGoalsVisible] = useState(false);
  const [habitSearch, setHabitSearch] = useState("");
  // Measure-habit popup (weight, waist, reading minutes, sleep, run km…)
  const [measureHabit, setMeasureHabit] = useState<LibraryHabit | null>(null);

  // Morning brief settings
  const [briefVisible, setBriefVisible] = useState(false);
  const [briefEnabled, setBriefEnabled] = useState(false);
  const [briefHour, setBriefHour] = useState(7);
  const [briefMinute, setBriefMinute] = useState(0);
  const [briefBusy, setBriefBusy] = useState(false);
  const [briefTestState, setBriefTestState] =
    useState<"idle" | "sent" | "error">("idle");
  const briefTestTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (briefTestTimer.current) clearTimeout(briefTestTimer.current);
    };
  }, []);

  // Macro editor state
  const [macroEditorVisible, setMacroEditorVisible] = useState(false);
  const [macroDraft, setMacroDraft] = useState({
    calories: "0",
    proteinG: "0",
    carbsG: "0",
    fatG: "0",
  });

  // Amount modal state
  const [amountModal, setAmountModal] = useState<AmountConfig>({
    visible: false,
    key: "hydration",
    title: "Water",
    emoji: "💧",
    unit: "cups",
    initialValue: 0,
  });

  const monthLabel = today.toLocaleDateString("en-US", {
    month: "short",
    year: "numeric",
  });

  const loadData = useCallback(async () => {
    setRefreshing(true);
    const [dayLog, weightPref, distancePref] = await Promise.all([
      getHabitLog(selectedKey),
      getWeightUnit(),
      getDistanceUnit(),
    ]);
    setWeightUnitState(weightPref);
    setDistanceUnitState(distancePref);
    // Clean old false values from completed (legacy data used false for both "no" and "skip")
    if (dayLog.completed) {
      const cleaned: Record<string, boolean> = {};
      for (const [key, val] of Object.entries(dayLog.completed)) {
        if (val === true) cleaned[key] = true;
      }
      dayLog.completed = cleaned;
    }
    setLog(dayLog);
    const dayMeals = await getMeals(selectedKey);
    setMeals(dayMeals);

    const plan = await loadPlan();
    setNutritionTargets(plan?.nutrition ?? null);

    // Load the full library (built-ins + customs) first so completion
    // scores below resolve custom habits too.
    try {
      const full = await refreshHabitLibrary();
      setCustomHabits(full.filter((h) => isCustomHabitId(h.id)));
    } catch {
      setCustomHabits([]);
    }

    // Load active habits
    let ids = await getActiveHabitIds();
    // Seed defaults on first launch so the journal isn't empty
    if (ids.length === 0) {
      ids = ["sugar", "keto", "low_carbs", "device_bed"];
      await saveActiveHabitIds(ids);
    }
    setActiveHabitIds(ids);

    // Auto-fill habits from logged data (meals, workouts, sleep, weight,
    // hydration). Only blank or still-auto values are touched, so anything
    // the user entered by hand wins; habits with no source data stay blank.
    try {
      const { log: filled, auto } = await applyHabitAutofill(selectedKey, dayLog);
      setLog({ ...filled });
      setAutoFilled(auto);
    } catch {
      // Autofill is best-effort; never block the journal on it.
      setLog({ ...dayLog });
      setAutoFilled({});
    }

    // Compute habit completion score for each calendar day
    const scores: Record<string, number> = {};
    await Promise.all(
      weekDays.map(async (d) => {
        const key = formatDateKey(d);
        const l = await getHabitLog(key);
        scores[key] = calculateCompletionScore(l, ids);
      })
    );
    setDayScores(scores);
    setRefreshing(false);

    // Keep the morning brief's content fresh (no-op unless enabled).
    ensureMorningBriefScheduled().catch(() => {});
  }, [selectedKey, weekDays]);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData])
  );

  const habitState = (id: string): "yes" | "no" | "skip" => {
    if (!log) return "skip";
    if (log.completed[id] === true) return "yes";
    if (id in (log.completed || {})) return "no";
    return "skip";
  };

  const handleTriState = async (habitId: string, state: "yes" | "no" | "skip") => {
    const updated = await getHabitLog(selectedKey);
    if (state === "yes") {
      updated.completed[habitId] = true;
    } else if (state === "no") {
      updated.completed[habitId] = false;
    } else {
      delete updated.completed[habitId];
    }
    await saveHabitLog(updated);
    setLog({ ...updated });
    // A hand-entered value stops being "auto".
    setAutoFilled((prev) => {
      if (!prev[habitId]) return prev;
      const next = { ...prev };
      delete next[habitId];
      return next;
    });
  };

  const handleCounter = async (habitId: string, nextValue: number) => {
    const updated = await setHabitCounter(selectedKey, habitId, nextValue);
    setLog({ ...updated });
    // A hand-entered value stops being "auto".
    setAutoFilled((prev) => {
      if (!prev[habitId]) return prev;
      const next = { ...prev };
      delete next[habitId];
      return next;
    });
  };

  /** Converts a stored measure value to the display unit preference. */
  const measureDisplay = (
    habit: LibraryHabit,
    count: number
  ): { value?: string; unit?: string } => {
    if (count <= 0) return {};
    if (habit.id === "weight_kg" && weightUnit === "lb") {
      return { value: kgToLbs(count).toFixed(1), unit: "lbs" };
    }
    if (habit.id === "run_km" && distanceUnit === "mi") {
      return { value: (count / 1.609344).toFixed(1), unit: "mi" };
    }
    if (habit.id === "sleep_hours") {
      return { value: formatSleepDuration(count), unit: "" };
    }
    return { value: count.toFixed(habit.decimals ?? 0), unit: habit.unit };
  };

  const openMeasureHabit = (habit: LibraryHabit) => {
    setMeasureHabit(habit);
  };

  const handleMeasureHabitSave = async (value: number) => {
    if (!measureHabit) return;
    const decimals = measureHabit.decimals ?? 0;
    const factor = Math.pow(10, decimals);
    // The modal shows the user's preferred unit; store in the habit's unit.
    const stored =
      measureHabit.id === "weight_kg" && weightUnit === "lb"
        ? lbsToKg(value)
        : measureHabit.id === "run_km" && distanceUnit === "mi"
          ? value * 1.609344
          : value;
    const rounded = Math.round(stored * factor) / factor;
    const updated = await setHabitCounter(selectedKey, measureHabit.id, rounded);
    // A fresh weigh-in keeps the onboarding profile current so calorie and
    // protein targets stay personalized. Past-day edits don't touch it.
    if (measureHabit.id === "weight_kg" && selectedKey === todayKey) {
      try {
        await patchHealthProfile({ weightKg: Math.round(rounded * 10) / 10 });
      } catch (e) {
        console.warn("[Journal] profile weight sync failed:", e);
      }
    }
    setLog({ ...updated });
    setMeasureHabit(null);
    // A hand-entered value stops being "auto".
    if (measureHabit) {
      const editedId = measureHabit.id;
      setAutoFilled((prev) => {
        if (!prev[editedId]) return prev;
        const next = { ...prev };
        delete next[editedId];
        return next;
      });
    }
  };

  const openMacroEditor = () => {
    const t = nutritionTargets;
    if (!t) return;
    setMacroDraft({
      calories: String(t.calories),
      proteinG: String(t.proteinG),
      carbsG: String(t.carbsG),
      fatG: String(t.fatG),
    });
    setMacroEditorVisible(true);
  };

  const bumpMacro = (key: keyof typeof macroDraft, delta: number) => {
    setMacroDraft((prev) => {
      const current = parseInt(prev[key], 10);
      const next = Math.max(0, (isNaN(current) ? 0 : current) + delta);
      return { ...prev, [key]: String(next) };
    });
  };

  const setMacroValue = (key: keyof typeof macroDraft, text: string) => {
    const cleaned = text.replace(/[^0-9]/g, "");
    setMacroDraft((prev) => ({ ...prev, [key]: cleaned }));
  };

  const handleMacroSave = async () => {
    if (!nutritionTargets) return;
    const toInt = (s: string, fallback: number) => {
      const n = parseInt(s, 10);
      return isNaN(n) ? fallback : n;
    };
    const updated = await updateNutritionTargets({
      calories: toInt(macroDraft.calories, nutritionTargets.calories),
      proteinG: toInt(macroDraft.proteinG, nutritionTargets.proteinG),
      carbsG: toInt(macroDraft.carbsG, nutritionTargets.carbsG),
      fatG: toInt(macroDraft.fatG, nutritionTargets.fatG),
    });
    if (updated) setNutritionTargets(updated.nutrition);
    setMacroEditorVisible(false);
  };

  const openAmountModal = (
    key: "hydration" | "mood",
    title: string,
    emoji: string,
    unit: string
  ) => {
    const initialValue = log ? log[key] : 0;
    setAmountModal({
      visible: true,
      key,
      title,
      emoji,
      unit,
      initialValue: typeof initialValue === "number" ? initialValue : 0,
    });
  };

  const handleAmountSave = async (value: number) => {
    const updated = await updateHabitValue(selectedKey, amountModal.key, value);
    // The water counter mirrors hydration (cups ≈ glasses) until the user
    // sets it by hand.
    if (amountModal.key === "hydration" && activeHabitIds.includes("water_goal")) {
      const current = updated.counters["water_goal"] ?? 0;
      if (current === 0 || autoFilled["water_goal"]) {
        if (value > 0) {
          updated.counters["water_goal"] = Math.round(value);
          await saveHabitLog(updated);
          setAutoFilled((prev) => ({ ...prev, water_goal: true }));
        } else if (autoFilled["water_goal"] && current !== 0) {
          delete updated.counters["water_goal"];
          await saveHabitLog(updated);
          setAutoFilled((prev) => {
            const next = { ...prev };
            delete next["water_goal"];
            return next;
          });
        }
      }
    }
    setLog({ ...updated });
  };

  const handleMoodSelect = async (value: number) => {
    const updated = await updateHabitValue(selectedKey, "mood", value);
    setLog({ ...updated });
  };

  const formatAmount = (key: "hydration" | "mood"): string => {
    if (!log) return "—";
    const val = log[key];
    if (typeof val !== "number") return "—";
    if (key === "mood") return MOOD_LABELS[Math.round(val)] ?? "—";
    return val > 0 ? val.toString() : "—";
  };

  const formatUnit = (key: "hydration" | "mood"): string => {
    if (!log) return "";
    const val = log[key];
    if (typeof val !== "number" || val <= 0) return "";
    if (key === "hydration") return "cups";
    return "";
  };

  // User-created habits, merged under the built-in library.
  const [customHabits, setCustomHabits] = useState<LibraryHabit[]>([]);
  const library = useMemo(
    () => [...HABIT_LIBRARY, ...customHabits],
    [customHabits]
  );

  // Build active habits list from library
  const activeHabits = useMemo(() => {
    return activeHabitIds
      .map((id) => library.find((h) => h.id === id))
      .filter(Boolean) as LibraryHabit[];
  }, [activeHabitIds, library]);

  const daytimeHabits = activeHabits.filter((h) => h.category === "daytime");
  const nighttimeHabits = activeHabits.filter((h) => h.category === "nighttime");

  // Search-filtered library for the edit modal (customs first — they're yours)
  const filteredLibrary = useMemo(() => {
    const q = habitSearch.toLowerCase().trim();
    const base = q
      ? library.filter(
          (h) => h.label.toLowerCase().includes(q) || h.id.toLowerCase().includes(q)
        )
      : library;
    return [...base].sort((a, b) => {
      const aCustom = isCustomHabitId(a.id) ? 0 : 1;
      const bCustom = isCustomHabitId(b.id) ? 0 : 1;
      return aCustom - bCustom;
    });
  }, [habitSearch, library]);

  // Handle adding a habit
  const handleAddHabit = async (id: string) => {
    const updated = await addActiveHabit(id);
    setActiveHabitIds(updated);
  };

  // Handle removing a habit
  const handleRemoveHabit = async (id: string) => {
    const updated = await removeActiveHabit(id);
    setActiveHabitIds(updated);
  };

  // ── Custom habits ──────────────────────────────────────────
  const [createVisible, setCreateVisible] = useState(false);
  const [customLabel, setCustomLabel] = useState("");
  const [customEmoji, setCustomEmoji] = useState("⭐");
  const [customType, setCustomType] = useState<HabitType>("binary");
  const [customTarget, setCustomTarget] = useState(4);
  const [customUnit, setCustomUnit] = useState("");
  const [customCategory, setCustomCategory] = useState<"daytime" | "nighttime">("daytime");
  const [customError, setCustomError] = useState<string | null>(null);
  const [customSaving, setCustomSaving] = useState(false);

  const openCreateHabit = () => {
    setCustomLabel("");
    setCustomEmoji("⭐");
    setCustomType("binary");
    setCustomTarget(4);
    setCustomUnit("");
    setCustomCategory("daytime");
    setCustomError(null);
    setCreateVisible(true);
  };

  const refreshCustomState = async () => {
    try {
      const full = await refreshHabitLibrary();
      setCustomHabits(full.filter((h) => isCustomHabitId(h.id)));
    } catch {
      // Keep whatever customs are already in state.
    }
    setActiveHabitIds(await getActiveHabitIds());
  };

  const handleCreateHabit = async () => {
    if (customSaving) return;
    setCustomSaving(true);
    setCustomError(null);
    try {
      const input: CustomHabitInput = {
        label: customLabel.trim(),
        emoji: customEmoji,
        type: customType,
        category: customCategory,
        target: customType === "counter" ? customTarget : undefined,
        unit: customType === "measure" ? customUnit.trim() : undefined,
      };
      await createCustomHabit(input);
      await refreshCustomState();
      setCreateVisible(false);
    } catch (e) {
      setCustomError(e instanceof Error ? e.message : "Could not create that habit.");
    } finally {
      setCustomSaving(false);
    }
  };

  const handleDeleteCustomHabit = async (id: string) => {
    await deleteCustomHabit(id);
    await refreshCustomState();
  };

  // Open edit modal + reset search
  const openEditGoals = () => {
    setHabitSearch("");
    setEditGoalsVisible(true);
  };

  // ── Morning brief handlers ───────────────────────────────
  const openBriefSettings = async () => {
    const settings = await getBriefSettings();
    setBriefEnabled(settings.enabled);
    setBriefHour(settings.hour);
    setBriefMinute(settings.minute);
    setBriefVisible(true);
  };

  const handleBriefToggle = async (value: boolean) => {
    if (briefBusy) return;
    setBriefBusy(true);
    if (value) {
      const ok = await enableMorningBrief(briefHour, briefMinute);
      setBriefEnabled(ok);
    } else {
      await disableMorningBrief();
      setBriefEnabled(false);
    }
    setBriefBusy(false);
  };

  const handleBriefSave = async () => {
    if (briefBusy) return;
    setBriefBusy(true);
    if (briefEnabled) {
      const ok = await enableMorningBrief(briefHour, briefMinute);
      setBriefEnabled(ok);
    }
    setBriefBusy(false);
    setBriefVisible(false);
  };

  const handleTestBrief = async () => {
    if (briefBusy) return;
    setBriefBusy(true);
    const ok = await sendTestBrief();
    setBriefTestState(ok ? "sent" : "error");
    if (briefTestTimer.current) clearTimeout(briefTestTimer.current);
    briefTestTimer.current = setTimeout(() => setBriefTestState("idle"), 2500);
    setBriefBusy(false);
  };

  const selectedDate = weekDays.find((d) => formatDateKey(d) === selectedKey) ?? today;
  const isSelectedToday = selectedKey === todayKey;
  const entriesLabel = isSelectedToday
    ? "Today's entries"
    : selectedDate.toLocaleDateString("en-US", {
        weekday: "long",
        month: "short",
        day: "numeric",
      });

  const nightEnd = new Date(selectedDate);
  nightEnd.setDate(nightEnd.getDate() + 1);
  const nightRange = `${selectedDate.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  })} – ${nightEnd.toLocaleDateString("en-US", { month: "short", day: "numeric" })}`;

  return (
    <View style={styles.container}>
          <GradientWash color={theme.colors.info} />
      {/* Header buttons */}
      <View style={styles.headerButtons}>
        <AnimatedPress onPress={openBriefSettings}>
          <View style={styles.moreButton}>
            <MaterialCommunityIcons name="bell-outline" size={19} color={theme.colors.ink} />
          </View>
        </AnimatedPress>
      </View>

      {/* Title */}
      <View style={styles.header}>
        {/* The opaque header background hides scrolled content, but it also
            covered the top of the background wash — leaving a hard edge at the
            header's bottom. Re-paint the same wash clipped to the header so
            the gradient runs continuously from the very top, like the other
            tabs. */}
        <View style={styles.headerWashClip} pointerEvents="none">
      <GradientWash color={theme.colors.info} />
        </View>
        <Text style={styles.headerTitle}>Journal</Text>
        <Text style={styles.headerMonth}>{monthLabel}</Text>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={loadData} tintColor={theme.colors.muted} />
        }
      >
        {/* Week calendar strip */}
        <View style={styles.calendarStrip}>
          {weekDays.map((date) => {
            const key = formatDateKey(date);
            const isToday =
              date.getFullYear() === today.getFullYear() &&
              date.getMonth() === today.getMonth() &&
              date.getDate() === today.getDate();
            const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate());
            const isFuture = date.getTime() > todayStart.getTime();
            // The selected day reads from the live log so its bar fills as
            // habits are checked off; other days use the cached scores.
            const score =
              key === selectedKey && log && activeHabitIds.length > 0
                ? calculateCompletionScore(log, activeHabitIds)
                : dayScores[key] ?? 0;

            return (
              <DayCell
                key={key}
                label={SHORT_DAYS[date.getDay()]}
                dateNum={date.getDate()}
                score={score}
                isFuture={isFuture}
                isSelected={key === selectedKey}
                isToday={isToday}
                onPress={() => {
                  if (!isFuture) setSelectedKey(key);
                }}
              />
            );
          })}
        </View>

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>{entriesLabel}</Text>
          <TouchableOpacity
            style={styles.editHabitsBtn}
            activeOpacity={0.7}
            onPress={openEditGoals}
          >
            <MaterialCommunityIcons name="pencil-outline" size={13} color={theme.colors.primary} />
            <Text style={styles.editHabitsText}>Edit Habits</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.daytimeLabel}>
          <Text style={styles.daytimeText}>Daytime</Text>
        </View>

        <View style={styles.entriesCard}>
          {daytimeHabits.map((habit, i) => (
            <View key={habit.id}>
              {i > 0 && <View style={styles.entryDivider} />}
              <HabitItem
                habit={habit}
                state={habitState(habit.id)}
                count={log?.counters[habit.id] ?? 0}
                onTriState={(s) => handleTriState(habit.id, s)}
                onCounter={(next) => handleCounter(habit.id, next)}
                onMeasureTap={() => openMeasureHabit(habit)}
                {...measureDisplay(habit, log?.counters[habit.id] ?? 0)}
                auto={autoFilled[habit.id]}
              />
            </View>
          ))}
          {/* Tracked metrics — always shown */}
          {daytimeHabits.length > 0 && <View style={styles.entryDivider} />}
          {/* Daily mood — inline emoji picker */}
          <View style={styles.entryRow}>
            <View style={styles.entryLeft}>
              <Text style={styles.entryEmoji}>😊</Text>
              <Text style={styles.entryLabel}>Daily mood</Text>
            </View>
            <View style={styles.moodPicker}>
              {MOOD_LABELS.map((emoji, i) => {
                const currentMood = log && typeof log.mood === "number" ? Math.round(log.mood) : 2;
                const isActive = currentMood === i;
                return (
                  <TouchableOpacity
                    key={i}
                    onPress={() => handleMoodSelect(i)}
                    style={[
                      styles.moodOption,
                      isActive && styles.moodOptionActive,
                    ]}
                    activeOpacity={0.6}
                  >
                    <Text style={styles.moodEmoji}>{emoji}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
          <View style={styles.entryDivider} />
          <EntryRow
            emoji="💧"
            label="Hydration"
            rightControl="arrow"
            value={formatAmount("hydration")}
            arrowLabel={formatUnit("hydration")}
            onArrow={() => openAmountModal("hydration", "Water", "💧", "cups")}
          />
        </View>

        {nighttimeHabits.length > 0 && (
          <>
            <View style={styles.nighttimeHeader}>
              <Text style={styles.sectionTitle}>Nighttime</Text>
              <Text style={styles.nighttimeDate}>{nightRange}</Text>
            </View>

            <View style={styles.entriesCard}>
              {nighttimeHabits.map((habit, i) => (
                <View key={habit.id}>
                  {i > 0 && <View style={styles.entryDivider} />}
                  <HabitItem
                    habit={habit}
                    state={habitState(habit.id)}
                    count={log?.counters[habit.id] ?? 0}
                    onTriState={(s) => handleTriState(habit.id, s)}
                    onCounter={(next) => handleCounter(habit.id, next)}
                    onMeasureTap={() => openMeasureHabit(habit)}
                    {...measureDisplay(habit, log?.counters[habit.id] ?? 0)}
                    auto={autoFilled[habit.id]}
                  />
                </View>
              ))}
            </View>
          </>
        )}

        {/* Meals section */}
        <View style={styles.mealsSection}>
          <View style={styles.mealsHeader}>
            <Text style={styles.sectionTitle}>Meals</Text>
            <TouchableOpacity
              style={styles.addMealBtn}
              onPress={() => router.push("/meal-options")}
              activeOpacity={0.8}
            >
              <MaterialCommunityIcons name="plus" size={26} color="#FFFFFF" />
            </TouchableOpacity>
          </View>
          <Text style={styles.foodAttribution}>{getFoodDatabaseAttribution()}</Text>
          {meals.length === 0 ? (
            <View style={styles.mealsEmpty}>
              <Text style={styles.mealsEmptyText}>No meals logged</Text>
            </View>
          ) : (
            <View style={styles.mealsCard}>
              {meals.map((m, i) => (
                <View key={m.id}>
                  {i > 0 && <View style={styles.entryDivider} />}
                  <View style={styles.mealRow}>
                    <View style={styles.mealRowLeft}>
                      <MaterialCommunityIcons name="food-apple" size={16} color={theme.colors.success} />
                      <View style={styles.mealRowText}>
                        <Text style={styles.mealRowName}>{m.foodName}</Text>
                        <Text style={styles.mealRowTime}>
                          {new Date(m.timestamp).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}
                          {" · "}{m.servingGrams}g
                        </Text>
                      </View>
                    </View>
                    <View style={styles.mealRowRight}>
                      <Text style={styles.mealRowCals}>{m.calories} cal</Text>
                      <View style={styles.mealActions}>
                        <TouchableOpacity
                          style={styles.mealActionBtn}
                          onPress={() => router.push(`/food-detail?fdcId=${encodeURIComponent(m.fdcId)}&foodName=${encodeURIComponent(m.foodName)}&serving=${m.servingGrams}&mealId=${m.id}&date=${m.date}`)}
                          hitSlop={{ top: 8, bottom: 8, left: 6, right: 6 }}
                        >
                          <MaterialCommunityIcons name="pencil-outline" size={14} color={theme.colors.muted} />
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={styles.mealActionBtn}
                          onPress={async () => {
                            await deleteMeal(selectedKey, m.id);
                            const dayMeals = await getMeals(selectedKey);
                            setMeals(dayMeals);
                          }}
                          hitSlop={{ top: 8, bottom: 8, left: 6, right: 6 }}
                        >
                          <MaterialCommunityIcons name="trash-can-outline" size={14} color={theme.colors.muted} />
                        </TouchableOpacity>
                      </View>
                    </View>
                  </View>
                </View>
              ))}
            </View>
          )}
          {meals.length > 0 && (
            <View style={styles.mealsTotal}>
              <Text style={styles.mealsTotalText}>
                Total: {meals.reduce((s, m) => s + m.calories, 0)} cal ·{" "}
                {meals.reduce((s, m) => s + m.protein, 0).toFixed(1)}g P ·{" "}
                {meals.reduce((s, m) => s + m.carbs, 0).toFixed(1)}g C ·{" "}
                {meals.reduce((s, m) => s + m.fat, 0).toFixed(1)}g F
              </Text>
            </View>
          )}
          <DailyEatingCard meals={meals} />
          <NutritionGoalsCard
            meals={meals}
            targets={nutritionTargets}
            onEdit={openMacroEditor}
          />
        </View>
      </ScrollView>

      {/* Amount modal */}
      <AmountModal
        visible={amountModal.visible}
        title={amountModal.title}
        emoji={amountModal.emoji}
        unit={amountModal.unit}
        initialValue={amountModal.initialValue}
        hideDate
        onSave={handleAmountSave}
        onClose={() => setAmountModal((prev) => ({ ...prev, visible: false }))}
      />

      {/* Measure habit modal — tap a value to type it in */}
      <AmountModal
        visible={measureHabit != null}
        title={measureHabit?.label ?? ""}
        emoji={measureHabit?.emoji ?? "📏"}
        unit={
          measureHabit?.id === "weight_kg" && weightUnit === "lb"
            ? "lbs"
            : measureHabit?.id === "run_km" && distanceUnit === "mi"
              ? "mi"
              : measureHabit?.unit ?? ""
        }
        initialValue={
          measureHabit
            ? measureHabit.id === "weight_kg" && weightUnit === "lb"
              ? kgToLbs(log?.counters[measureHabit.id] ?? 0)
              : measureHabit.id === "run_km" && distanceUnit === "mi"
                ? (log?.counters[measureHabit.id] ?? 0) / 1.609344
                : log?.counters[measureHabit.id] ?? 0
            : 0
        }
        presets={
          measureHabit?.unit
            ? MEASURE_PRESETS[
                measureHabit.id === "weight_kg" && weightUnit === "lb"
                  ? "lbs"
                  : measureHabit.unit
              ] ?? []
            : []
        }
        onSave={handleMeasureHabitSave}
        hideDate
        onClose={() => setMeasureHabit(null)}
      />

      {/* ── Nutrition Goals Modal ────────────────────────────── */}
      <Modal
        visible={macroEditorVisible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setMacroEditorVisible(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity
              onPress={() => setMacroEditorVisible(false)}
              style={styles.modalCloseBtn}
              hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            >
              <MaterialCommunityIcons name="close" size={22} color={theme.colors.ink} />
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Nutrition Goals</Text>
            <View style={{ width: 36 }} />
          </View>

          <ScrollView
            style={styles.modalScroll}
            contentContainerStyle={styles.macroContent}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            <Text style={styles.macroIntro}>
              Set your daily calorie and macro targets. These drive the goals
              card on this screen and the coach chat.
            </Text>

            <MacroField
              label="Calories"
              unit="kcal"
              value={macroDraft.calories}
              onChangeText={(t) => setMacroValue("calories", t)}
              onBump={(d) => bumpMacro("calories", d)}
              color="#202126"
            />
            <MacroField
              label="Protein"
              unit="g"
              value={macroDraft.proteinG}
              onChangeText={(t) => setMacroValue("proteinG", t)}
              onBump={(d) => bumpMacro("proteinG", d)}
              color="#5D8793"
            />
            <MacroField
              label="Carbs"
              unit="g"
              value={macroDraft.carbsG}
              onChangeText={(t) => setMacroValue("carbsG", t)}
              onBump={(d) => bumpMacro("carbsG", d)}
              color="#D69A43"
            />
            <MacroField
              label="Fat"
              unit="g"
              value={macroDraft.fatG}
              onChangeText={(t) => setMacroValue("fatG", t)}
              onBump={(d) => bumpMacro("fatG", d)}
              color="#C96D63"
            />

            <TouchableOpacity
              style={styles.macroSaveBtn}
              onPress={handleMacroSave}
              activeOpacity={0.8}
              accessibilityRole="button"
              accessibilityLabel="Save nutrition goals"
            >
              <MaterialCommunityIcons name="check" size={18} color={theme.colors["on-primary"]} />
              <Text style={styles.macroSaveBtnText}>Save goals</Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      </Modal>

      {/* ── Morning Brief Modal ──────────────────────────────── */}
      <Modal
        visible={briefVisible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setBriefVisible(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity
              onPress={() => setBriefVisible(false)}
              style={styles.modalCloseBtn}
              hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            >
              <MaterialCommunityIcons name="close" size={22} color={theme.colors.ink} />
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Morning Brief</Text>
            <View style={{ width: 36 }} />
          </View>

          <ScrollView
            style={styles.modalScroll}
            contentContainerStyle={styles.briefContent}
            showsVerticalScrollIndicator={false}
          >
            <View style={styles.briefHero}>
              <View style={styles.briefHeroIcon}>
                <MaterialCommunityIcons name="weather-sunset-up" size={28} color={theme.colors.warning} />
              </View>
              <Text style={styles.briefHeroTitle}>Start your day informed</Text>
              <Text style={styles.briefHeroText}>
                Each morning you'll get a notification with how yesterday went —
                goals, steps, sleep, calories — and what today needs from your
                plan. Everything stays on your device.
              </Text>
            </View>

            <View style={styles.briefToggleRow}>
              <View style={styles.briefToggleCopy}>
                <Text style={styles.briefToggleTitle}>Daily morning brief</Text>
                <Text style={styles.briefToggleSub}>
                  {briefEnabled
                    ? `Scheduled for ${formatBriefTime(briefHour, briefMinute)}`
                    : "Off — tap to enable"}
                </Text>
              </View>
              <Switch
                value={briefEnabled}
                onValueChange={handleBriefToggle}
                disabled={briefBusy}
                trackColor={{ true: theme.colors.success, false: theme.colors.border }}
                thumbColor="#FFFFFF"
              />
            </View>

            {briefEnabled && (
              <>
                <Text style={styles.briefSectionTitle}>Time</Text>
                <View style={styles.briefTimeRow}>
                  <View style={styles.briefTimeBlock}>
                    <Text style={styles.briefTimeLabel}>Hour</Text>
                    <View style={styles.briefStepper}>
                      <TouchableOpacity
                        style={styles.briefStepBtn}
                        onPress={() => setBriefHour((h) => (h > 5 ? h - 1 : 5))}
                        activeOpacity={0.7}
                      >
                        <MaterialCommunityIcons name="minus" size={18} color={theme.colors.ink} />
                      </TouchableOpacity>
                      <Text style={styles.briefTimeValue}>
                        {briefHour % 12 === 0 ? 12 : briefHour % 12}
                      </Text>
                      <TouchableOpacity
                        style={styles.briefStepBtn}
                        onPress={() => setBriefHour((h) => (h < 11 ? h + 1 : 11))}
                        activeOpacity={0.7}
                      >
                        <MaterialCommunityIcons name="plus" size={18} color={theme.colors.ink} />
                      </TouchableOpacity>
                    </View>
                  </View>
                  <View style={styles.briefTimeBlock}>
                    <Text style={styles.briefTimeLabel}>Minute</Text>
                    <View style={styles.briefStepper}>
                      <TouchableOpacity
                        style={styles.briefStepBtn}
                        onPress={() => setBriefMinute((m) => (m > 0 ? m - 15 : 45))}
                        activeOpacity={0.7}
                      >
                        <MaterialCommunityIcons name="minus" size={18} color={theme.colors.ink} />
                      </TouchableOpacity>
                      <Text style={styles.briefTimeValue}>
                        {String(briefMinute).padStart(2, "0")}
                      </Text>
                      <TouchableOpacity
                        style={styles.briefStepBtn}
                        onPress={() => setBriefMinute((m) => (m < 45 ? m + 15 : 0))}
                        activeOpacity={0.7}
                      >
                        <MaterialCommunityIcons name="plus" size={18} color={theme.colors.ink} />
                      </TouchableOpacity>
                    </View>
                  </View>
                  <View style={styles.briefAmpm}>
                    <Text style={styles.briefTimeValue}>
                      {briefHour < 12 ? "AM" : "PM"}
                    </Text>
                  </View>
                </View>
              </>
            )}

            <TouchableOpacity
              style={styles.briefTestBtn}
              onPress={handleTestBrief}
              disabled={briefBusy}
              activeOpacity={0.8}
            >
              <MaterialCommunityIcons
                name={
                  briefTestState === "sent"
                    ? "check-circle"
                    : briefTestState === "error"
                      ? "alert-circle-outline"
                      : "bell-outline"
                }
                size={18}
                color={
                  briefTestState === "sent"
                    ? theme.colors.success
                    : briefTestState === "error"
                      ? theme.colors.danger
                      : theme.colors.primary
                }
              />
              <Text
                style={[
                  styles.briefTestText,
                  briefTestState === "sent" && { color: theme.colors.success },
                  briefTestState === "error" && { color: theme.colors.danger },
                ]}
              >
                {briefTestState === "sent"
                  ? "Test brief sent!"
                  : briefTestState === "error"
                    ? "Couldn't send — check notifications"
                    : "Send a test brief now"}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.briefSaveBtn}
              onPress={handleBriefSave}
              disabled={briefBusy}
              activeOpacity={0.85}
            >
              <Text style={styles.briefSaveText}>Done</Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      </Modal>

      {/* ── Edit Goals Modal ─────────────────────────────────── */}
      <Modal
        visible={editGoalsVisible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setEditGoalsVisible(false)}
      >
        <View style={styles.modalContainer}>
          {/* Modal header */}
          <View style={styles.modalHeader}>
            <TouchableOpacity
              onPress={() => setEditGoalsVisible(false)}
              style={styles.modalCloseBtn}
              hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            >
              <MaterialCommunityIcons name="close" size={22} color={theme.colors.ink} />
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Edit Goals</Text>
            <View style={{ width: 36 }} />
          </View>

          {/* Search bar */}
          <View style={styles.modalSearchBar}>
            <MaterialCommunityIcons name="magnify" size={18} color={theme.colors.muted} />
            <TextInput
              style={styles.modalSearchInput}
              placeholder="Search habits..."
              placeholderTextColor={theme.colors.muted}
              value={habitSearch}
              onChangeText={setHabitSearch}
              autoFocus={false}
            />
            {habitSearch.length > 0 && (
              <TouchableOpacity onPress={() => setHabitSearch("")} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                <MaterialCommunityIcons name="close-circle" size={16} color={theme.colors.muted} />
              </TouchableOpacity>
            )}
          </View>

          <ScrollView
            style={styles.modalScroll}
            contentContainerStyle={styles.modalScrollContent}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            {/* Create your own habit */}
            <TouchableOpacity
              style={styles.createHabitBtn}
              onPress={openCreateHabit}
              activeOpacity={0.8}
              accessibilityRole="button"
              accessibilityLabel="Create a custom habit"
            >
              <View style={styles.createHabitIcon}>
                <MaterialCommunityIcons name="plus" size={18} color="#FFFFFF" />
              </View>
              <View style={styles.createHabitCopy}>
                <Text style={styles.createHabitTitle}>Create your own habit</Text>
                <Text style={styles.createHabitSub}>
                  Yes/No, counter, or amount · {customHabits.length}/{MAX_CUSTOM_HABITS} used
                </Text>
              </View>
              <MaterialCommunityIcons name="chevron-right" size={18} color={theme.colors.muted} />
            </TouchableOpacity>

            {/* Active habits — with delete */}
            {!habitSearch && activeHabits.length > 0 && (
              <>
                <Text style={styles.modalSectionTitle}>Your Goals</Text>
                <View style={styles.modalListCard}>
                  {activeHabits.map((habit, i) => (
                    <View key={habit.id}>
                      {i > 0 && <View style={styles.entryDivider} />}
                      <View style={styles.modalHabitRow}>
                        <View style={styles.modalHabitInfo}>
                          <Text style={styles.modalHabitEmoji}>{habit.emoji}</Text>
                          <Text style={styles.modalHabitLabel}>{habit.label}</Text>
                        </View>
                        <TouchableOpacity
                          style={styles.modalDeleteBtn}
                          onPress={() => handleRemoveHabit(habit.id)}
                          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                        >
                          <MaterialCommunityIcons name="trash-can-outline" size={18} color={theme.colors.danger} />
                        </TouchableOpacity>
                      </View>
                    </View>
                  ))}
                </View>
              </>
            )}

            {/* Library — add habits */}
            <Text style={styles.modalSectionTitle}>
              {habitSearch ? `Results (${filteredLibrary.length})` : "Library"}
            </Text>
            <View style={styles.modalListCard}>
              {filteredLibrary.length === 0 ? (
                <View style={styles.modalEmptyLibrary}>
                  <Text style={styles.modalEmptyText}>No matching habits found</Text>
                </View>
              ) : (
                filteredLibrary.map((habit, i) => {
                  const isActive = activeHabitIds.includes(habit.id);
                  const isCustom = isCustomHabitId(habit.id);
                  return (
                    <View key={habit.id}>
                      {i > 0 && <View style={styles.entryDivider} />}
                      <View style={styles.modalHabitRow}>
                        <View style={styles.modalHabitInfo}>
                          <Text style={styles.modalHabitEmoji}>{habit.emoji}</Text>
                          <View style={styles.modalHabitTextCol}>
                            <View style={styles.modalHabitTitleRow}>
                              <Text style={styles.modalHabitLabel} numberOfLines={1}>
                                {habit.label}
                              </Text>
                              {isCustom && (
                                <View style={styles.customBadge}>
                                  <Text style={styles.customBadgeText}>yours</Text>
                                </View>
                              )}
                            </View>
                            <Text style={styles.modalHabitCategory}>
                              {habit.category === "daytime" ? "Daytime" : "Nighttime"}
                              {habit.type === "counter" && habit.target
                                ? ` · target ${habit.target}`
                                : habit.type === "measure" && habit.unit
                                  ? ` · ${habit.unit}`
                                  : ""}
                            </Text>
                          </View>
                        </View>
                        <View style={styles.modalHabitActions}>
                          {isCustom && (
                            <TouchableOpacity
                              style={styles.modalCustomDeleteBtn}
                              onPress={() => handleDeleteCustomHabit(habit.id)}
                              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                              accessibilityLabel={`Delete ${habit.label} forever`}
                            >
                              <MaterialCommunityIcons name="trash-can-outline" size={17} color={theme.colors.danger} />
                            </TouchableOpacity>
                          )}
                          {isActive ? (
                            <View style={styles.modalAddedBadge}>
                              <MaterialCommunityIcons name="check" size={14} color={theme.colors.success} />
                              <Text style={styles.modalAddedText}>Added</Text>
                            </View>
                          ) : (
                            <TouchableOpacity
                              style={styles.modalAddBtn}
                              onPress={() => handleAddHabit(habit.id)}
                              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                            >
                              <MaterialCommunityIcons name="plus-circle-outline" size={20} color={theme.colors.primary} />
                            </TouchableOpacity>
                          )}
                        </View>
                      </View>
                    </View>
                  );
                })
              )}
            </View>
          </ScrollView>
        </View>
      </Modal>

      {/* ── Create Custom Habit Modal ──────────────────────── */}
      <Modal
        visible={createVisible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setCreateVisible(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity
              onPress={() => setCreateVisible(false)}
              style={styles.modalCloseBtn}
              hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            >
              <MaterialCommunityIcons name="close" size={22} color={theme.colors.ink} />
            </TouchableOpacity>
            <Text style={styles.modalTitle}>New habit</Text>
            <View style={{ width: 36 }} />
          </View>

          <ScrollView
            style={styles.modalScroll}
            contentContainerStyle={styles.modalScrollContent}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            <Text style={styles.modalSectionTitle}>Name</Text>
            <View style={styles.createInputWrap}>
              <TextInput
                style={styles.createInput}
                placeholder="e.g. Read 10 pages"
                placeholderTextColor={theme.colors.muted}
                value={customLabel}
                onChangeText={(t) => setCustomLabel(t.slice(0, 40))}
                maxLength={40}
                returnKeyType="done"
              />
            </View>

            <Text style={styles.modalSectionTitle}>Icon</Text>
            <View style={styles.emojiGrid}>
              {CUSTOM_EMOJIS.map((emoji) => {
                const selected = customEmoji === emoji;
                return (
                  <TouchableOpacity
                    key={emoji}
                    style={[styles.emojiOption, selected && styles.emojiOptionSelected]}
                    onPress={() => setCustomEmoji(emoji)}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.emojiOptionText}>{emoji}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <Text style={styles.modalSectionTitle}>Type</Text>
            <View style={styles.createTypeList}>
              {CUSTOM_TYPES.map((t) => {
                const selected = customType === t.value;
                return (
                  <TouchableOpacity
                    key={t.value}
                    style={[styles.createTypeRow, selected && styles.createTypeRowSelected]}
                    onPress={() => setCustomType(t.value)}
                    activeOpacity={0.8}
                  >
                    <View style={[styles.createTypeRadio, selected && styles.createTypeRadioSelected]}>
                      {selected && (
                        <MaterialCommunityIcons name="check" size={13} color="#FFFFFF" />
                      )}
                    </View>
                    <View style={styles.createTypeCopy}>
                      <Text style={styles.createTypeLabel}>{t.label}</Text>
                      <Text style={styles.createTypeHint}>{t.hint}</Text>
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>

            {customType === "counter" && (
              <>
                <Text style={styles.modalSectionTitle}>Daily target</Text>
                <View style={styles.createTargetRow}>
                  <TouchableOpacity
                    style={styles.createStepBtn}
                    onPress={() => setCustomTarget((v) => Math.max(1, v - 1))}
                    activeOpacity={0.7}
                    accessibilityLabel="Decrease target"
                  >
                    <MaterialCommunityIcons name="minus" size={18} color={theme.colors.ink} />
                  </TouchableOpacity>
                  <Text style={styles.createTargetValue}>{customTarget}</Text>
                  <TouchableOpacity
                    style={styles.createStepBtn}
                    onPress={() => setCustomTarget((v) => Math.min(99, v + 1))}
                    activeOpacity={0.7}
                    accessibilityLabel="Increase target"
                  >
                    <MaterialCommunityIcons name="plus" size={18} color={theme.colors.ink} />
                  </TouchableOpacity>
                </View>
              </>
            )}

            {customType === "measure" && (
              <>
                <Text style={styles.modalSectionTitle}>Unit</Text>
                <View style={styles.createInputWrap}>
                  <TextInput
                    style={styles.createInput}
                    placeholder="e.g. min, pages, km"
                    placeholderTextColor={theme.colors.muted}
                    value={customUnit}
                    onChangeText={(t) => setCustomUnit(t.slice(0, 8))}
                    maxLength={8}
                    returnKeyType="done"
                  />
                </View>
              </>
            )}

            <Text style={styles.modalSectionTitle}>When</Text>
            <View style={styles.createWhenRow}>
              {(["daytime", "nighttime"] as const).map((c) => {
                const selected = customCategory === c;
                return (
                  <TouchableOpacity
                    key={c}
                    style={[styles.createWhenChip, selected && styles.createWhenChipSelected]}
                    onPress={() => setCustomCategory(c)}
                    activeOpacity={0.8}
                  >
                    <Text style={[styles.createWhenText, selected && styles.createWhenTextSelected]}>
                      {c === "daytime" ? "Daytime" : "Nighttime"}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {customError && <Text style={styles.createError}>{customError}</Text>}

            <TouchableOpacity
              style={[
                styles.createSaveBtn,
                (!customLabel.trim() || customSaving) && styles.createSaveBtnDisabled,
              ]}
              onPress={handleCreateHabit}
              disabled={!customLabel.trim() || customSaving}
              activeOpacity={0.85}
              accessibilityRole="button"
              accessibilityLabel="Save custom habit"
            >
              <MaterialCommunityIcons name="check" size={18} color={theme.colors["on-primary"]} />
              <Text style={styles.createSaveBtnText}>
                {customSaving ? "Saving…" : "Add to my goals"}
              </Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.bg,
  },
  headerButtons: {
    position: "absolute",
    top: 54,
    right: theme.spacing.xl,
    zIndex: 100,
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing.sm,
  },
  moreButton: {
    width: 32,
    height: 32,
    borderRadius: theme.radii.full,
    backgroundColor: theme.colors.card,
    borderWidth: 1,
    borderColor: theme.colors.border,
    alignItems: "center",
    justifyContent: "center",
  },
  header: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    zIndex: 99,
    paddingTop: 54,
    paddingHorizontal: theme.spacing.xl,
    backgroundColor: theme.colors.bg,
    paddingBottom: theme.spacing.xs,
  },
  headerWashClip: {
    ...StyleSheet.absoluteFillObject,
    overflow: "hidden",
  },
  headerTitle: {
    ...theme.typography.displayMd,
    color: theme.colors.ink,
  },
  headerMonth: {
    ...theme.typography.bodyMd,
    color: theme.colors.muted,
    marginTop: 2,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingTop: 120,
    paddingHorizontal: theme.spacing.xl,
    paddingBottom: theme.spacing.xxxl * 3 + theme.spacing.xxl,
  },
  calendarStrip: {
    flexDirection: "row",
    justifyContent: "space-between",
    backgroundColor: theme.colors.card,
    borderRadius: theme.radii.xl,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.md,
    ...theme.shadows.card,
  },
  calendarRing: {
    padding: 4,
    borderRadius: 26,
    borderWidth: 2,
    borderColor: "transparent",
  },
  calendarRingSelected: {
    borderColor: theme.colors.danger,
  },
  calendarRingToday: {
    borderStyle: "dashed",
    borderColor: theme.colors.muted,
  },
  calendarPill: {
    alignItems: "center",
    justifyContent: "center",
    width: 44,
    height: CALENDAR_PILL_HEIGHT,
    borderRadius: 24,
    gap: 3,
    backgroundColor: theme.colors.surfaceElevated,
    // Clip the completion fill to the pill's rounded corners.
    overflow: "hidden",
  },
  calendarPillFuture: {
    opacity: 0.7,
  },
  calendarPillFill: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    borderTopLeftRadius: 10,
    borderTopRightRadius: 10,
  },
  calendarDayName: {
    fontSize: 10,
    letterSpacing: 0.5,
    fontFamily: "Nunito_600SemiBold",
    fontWeight: "600",
  },
  calendarDate: {
    ...theme.typography.bodyMd,
    fontFamily: "Nunito_700Bold",
    fontWeight: "700",
    fontSize: 15,
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: theme.spacing.xs,
    paddingHorizontal: theme.spacing.xs,
  },
  sectionTitle: {
    ...theme.typography.titleSm,
    color: theme.colors.ink,
  },
  editHabitsBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: 4,
  },
  editHabitsText: {
    ...theme.typography.caption,
    color: theme.colors.primary,
    fontFamily: "Nunito_600SemiBold",
    fontWeight: "600",
  },
  daytimeLabel: {
    paddingHorizontal: theme.spacing.xs,
    marginBottom: theme.spacing.sm,
  },
  daytimeText: {
    ...theme.typography.legal,
    color: theme.colors.muted,
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  entriesCard: {
    backgroundColor: theme.colors.card,
    borderRadius: theme.radii.xl,
    borderWidth: 1,
    borderColor: theme.colors.border,
    paddingHorizontal: theme.spacing.xl,
    marginBottom: theme.spacing.md,
    ...theme.shadows.card,
  },
  entryRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: theme.spacing.md,
    gap: theme.spacing.sm,
  },
  entryLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing.md,
    flex: 1,
    minWidth: 0,
    paddingRight: theme.spacing.xs,
  },
  entryEmoji: {
    fontSize: 18,
  },
  entryLabel: {
    ...theme.typography.bodyMd,
    color: theme.colors.ink,
    flexShrink: 1,
  },
  entryDivider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: theme.colors.border,
    marginLeft: theme.spacing.xl,
  },
  binaryRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  binaryBtn: {
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: theme.colors.surfaceElevated,
    borderRadius: theme.radii.pill,
    borderWidth: 1.5,
    borderColor: theme.colors.border,
  },
  binaryNoActive: {
    backgroundColor: `${theme.colors.danger}14`,
    borderColor: `${theme.colors.danger}55`,
    ...theme.shadows.cardSoft,
  },
  binaryYesActive: {
    backgroundColor: `${theme.colors.success}14`,
    borderColor: `${theme.colors.success}55`,
    ...theme.shadows.cardSoft,
  },
  stepperRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    flexShrink: 0,
  },
  stepperBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: theme.colors.card,
    borderWidth: 1.5,
    borderColor: theme.colors.border,
    flexShrink: 0,
  },
  stepperBtnDisabled: {
    opacity: 0.4,
  },
  stepperPlus: {
    backgroundColor: theme.colors.ink,
    borderColor: theme.colors.ink,
    ...theme.shadows.cardSoft,
  },
  stepperPlusDone: {
    backgroundColor: theme.colors.success,
    borderColor: theme.colors.success,
  },
  stepperTrack: {
    width: TRACK_WIDTH,
    height: 36,
    paddingHorizontal: 8,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
    backgroundColor: theme.colors.surfaceElevated,
    borderRadius: theme.radii.pill,
    borderWidth: TRACK_BORDER,
    borderColor: theme.colors.border,
    overflow: "hidden",
    flexShrink: 0,
  },
  stepperFill: {
    position: "absolute",
    left: 0,
    top: 0,
    bottom: 0,
    borderRadius: theme.radii.pill,
  },
  stepperText: {
    ...theme.typography.bodyMd,
    textAlign: "center",
    includeFontPadding: false,
  },
  stepperValue: {
    fontFamily: "Nunito_700Bold",
    fontWeight: "700",
    fontSize: 16,
    color: theme.colors.ink,
  },
  stepperTarget: {
    fontFamily: "Nunito_500Medium",
    fontWeight: "500",
    fontSize: 12,
    color: theme.colors.muted,
  },
  stepperDoneDot: {
    width: 18,
    height: 18,
    borderRadius: 9,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: `${theme.colors.success}18`,
  },
  measureButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing.xs,
    backgroundColor: theme.colors.surfaceElevated,
    borderRadius: theme.radii.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
  },
  measureValue: {
    ...theme.typography.bodyMd,
    fontFamily: "Nunito_600SemiBold",
    fontWeight: "600",
    color: theme.colors.ink,
    minWidth: 34,
    textAlign: "right",
  },
  measureUnit: {
    ...theme.typography.legal,
    color: theme.colors.muted,
  },
  autoBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: theme.radii.pill,
    backgroundColor: `${theme.colors.info}15`,
  },
  autoBadgeText: {
    ...theme.typography.legal,
    fontSize: 9,
    color: theme.colors.info,
    fontFamily: "Nunito_600SemiBold",
    fontWeight: "600",
  },
  autoRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    flexShrink: 0,
  },
  arrowButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing.xs,
    paddingVertical: theme.spacing.xs,
    paddingLeft: theme.spacing.sm,
  },
  arrowValue: {
    ...theme.typography.bodyMd,
    color: theme.colors.muted,
    fontFamily: "Nunito_600SemiBold",
    fontWeight: "600",
  },
  arrowLabel: {
    ...theme.typography.legal,
    color: theme.colors.muted,
  },
  moodPicker: {
    flexDirection: "row",
    gap: 2,
    alignItems: "center",
  },
  moodOption: {
    width: 32,
    height: 32,
    borderRadius: theme.radii.full,
    alignItems: "center",
    justifyContent: "center",
  },
  moodOptionActive: {
    backgroundColor: theme.colors.surfaceElevated,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  moodEmoji: {
    fontSize: 17,
  },
  nighttimeHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: theme.spacing.sm,
    paddingHorizontal: theme.spacing.xs,
  },
  nighttimeDate: {
    ...theme.typography.legal,
    color: theme.colors.muted,
  },
  mealsSection: {
    marginTop: theme.spacing.xs,
    marginBottom: theme.spacing.md,
  },
  mealsHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: theme.spacing.xs,
    marginBottom: theme.spacing.sm,
  },
  addMealBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: theme.colors.lime,
    alignItems: "center",
    justifyContent: "center",
    elevation: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
  },
  foodAttribution: {
    ...theme.typography.legal,
    color: theme.colors.muted,
    marginBottom: theme.spacing.sm,
    paddingHorizontal: theme.spacing.xs,
  },
  mealsEmpty: {
    backgroundColor: theme.colors.surfaceElevated,
    borderRadius: theme.radii.xl,
    borderWidth: 0,
    borderColor: "transparent",
    paddingVertical: theme.spacing.xl,
    alignItems: "center",
  },
  mealsEmptyText: {
    ...theme.typography.caption,
    color: theme.colors.muted,
  },
  mealsCard: {
    backgroundColor: theme.colors.card,
    borderRadius: theme.radii.xl,
    borderWidth: 1,
    borderColor: theme.colors.border,
    paddingHorizontal: theme.spacing.xl,
    ...theme.shadows.card,
  },
  mealRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: theme.spacing.sm,
  },
  mealRowLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing.sm,
    flex: 1,
  },
  mealRowText: {
    flex: 1,
  },
  mealRowName: {
    ...theme.typography.bodyMd,
    color: theme.colors.ink,
  },
  mealRowTime: {
    ...theme.typography.legal,
    color: theme.colors.muted,
    marginTop: 1,
  },
  mealRowRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing.sm,
  },
  mealActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 2,
    marginLeft: theme.spacing.xs,
  },
  mealActionBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  mealRowCals: {
    ...theme.typography.labelMd,
    color: theme.colors.body,
    fontFamily: "Nunito_600SemiBold",
    fontWeight: "600",
  },
  mealsTotal: {
    marginTop: theme.spacing.xs,
    paddingHorizontal: theme.spacing.xs,
  },
  mealsTotalText: {
    ...theme.typography.legal,
    color: theme.colors.muted,
  },
  // ── Edit Goals Modal ───────────────────────────────
  modalContainer: {
    flex: 1,
    backgroundColor: theme.colors.bg,
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: theme.spacing.xl,
    paddingTop: 20,
    paddingBottom: theme.spacing.sm,
  },
  modalCloseBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: theme.colors.surfaceElevated,
    alignItems: "center",
    justifyContent: "center",
  },
  modalTitle: {
    ...theme.typography.titleLg,
    color: theme.colors.ink,
  },
  modalSearchBar: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing.sm,
    marginHorizontal: theme.spacing.xl,
    marginBottom: theme.spacing.lg,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    backgroundColor: theme.colors.card,
    borderRadius: theme.radii.lg,
    borderWidth: 1,
    borderColor: theme.colors.border,
    ...theme.shadows.cardSoft,
  },
  modalSearchInput: {
    flex: 1,
    ...theme.typography.bodyMd,
    color: theme.colors.ink,
    paddingVertical: 4,
  },
  modalScroll: {
    flex: 1,
  },
  modalScrollContent: {
    paddingHorizontal: theme.spacing.xl,
    paddingBottom: theme.spacing.xxxl * 2,
  },
  modalSectionTitle: {
    ...theme.typography.titleSm,
    color: theme.colors.ink,
    marginBottom: theme.spacing.sm,
    marginTop: theme.spacing.sm,
  },
  modalListCard: {
    backgroundColor: theme.colors.card,
    borderRadius: theme.radii.lg,
    borderWidth: 1,
    borderColor: theme.colors.border,
    paddingHorizontal: theme.spacing.xl,
    marginBottom: theme.spacing.md,
    ...theme.shadows.card,
  },
  modalHabitRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: theme.spacing.md,
  },
  modalHabitInfo: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing.md,
    flex: 1,
  },
  modalHabitEmoji: {
    fontSize: 20,
  },
  modalHabitLabel: {
    ...theme.typography.bodyMd,
    color: theme.colors.ink,
  },
  modalHabitCategory: {
    ...theme.typography.legal,
    color: theme.colors.muted,
    marginTop: 1,
  },
  modalDeleteBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: `${theme.colors.danger}12`,
  },
  modalAddBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: `${theme.colors.primary}10`,
  },
  modalAddedBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: theme.radii.pill,
    backgroundColor: `${theme.colors.success}12`,
    borderWidth: 1,
    borderColor: `${theme.colors.success}30`,
  },
  modalAddedText: {
    ...theme.typography.legal,
    color: theme.colors.success,
    fontFamily: "Nunito_600SemiBold",
    fontWeight: "600",
  },
  modalEmptyLibrary: {
    paddingVertical: theme.spacing.xl,
    alignItems: "center",
  },
  modalEmptyText: {
    ...theme.typography.caption,
    color: theme.colors.muted,
  },
  modalHabitTextCol: {
    flex: 1,
    minWidth: 0,
  },
  modalHabitTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  customBadge: {
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: theme.radii.pill,
    backgroundColor: `${theme.colors.lilac}15`,
    borderWidth: 1,
    borderColor: `${theme.colors.lilac}40`,
    flexShrink: 0,
  },
  customBadgeText: {
    ...theme.typography.legal,
    fontSize: 9,
    color: theme.colors.lilac,
    fontFamily: "Nunito_700Bold",
    fontWeight: "700",
  },
  modalHabitActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    flexShrink: 0,
  },
  modalCustomDeleteBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: `${theme.colors.danger}10`,
  },
  // ── Create custom habit ──────────────────────────────
  createHabitBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing.md,
    backgroundColor: theme.colors.ink,
    borderRadius: theme.radii.lg,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.lg,
    ...theme.shadows.card,
  },
  createHabitIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#FFFFFF22",
    alignItems: "center",
    justifyContent: "center",
  },
  createHabitCopy: {
    flex: 1,
  },
  createHabitTitle: {
    ...theme.typography.labelMd,
    color: "#FFFFFF",
  },
  createHabitSub: {
    ...theme.typography.legal,
    color: "#FFFFFF99",
    marginTop: 1,
  },
  createInputWrap: {
    backgroundColor: theme.colors.card,
    borderRadius: theme.radii.lg,
    borderWidth: 1,
    borderColor: theme.colors.border,
    paddingHorizontal: theme.spacing.lg,
    marginBottom: theme.spacing.md,
    ...theme.shadows.cardSoft,
  },
  createInput: {
    ...theme.typography.bodyMd,
    color: theme.colors.ink,
    paddingVertical: theme.spacing.md,
  },
  emojiGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    backgroundColor: theme.colors.card,
    borderRadius: theme.radii.lg,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.md,
  },
  emojiOption: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: theme.colors.surfaceElevated,
    borderWidth: 1.5,
    borderColor: "transparent",
  },
  emojiOptionSelected: {
    borderColor: theme.colors.primary,
    backgroundColor: `${theme.colors.primary}10`,
  },
  emojiOptionText: {
    fontSize: 20,
  },
  createTypeList: {
    gap: theme.spacing.sm,
    marginBottom: theme.spacing.md,
  },
  createTypeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing.md,
    backgroundColor: theme.colors.card,
    borderRadius: theme.radii.lg,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: theme.spacing.md,
  },
  createTypeRowSelected: {
    borderColor: theme.colors.primary,
    backgroundColor: `${theme.colors.primary}06`,
  },
  createTypeRadio: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: theme.colors.surfaceElevated,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  createTypeRadioSelected: {
    backgroundColor: theme.colors.primary,
    borderColor: theme.colors.primary,
  },
  createTypeCopy: {
    flex: 1,
  },
  createTypeLabel: {
    ...theme.typography.labelMd,
    color: theme.colors.ink,
  },
  createTypeHint: {
    ...theme.typography.legal,
    color: theme.colors.muted,
    marginTop: 1,
  },
  createTargetRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: theme.spacing.lg,
    backgroundColor: theme.colors.card,
    borderRadius: theme.radii.lg,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.md,
  },
  createStepBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: theme.colors.surfaceElevated,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  createTargetValue: {
    ...theme.typography.displayMd,
    color: theme.colors.ink,
    minWidth: 60,
    textAlign: "center",
  },
  createWhenRow: {
    flexDirection: "row",
    gap: theme.spacing.sm,
    marginBottom: theme.spacing.md,
  },
  createWhenChip: {
    flex: 1,
    alignItems: "center",
    paddingVertical: theme.spacing.md,
    borderRadius: theme.radii.md,
    backgroundColor: theme.colors.card,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  createWhenChipSelected: {
    backgroundColor: theme.colors.primary,
    borderColor: theme.colors.primary,
  },
  createWhenText: {
    ...theme.typography.labelMd,
    color: theme.colors.body,
  },
  createWhenTextSelected: {
    color: theme.colors["on-primary"],
  },
  createError: {
    ...theme.typography.caption,
    color: theme.colors.danger,
    textAlign: "center",
    marginBottom: theme.spacing.sm,
  },
  createSaveBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: theme.spacing.sm,
    backgroundColor: theme.colors.ink,
    borderRadius: theme.radii.md,
    paddingVertical: theme.spacing.md,
    marginTop: theme.spacing.sm,
    ...theme.shadows.card,
  },
  createSaveBtnDisabled: {
    opacity: 0.45,
  },
  createSaveBtnText: {
    ...theme.typography.labelMd,
    color: "#FFFFFF",
  },
  // ── Morning Brief Modal ────────────────────────────────
  briefContent: {
    paddingHorizontal: theme.spacing.xl,
    paddingBottom: theme.spacing.xxxl * 2,
  },
  briefHero: {
    alignItems: "center",
    backgroundColor: theme.colors.card,
    borderRadius: theme.radii.lg,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: theme.spacing.xl,
    marginBottom: theme.spacing.lg,
    ...theme.shadows.cardSoft,
  },
  briefHeroIcon: {
    width: 52,
    height: 52,
    borderRadius: 18,
    backgroundColor: `${theme.colors.warning}18`,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: theme.spacing.md,
  },
  briefHeroTitle: {
    ...theme.typography.titleMd,
    color: theme.colors.ink,
    marginBottom: theme.spacing.xs,
  },
  briefHeroText: {
    ...theme.typography.legal,
    color: theme.colors.body,
    textAlign: "center",
    lineHeight: 17,
  },
  briefToggleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: theme.colors.card,
    borderRadius: theme.radii.lg,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: theme.spacing.lg,
    marginBottom: theme.spacing.lg,
    ...theme.shadows.cardSoft,
  },
  briefToggleCopy: {
    flex: 1,
    marginRight: theme.spacing.md,
  },
  briefToggleTitle: {
    ...theme.typography.titleSm,
    color: theme.colors.ink,
  },
  briefToggleSub: {
    ...theme.typography.legal,
    color: theme.colors.muted,
    marginTop: 3,
  },
  briefSectionTitle: {
    ...theme.typography.titleSm,
    color: theme.colors.ink,
    marginBottom: theme.spacing.sm,
  },
  briefTimeRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: theme.spacing.sm,
    marginBottom: theme.spacing.lg,
  },
  briefTimeBlock: {
    flex: 1,
  },
  briefTimeLabel: {
    ...theme.typography.legal,
    color: theme.colors.muted,
    marginBottom: 6,
  },
  briefStepper: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: theme.colors.surfaceElevated,
    borderRadius: theme.radii.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
    paddingHorizontal: theme.spacing.xs,
    paddingVertical: theme.spacing.xs,
  },
  briefStepBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: theme.colors.card,
  },
  briefTimeValue: {
    ...theme.typography.titleMd,
    color: theme.colors.ink,
    fontFamily: "Nunito_700Bold",
    fontWeight: "700",
  },
  briefAmpm: {
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    backgroundColor: theme.colors.card,
    borderRadius: theme.radii.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  briefTestBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: theme.spacing.xs,
    paddingVertical: theme.spacing.md,
    borderRadius: theme.radii.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.card,
    marginBottom: theme.spacing.md,
  },
  briefTestText: {
    ...theme.typography.labelMd,
    color: theme.colors.primary,
  },
  briefSaveBtn: {
    alignItems: "center",
    backgroundColor: theme.colors.primary,
    borderRadius: theme.radii.md,
    paddingVertical: theme.spacing.md,
    ...theme.shadows.elevated,
  },
  briefSaveText: {
    ...theme.typography.labelMd,
    color: theme.colors["on-primary"],
  },

  // ── Nutrition Goals Modal ────────────────────────────
  macroContent: {
    paddingHorizontal: theme.spacing.xl,
    paddingBottom: theme.spacing.xxxl * 2,
  },
  macroIntro: {
    ...theme.typography.legal,
    color: theme.colors.muted,
    lineHeight: 16,
    marginBottom: theme.spacing.lg,
  },
  macroField: {
    backgroundColor: theme.colors.card,
    borderRadius: theme.radii.lg,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.md,
    ...theme.shadows.cardSoft,
  },
  macroFieldLabelRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: theme.spacing.sm,
  },
  macroFieldDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
  },
  macroFieldLabel: {
    ...theme.typography.labelMd,
    color: theme.colors.ink,
    fontFamily: "Nunito_600SemiBold",
    fontWeight: "600",
  },
  macroFieldControl: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing.sm,
  },
  macroStepBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: theme.colors.surfaceElevated,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  macroInputWrap: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: theme.spacing.xs,
    backgroundColor: theme.colors.surfaceElevated,
    borderRadius: theme.radii.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
    paddingVertical: theme.spacing.xs,
    paddingHorizontal: theme.spacing.md,
  },
  macroInput: {
    ...theme.typography.titleMd,
    color: theme.colors.ink,
    fontFamily: "Nunito_700Bold",
    fontWeight: "700",
    textAlign: "center",
    minWidth: 60,
    padding: 0,
  },
  macroUnit: {
    ...theme.typography.legal,
    color: theme.colors.muted,
  },
  macroSaveBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: theme.spacing.sm,
    backgroundColor: theme.colors.ink,
    borderRadius: theme.radii.md,
    paddingVertical: theme.spacing.md,
    marginTop: theme.spacing.sm,
    ...theme.shadows.card,
  },
  macroSaveBtnText: {
    ...theme.typography.labelMd,
    color: theme.colors.card,
  },
});

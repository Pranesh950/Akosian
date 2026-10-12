// Myrri Health
// Copyright (C) 2026 Pranesh Shivaraj
//
// This program is free software: you can redistribute it and/or modify
// it under the terms of the GNU General Public License as published by
// the Free Software Foundation, either version 3 of the License, or
// (at your option) any later version.

import { useCallback, useMemo, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  Modal,
} from "react-native";
import { useFocusEffect, useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import Svg, {
  Path,
  Defs,
  Stop,
  LinearGradient as SvgLinearGradient,
  Circle as SvgCircle,
  Rect as SvgRect,
} from "react-native-svg";
import {
  HealthService,
  HealthData,
  MetricSample,
} from "../../src/services/health";
import { theme, formatAsOf } from "../../src/theme";
import { calculateBiologicalAge } from "../../src/services/biology";
import { getHealthProfile, patchHealthProfile, HealthProfile } from "../../src/services/profile";
import { recordTodayReadiness } from "../../src/services/insights";
import AmountModal from "../../src/components/AmountModal";
import {
  ManualMetric,
  getManualSamples,
  getManualValueToday,
  mergeSamples,
  setManualMetric,
} from "../../src/services/manualMetrics";
import { GradientWash } from "../../src/components/GradientWash";

interface BiomarkerCardProps {
  icon: keyof typeof MaterialCommunityIcons.glyphMap;
  label: string;
  subtitle: string;
  hasData: boolean;
  samples?: MetricSample[];
  sparklineColor?: string;
  onAdd?: () => void;
  onPress?: () => void;
  accent?: string;
}

function toDateKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function shiftDateKey(key: string, deltaDays: number): string {
  const d = new Date(key + "T12:00:00");
  if (Number.isNaN(d.getTime())) return toDateKey(new Date());
  d.setDate(d.getDate() + deltaDays);
  return toDateKey(d);
}

function formatSelectedDate(key: string): string {
  const d = new Date(key + "T12:00:00");
  if (Number.isNaN(d.getTime())) return key;
  return d.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

function sampleForDate(samples: MetricSample[], key: string): number | null {
  const s = samples.find((item) => item.date === key);
  return s ? s.value : null;
}

function buildSparkPath(samples: MetricSample[], w = 60, h = 24): string {
  if (samples.length < 2) return "";
  const values = samples.map((s) => s.value);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;
  const step = w / (samples.length - 1);
  return samples
    .map((s, i) => {
      const x = i * step;
      const y = h - 3 - ((s.value - min) / range) * (h - 6);
      return `${i === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");
}

function BiomarkerCard({
  icon,
  label,
  subtitle,
  hasData,
  samples = [],
  sparklineColor,
  onAdd,
  onPress,
  accent,
}: BiomarkerCardProps) {
  const path = hasData && samples.length >= 2 ? buildSparkPath(samples) : "";
  const lastPoint =
    hasData && samples.length >= 2
      ? (() => {
          const values = samples.map((s) => s.value);
          const min = Math.min(...values);
          const max = Math.max(...values);
          const range = max - min || 1;
          const w = 60;
          const h = 24;
          const step = w / (samples.length - 1);
          const last = samples[samples.length - 1];
          return {
            x: (samples.length - 1) * step,
            y: h - 3 - ((last.value - min) / range) * (h - 6),
          };
        })()
      : null;

  const cardId = `spark-${label.replace(/[^a-zA-Z0-9]/g, "")}`;
  return (
    <TouchableOpacity
      style={[styles.biomarkerCard, !hasData && styles.biomarkerCardEmpty]}
      onPress={onPress}
      activeOpacity={onPress ? 0.7 : 1}
      disabled={!onPress}
      accessibilityRole={onPress ? "button" : undefined}
      accessibilityLabel={onPress ? `View ${label} history` : undefined}
    >
      <View style={styles.biomarkerLeft}>
        <View style={[styles.biomarkerIcon, !hasData && styles.biomarkerIconEmpty, accent ? { backgroundColor: `${accent}14` } : null]}>
          <MaterialCommunityIcons
            name={icon}
            size={16}
            color={hasData ? (accent ?? theme.colors.ink) : theme.colors.muted}
          />
        </View>
        <View style={styles.biomarkerTextCol}>
          <Text style={[styles.biomarkerLabel, !hasData && styles.biomarkerTextEmpty]}>
            {label}
          </Text>
          <Text
            style={[styles.biomarkerSubtitle, !hasData && styles.biomarkerTextEmpty]}
            numberOfLines={1}
          >
            {subtitle}
          </Text>
        </View>
      </View>
      <View style={styles.biomarkerRight}>
        {path ? (
          <Svg width={60} height={24} viewBox="0 0 60 24">
            <Defs>
              <SvgLinearGradient id={cardId} x1="0" y1="0" x2="1" y2="0">
                <Stop
                  offset="0%"
                  stopColor={sparklineColor ?? theme.colors.ink}
                  stopOpacity={0.25}
                />
                <Stop
                  offset="100%"
                  stopColor={sparklineColor ?? theme.colors.ink}
                  stopOpacity={1}
                />
              </SvgLinearGradient>
            </Defs>
            <Path
              d={path}
              stroke={`url(#${cardId})`}
              strokeWidth={1.5}
              fill="none"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            {lastPoint && (
              <SvgCircle
                cx={lastPoint.x}
                cy={lastPoint.y}
                r={2.5}
                fill={sparklineColor ?? theme.colors.ink}
              />
            )}
          </Svg>
        ) : (
          <View style={styles.emptySparkline}>
            <View style={styles.emptySparklineLine} />
            <View style={styles.emptySparklineDot} />
          </View>
        )}
      </View>
      {onPress && (
        <MaterialCommunityIcons
          name="chevron-right"
          size={16}
          color={theme.colors.muted}
          style={styles.detailChevron}
        />
      )}
      {onAdd && (
        <TouchableOpacity
          onPress={onAdd}
          style={styles.addBtn}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          accessibilityLabel={`Log ${label}`}
        >
          <MaterialCommunityIcons name="plus" size={18} color={theme.colors.muted} />
        </TouchableOpacity>
      )}
    </TouchableOpacity>
  );
}

/** Full-screen change-over-time chart for one metric. */
function DetailChart({
  samples,
  color,
}: {
  samples: MetricSample[];
  color: string;
}) {
  const W = 320;
  const H = 170;
  const padL = 8;
  const padR = 8;
  const padT = 14;
  const padB = 24;
  const iw = W - padL - padR;
  const ih = H - padT - padB;

  if (samples.length === 0) {
    return (
      <View style={styles.detailChartEmpty}>
        <Text style={styles.detailChartEmptyText}>No data yet — log a value to start the trend.</Text>
      </View>
    );
  }

  const values = samples.map((s) => s.value);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || Math.abs(max) || 1;
  const px = (i: number) =>
    padL + (samples.length === 1 ? iw / 2 : (i / (samples.length - 1)) * iw);
  const py = (v: number) => padT + ih - ((v - min) / range) * ih;

  const line = samples
    .map((s, i) => `${i === 0 ? "M" : "L"}${px(i).toFixed(1)},${py(s.value).toFixed(1)}`)
    .join(" ");
  const area = `${line} L${px(samples.length - 1).toFixed(1)},${(padT + ih).toFixed(1)} L${padL.toFixed(1)},${(padT + ih).toFixed(1)} Z`;
  const firstLabel = new Date(samples[0].date + "T12:00:00").toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
  const lastLabel = new Date(
    samples[samples.length - 1].date + "T12:00:00"
  ).toLocaleDateString("en-US", { month: "short", day: "numeric" });

  return (
    <View>
      <Svg width={W} height={H} viewBox={`0 0 ${W} ${H}`}>
        <Defs>
          <SvgLinearGradient id="detail-fill" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0%" stopColor={color} stopOpacity={0.28} />
            <Stop offset="100%" stopColor={color} stopOpacity={0.02} />
          </SvgLinearGradient>
        </Defs>
        {[0.25, 0.5, 0.75].map((t) => (
          <SvgRect
            key={t}
            x={padL}
            y={padT + ih * t}
            width={iw}
            height={1}
            fill={theme.colors.border}
            opacity={0.7}
          />
        ))}
        <Path d={area} fill="url(#detail-fill)" stroke="none" />
        <Path
          d={line}
          stroke={color}
          strokeWidth={2}
          fill="none"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        {samples.map((s, i) =>
          i === 0 || i === samples.length - 1 || samples.length <= 8 ? (
            <SvgCircle key={`${s.date}-${i}`} cx={px(i)} cy={py(s.value)} r={3} fill={color} />
          ) : null
        )}
      </Svg>
      <View style={styles.detailChartAxis}>
        <Text style={styles.detailAxisLabel}>{firstLabel}</Text>
        <Text style={styles.detailAxisLabel}>{lastLabel}</Text>
      </View>
    </View>
  );
}

function kgToLbs(kg: number): number {
  return kg * 2.20462;
}

export default function BiologyScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [data, setData] = useState<HealthData | null>(null);
  const [profile, setProfile] = useState<HealthProfile | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [bioAge, setBioAge] = useState<number | null>(null);
  const [bioLabel, setBioLabel] = useState<string>("");
  const [bioReliability, setBioReliability] = useState<number | null>(null);
  const [bioConfidenceLabel, setBioConfidenceLabel] = useState<string>("");
  const [bioBaselineDays, setBioBaselineDays] = useState<number | null>(null);
  const [rhrHistory, setRhrHistory] = useState<MetricSample[]>([]);
  const [hrvHistory, setHrvHistory] = useState<MetricSample[]>([]);
  const [weightHistory, setWeightHistory] = useState<MetricSample[]>([]);
  const [fatHistory, setFatHistory] = useState<MetricSample[]>([]);
  const [manualHistories, setManualHistories] = useState<Partial<Record<ManualMetric, MetricSample[]>>>({});
  const [modal, setModal] = useState<{ metric: ManualMetric; title: string; unit: string; emoji: string; toKg: boolean } | null>(null);
  const [selectedDateKey, setSelectedDateKey] = useState(() => toDateKey(new Date()));
  const [detail, setDetail] = useState<ManualMetric | null>(null);
  const [detailRange, setDetailRange] = useState<7 | 14 | 30>(30);

  const loadData = useCallback(async () => {
    setRefreshing(true);
    try {
      await HealthService.initialize(false);
      const [today, rhr, hrv, sleep, activity, weight, fat, healthProfile] = await Promise.all([
        HealthService.getTodayData(),
        HealthService.getMetricHistory("restingHeartRate", 30),
        HealthService.getMetricHistory("heartRateVariability", 30),
        HealthService.getSleepHistory(30),
        HealthService.getDailyActivity(30),
        HealthService.getMetricHistory("weight", 30),
        HealthService.getMetricHistory("bodyFat", 30),
        getHealthProfile(),
      ]);
      setData(today);
      setProfile(healthProfile);
      setRhrHistory(rhr);
      setHrvHistory(hrv);
      setWeightHistory(weight);
      setFatHistory(fat);

      // Overlay manually entered values for today and merge manual entries
      // into the history sparklines.
      let mWeight: number | null = null;
      let mLean: number | null = null;
      let mFat: number | null = null;
      let mO2: number | null = null;
      let mVo2: number | null = null;
      let mRhr: number | null = null;
      let mHrv: number | null = null;
      try {
        const [wHist, rhrMan, hrvMan, fatMan, leanMan, o2Man, vo2Man] = await Promise.all([
          getManualSamples("weight"),
          getManualSamples("restingHeartRate"),
          getManualSamples("heartRateVariability"),
          getManualSamples("bodyFat"),
          getManualSamples("leanBodyMass"),
          getManualSamples("bloodOxygen"),
          getManualSamples("vo2Max"),
        ]);
        setManualHistories({
          weight: wHist,
          restingHeartRate: rhrMan,
          heartRateVariability: hrvMan,
          bodyFat: fatMan,
          leanBodyMass: leanMan,
          bloodOxygen: o2Man,
          vo2Max: vo2Man,
        });
        setWeightHistory(mergeSamples(weight, wHist));
        setRhrHistory(mergeSamples(rhr, rhrMan));
        setHrvHistory(mergeSamples(hrv, hrvMan));
        setFatHistory(mergeSamples(fat, fatMan));
        [mWeight, mLean, mFat, mO2, mVo2, mRhr, mHrv] = await Promise.all([
          getManualValueToday("weight"),
          getManualValueToday("leanBodyMass"),
          getManualValueToday("bodyFat"),
          getManualValueToday("bloodOxygen"),
          getManualValueToday("vo2Max"),
          getManualValueToday("restingHeartRate"),
          getManualValueToday("heartRateVariability"),
        ]);
        setData((prev) => {
          if (!prev) return prev;
          return {
            ...prev,
            ...(mWeight != null ? { weight: mWeight } : {}),
            ...(mLean != null ? { leanBodyMass: mLean } : {}),
            ...(mFat != null ? { bodyFat: mFat } : {}),
            ...(mO2 != null ? { bloodOxygen: mO2 } : {}),
            ...(mVo2 != null ? { vo2Max: mVo2 } : {}),
            ...(mRhr != null ? { restingHeartRate: mRhr } : {}),
            ...(mHrv != null ? { heartRateVariability: mHrv } : {}),
          };
        });
      } catch (e) {
        console.warn("[Biology] manual metrics overlay failed:", e);
      }

      // Bio-age inputs mirror what the cards show: device → manual → profile.
      // The profile fallback only fills weight/height for BMI — display cards
      // keep showing measured values so a stale profile never poses as today.
      const bioInput: HealthData = {
        ...today,
        weight: today.weight ?? mWeight ?? healthProfile?.weightKg ?? null,
        height: today.height ?? healthProfile?.heightCm ?? null,
        leanBodyMass: today.leanBodyMass ?? mLean ?? null,
        bodyFat: today.bodyFat ?? mFat ?? null,
        bloodOxygen: today.bloodOxygen ?? mO2 ?? null,
        vo2Max: today.vo2Max ?? mVo2 ?? null,
        restingHeartRate: today.restingHeartRate ?? mRhr ?? null,
        heartRateVariability: today.heartRateVariability ?? mHrv ?? null,
      };

      const hasSignals =
        rhr.length > 0 ||
        hrv.length > 0 ||
        sleep.length > 0 ||
        activity.some((day) => day.hasData === true) ||
        (bioInput.vo2Max != null && bioInput.vo2Max > 0) ||
        (bioInput.bodyFat != null && bioInput.bodyFat > 0) ||
        (bioInput.bloodPressure != null &&
          bioInput.bloodPressure.systolic > 0 &&
          bioInput.bloodPressure.diastolic > 0);
      if (healthProfile && hasSignals) {
        const ageResult = calculateBiologicalAge(
          healthProfile.chronologicalAge,
          bioInput,
          healthProfile.biologicalSex,
          {
            restingHeartRate: rhr,
            heartRateVariability: hrv,
            sleep,
            activity,
          }
        );
        setBioAge(ageResult.biologicalAge);
        setBioLabel(ageResult.label);
        setBioReliability(ageResult.dataReliability);
        setBioConfidenceLabel(ageResult.confidenceLabel);
        setBioBaselineDays(ageResult.baselineDays);
      } else {
        setBioAge(null);
        setBioLabel("");
        setBioReliability(null);
        setBioConfidenceLabel("");
        setBioBaselineDays(null);
      }

      // Record today's readiness snapshot + score once per day (idempotent). This is the
      // only write path for the readiness baseline; the AI's `get_recovery` read no longer
      // mutates it. Skips days with no recovery signal at all.
      if (
        today.heartRateVariability != null ||
        today.restingHeartRate != null ||
        today.sleepHours != null
      ) {
        try {
          await recordTodayReadiness({
            hrv: today.heartRateVariability,
            rhr: today.restingHeartRate,
            sleepHours: today.sleepHours,
          });
        } catch (e) {
          console.warn("[Biology] readiness record failed:", e);
        }
      }
    } catch (e) {
      console.warn("[Biology] load failed:", e);
    } finally {
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData])
  );

  const todayKey = toDateKey(new Date());
  const isToday = selectedDateKey === todayKey;

  // Values shown respect the selected date: today uses the live HealthData
  // (with manual overlay), past days read back the merged histories.
  const weightKgForDate = isToday
    ? data?.weight ?? null
    : sampleForDate(weightHistory, selectedDateKey);
  const rhrForDate = isToday
    ? data?.restingHeartRate ?? null
    : sampleForDate(rhrHistory, selectedDateKey);
  const hrvForDate = isToday
    ? data?.heartRateVariability ?? null
    : sampleForDate(hrvHistory, selectedDateKey);
  const fatForDate = isToday
    ? data?.bodyFat ?? null
    : sampleForDate(fatHistory, selectedDateKey);
  const leanKgForDate = isToday
    ? data?.leanBodyMass ?? null
    : sampleForDate(manualHistories.leanBodyMass ?? [], selectedDateKey);
  const o2ForDate = isToday
    ? data?.bloodOxygen ?? null
    : sampleForDate(manualHistories.bloodOxygen ?? [], selectedDateKey);
  const vo2ForDate =
    isToday && selectedDateKey === todayKey
      ? data?.vo2Max ?? sampleForDate(manualHistories.vo2Max ?? [], selectedDateKey)
      : sampleForDate(manualHistories.vo2Max ?? [], selectedDateKey);

  const weightLbs = weightKgForDate != null ? kgToLbs(weightKgForDate) : null;
  const leanLbs = leanKgForDate != null ? kgToLbs(leanKgForDate) : null;

  const handleModalSave = async (value: number, date: string) => {
    if (!modal) return;
    const stored = modal.toKg ? value / 2.20462 : value;
    await setManualMetric(modal.metric, Math.round(stored * 100) / 100, date);
    // A fresh weigh-in keeps the onboarding profile current so calorie and
    // protein targets stay personalized. Past-date corrections don't touch it.
    if (modal.metric === "weight" && date === toDateKey(new Date())) {
      try {
        await patchHealthProfile({ weightKg: Math.round(stored * 10) / 10 });
      } catch (e) {
        console.warn("[Biology] profile weight sync failed:", e);
      }
    }
    setModal(null);
    setSelectedDateKey(date);
    loadData();
  };

  const openLog = (metric: ManualMetric, title: string, unit: string, emoji: string, toKg: boolean) => {
    setDetail(null);
    setModal({ metric, title, unit, emoji, toKg });
  };

  interface DetailConfig {
    metric: ManualMetric;
    title: string;
    unit: string;
    emoji: string;
    toKg: boolean;
    color: string;
    samples: MetricSample[];
    format: (v: number) => string;
  }

  const detailConfigs: Record<ManualMetric, DetailConfig> = {
    weight: {
      metric: "weight", title: "Weight", unit: "lbs", emoji: "⚖️", toKg: true,
      color: theme.colors.info, samples: weightHistory,
      format: (v) => `${kgToLbs(v).toFixed(1)} lbs`,
    },
    heartRateVariability: {
      metric: "heartRateVariability", title: "HRV", unit: "ms", emoji: "〰️", toKg: false,
      color: theme.colors.primary, samples: hrvHistory,
      format: (v) => `${Math.round(v)} ms`,
    },
    restingHeartRate: {
      metric: "restingHeartRate", title: "Resting Heart Rate", unit: "bpm", emoji: "❤️", toKg: false,
      color: theme.colors.danger, samples: rhrHistory,
      format: (v) => `${Math.round(v)} bpm`,
    },
    bodyFat: {
      metric: "bodyFat", title: "Body Fat", unit: "%", emoji: "📉", toKg: false,
      color: theme.colors.warning, samples: fatHistory,
      format: (v) => `${v.toFixed(1)} %`,
    },
    leanBodyMass: {
      metric: "leanBodyMass", title: "Lean Body Mass", unit: "lbs", emoji: "💪", toKg: true,
      color: theme.colors.success, samples: manualHistories.leanBodyMass ?? [],
      format: (v) => `${kgToLbs(v).toFixed(1)} lbs`,
    },
    bloodOxygen: {
      metric: "bloodOxygen", title: "Blood Oxygen", unit: "%", emoji: "🩸", toKg: false,
      color: theme.colors.recovery, samples: manualHistories.bloodOxygen ?? [],
      format: (v) => `${Math.round(v)} %`,
    },
    vo2Max: {
      metric: "vo2Max", title: "VO₂ Max", unit: "mL/kg/min", emoji: "🏃", toKg: false,
      color: theme.colors.coral, samples: manualHistories.vo2Max ?? [],
      format: (v) => `${v.toFixed(1)} mL/kg/min`,
    },
  };

  const activeDetail: DetailConfig | null = detail ? detailConfigs[detail] : null;
  const detailSamples = useMemo(() => {
    if (!activeDetail) return [];
    return activeDetail.samples.slice(-detailRange);
  }, [activeDetail, detailRange]);
  const detailStats = useMemo(() => {
    if (detailSamples.length === 0) return null;
    const vals = detailSamples.map((s) => s.value);
    const latest = vals[vals.length - 1];
    const first = vals[0];
    const avg = vals.reduce((a, b) => a + b, 0) / vals.length;
    return {
      latest,
      avg,
      min: Math.min(...vals),
      max: Math.max(...vals),
      change: vals.length > 1 ? latest - first : 0,
    };
  }, [detailSamples]);

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <GradientWash color={theme.colors.info} />

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={loadData}
            tintColor={theme.colors.muted}
          />
        }
      >
        <View style={styles.heroArea}>
          <Text style={styles.heroTitle}>Physiological Age</Text>
          <View style={styles.dateNav}>
            <TouchableOpacity
              style={styles.dateNavBtn}
              onPress={() => setSelectedDateKey((k) => shiftDateKey(k, -1))}
              activeOpacity={0.7}
              accessibilityLabel="Previous day"
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <MaterialCommunityIcons name="chevron-left" size={20} color={theme.colors.ink} />
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.dateNavCenter}
              onPress={() => setSelectedDateKey(todayKey)}
              activeOpacity={0.7}
              accessibilityLabel="Back to today"
            >
              <Text style={styles.heroDate}>
                {isToday ? formatAsOf() : `As of ${formatSelectedDate(selectedDateKey)}`}
              </Text>
              {!isToday && <Text style={styles.dateNavReset}>Tap to return to today</Text>}
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.dateNavBtn, isToday && styles.dateNavBtnDisabled]}
              onPress={() => setSelectedDateKey((k) => shiftDateKey(k, 1))}
              activeOpacity={0.7}
              accessibilityLabel="Next day"
              disabled={isToday}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <MaterialCommunityIcons
                name="chevron-right"
                size={20}
                color={isToday ? theme.colors.muted : theme.colors.ink}
              />
            </TouchableOpacity>
          </View>
          <Text style={styles.bioAgeValue}>{bioAge != null ? bioAge : "—"}</Text>
          {bioLabel ? (
            <>
              <View style={styles.bioLabelPill}>
                <Text style={styles.bioLabelText}>{bioLabel}</Text>
              </View>
              {bioReliability != null && (
                <Text style={styles.bioConfidence}>
                  {bioReliability}% {bioConfidenceLabel} data reliability · {bioBaselineDays ?? 0} baseline days
                </Text>
              )}
            </>
          ) : profile == null ? (
            <TouchableOpacity
              style={styles.profilePrompt}
              onPress={() => router.push({ pathname: "/onboarding/profile", params: { from: "biology" } })}
              activeOpacity={0.8}
            >
              <Text style={styles.profilePromptHint}>Set up your profile to personalize this estimate</Text>
              <MaterialCommunityIcons name="arrow-right" size={16} color={theme.colors.primary} />
            </TouchableOpacity>
          ) : (
            <Text style={styles.bioHintDark}>
              Connect more health data to improve this physiological-age index
            </Text>
          )}
        </View>

        <View style={styles.biomarkerHeader}>
          <View>
            <Text style={styles.biomarkerHeaderTitle}>Biomarkers</Text>
            <Text style={styles.biomarkerHeaderHint}>
              Consumer health signals · not a medical measurement
            </Text>
          </View>
        </View>

        <View style={styles.biomarkersSection}>
          <BiomarkerCard
            icon="scale-bathroom"
            accent={theme.colors.sky}
            label="Weight"
            subtitle={
              weightLbs != null
                ? `${weightLbs.toFixed(1)} lbs`
                : "No data · — lbs"
            }
            hasData={weightLbs != null}
            samples={weightHistory}
            onPress={() => setDetail("weight")}
            onAdd={() => openLog("weight", "Weight", "lbs", "⚖️", true)}
            sparklineColor={theme.colors.info}
          />
          <BiomarkerCard
            icon="waveform"
            accent={theme.colors.lilac}
            label="HRV"
            subtitle={
              hrvForDate != null
                ? isToday && data?.hrvEstimated
                  ? `Est. ${Math.round(hrvForDate)} ms`
                  : `${Math.round(hrvForDate)} ms`
                : "No data · — ms"
            }
            hasData={hrvForDate != null}
            samples={hrvHistory}
            onPress={() => setDetail("heartRateVariability")}
            onAdd={() => openLog("heartRateVariability", "HRV", "ms", "〰️", false)}
            sparklineColor={theme.colors.primary}
          />
          <BiomarkerCard
            icon="heart-pulse"
            accent={theme.colors.danger}
            label="Resting heart rate"
            subtitle={
              rhrForDate != null
                ? `${Math.round(rhrForDate)} bpm`
                : "No data · — bpm"
            }
            hasData={rhrForDate != null}
            samples={rhrHistory}
            onPress={() => setDetail("restingHeartRate")}
            onAdd={() => openLog("restingHeartRate", "Resting Heart Rate", "bpm", "❤️", false)}
            sparklineColor={theme.colors.danger}
          />
          <BiomarkerCard
            icon="percent-outline"
            accent={theme.colors.warning}
            label="Body fat"
            subtitle={
              fatForDate != null
                ? `${fatForDate.toFixed(1)} %`
                : "No data · — %"
            }
            hasData={fatForDate != null}
            samples={fatHistory}
            onPress={() => setDetail("bodyFat")}
            onAdd={() => openLog("bodyFat", "Body Fat", "%", "📉", false)}
            sparklineColor={theme.colors.warning}
          />
          <BiomarkerCard
            icon="human"
            accent={theme.colors.success}
            label="Lean body mass"
            subtitle={
              leanLbs != null
                ? `${leanLbs.toFixed(1)} lbs`
                : "No data · — lbs"
            }
            hasData={leanLbs != null}
            samples={manualHistories.leanBodyMass ?? []}
            sparklineColor={theme.colors.success}
            onPress={() => setDetail("leanBodyMass")}
            onAdd={() => openLog("leanBodyMass", "Lean Body Mass", "lbs", "💪", true)}
          />
          <BiomarkerCard
            icon="lungs"
            accent={theme.colors.recovery}
            label="Blood oxygen"
            subtitle={
              o2ForDate != null
                ? `${Math.round(o2ForDate)} %`
                : "No data · — %"
            }
            hasData={o2ForDate != null}
            samples={manualHistories.bloodOxygen ?? []}
            sparklineColor={theme.colors.recovery}
            onPress={() => setDetail("bloodOxygen")}
            onAdd={() => openLog("bloodOxygen", "Blood Oxygen", "%", "🩸", false)}
          />
          <BiomarkerCard
            icon="run-fast"
            accent={theme.colors.coral}
            label="VO₂ max"
            subtitle={
              vo2ForDate != null
                ? `${vo2ForDate.toFixed(1)} mL/kg/min`
                : "No data · — mL/kg/min"
            }
            hasData={vo2ForDate != null}
            samples={manualHistories.vo2Max ?? []}
            sparklineColor={theme.colors.coral}
            onPress={() => setDetail("vo2Max")}
            onAdd={() => openLog("vo2Max", "VO₂ Max", "mL/kg/min", "🏃", false)}
          />
        </View>
      </ScrollView>
      {/* Full-screen change-over-time view */}
      <Modal
        visible={activeDetail != null}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setDetail(null)}
      >
        <View style={styles.detailContainer}>
          <View style={styles.detailHeader}>
            <TouchableOpacity
              onPress={() => setDetail(null)}
              style={styles.detailCloseBtn}
              hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
              accessibilityLabel="Close detail view"
            >
              <MaterialCommunityIcons name="close" size={22} color={theme.colors.ink} />
            </TouchableOpacity>
            <View style={styles.detailTitleCol}>
              <Text style={styles.detailTitle}>
                {activeDetail ? `${activeDetail.emoji} ${activeDetail.title}` : ""}
              </Text>
              <Text style={styles.detailSubtitle}>Change over time</Text>
            </View>
            <View style={{ width: 36 }} />
          </View>

          <ScrollView
            style={styles.detailScroll}
            contentContainerStyle={styles.detailContent}
            showsVerticalScrollIndicator={false}
          >
            {activeDetail && detailStats ? (
              <>
                <View style={styles.detailLatestCard}>
                  <Text style={styles.detailLatestValue}>
                    {activeDetail.format(detailStats.latest)}
                  </Text>
                  <Text style={styles.detailLatestLabel}>
                    Latest · {new Date(
                      detailSamples[detailSamples.length - 1].date + "T12:00:00"
                    ).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                  </Text>
                  {detailSamples.length > 1 && (
                    <Text
                      style={[
                        styles.detailChange,
                        detailStats.change >= 0
                          ? styles.detailChangeUp
                          : styles.detailChangeDown,
                      ]}
                    >
                      {detailStats.change >= 0 ? "+" : "−"}
                      {activeDetail.metric === "weight" ||
                      activeDetail.metric === "leanBodyMass"
                        ? `${Math.abs(detailStats.change * 2.20462).toFixed(1)} lbs`
                        : `${Math.abs(detailStats.change).toFixed(1)}${
                            activeDetail.unit === "mL/kg/min" ? "" : ` ${activeDetail.unit}`
                          }`}
                      {" "}in period
                    </Text>
                  )}
                </View>

                <View style={styles.rangeRow}>
                  {([7, 14, 30] as const).map((r) => (
                    <TouchableOpacity
                      key={r}
                      style={[styles.rangeChip, detailRange === r && styles.rangeChipActive]}
                      onPress={() => setDetailRange(r)}
                      activeOpacity={0.7}
                    >
                      <Text
                        style={[
                          styles.rangeChipText,
                          detailRange === r && styles.rangeChipTextActive,
                        ]}
                      >
                        {r}D
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>

                <View style={styles.detailChartCard}>
                  <DetailChart samples={detailSamples} color={activeDetail.color} />
                </View>

                <View style={styles.detailStatsRow}>
                  <View style={styles.detailStat}>
                    <Text style={styles.detailStatValue}>
                      {activeDetail.format(detailStats.avg)}
                    </Text>
                    <Text style={styles.detailStatLabel}>Average</Text>
                  </View>
                  <View style={styles.detailStat}>
                    <Text style={styles.detailStatValue}>
                      {activeDetail.format(detailStats.min)}
                    </Text>
                    <Text style={styles.detailStatLabel}>Low</Text>
                  </View>
                  <View style={styles.detailStat}>
                    <Text style={styles.detailStatValue}>
                      {activeDetail.format(detailStats.max)}
                    </Text>
                    <Text style={styles.detailStatLabel}>High</Text>
                  </View>
                </View>

                <Text style={styles.detailHistoryTitle}>History</Text>
                <View style={styles.detailHistoryCard}>
                  {[...detailSamples].reverse().map((s, i) => (
                    <View key={`${s.date}-${i}`}>
                      {i > 0 && <View style={styles.detailHistoryDivider} />}
                      <View style={styles.detailHistoryRow}>
                        <Text style={styles.detailHistoryDate}>
                          {new Date(s.date + "T12:00:00").toLocaleDateString("en-US", {
                            weekday: "short",
                            month: "short",
                            day: "numeric",
                          })}
                        </Text>
                        <Text style={styles.detailHistoryValue}>
                          {activeDetail.format(s.value)}
                        </Text>
                      </View>
                    </View>
                  ))}
                </View>

                <TouchableOpacity
                  style={styles.detailLogBtn}
                  onPress={() =>
                    activeDetail &&
                    openLog(
                      activeDetail.metric,
                      activeDetail.title,
                      activeDetail.unit,
                      activeDetail.emoji,
                      activeDetail.toKg
                    )
                  }
                  activeOpacity={0.8}
                >
                  <MaterialCommunityIcons name="plus" size={18} color="#FFFFFF" />
                  <Text style={styles.detailLogBtnText}>Log {activeDetail.title}</Text>
                </TouchableOpacity>
              </>
            ) : (
              <View style={styles.detailChartCard}>
                <Text style={styles.detailChartEmptyText}>
                  No data yet for{activeDetail ? ` ${activeDetail.title}` : " this metric"}.
                  Log a value to start the trend.
                </Text>
                {activeDetail && (
                  <TouchableOpacity
                    style={styles.detailLogBtn}
                    onPress={() =>
                      openLog(
                        activeDetail.metric,
                        activeDetail.title,
                        activeDetail.unit,
                        activeDetail.emoji,
                        activeDetail.toKg
                      )
                    }
                    activeOpacity={0.8}
                  >
                    <MaterialCommunityIcons name="plus" size={18} color="#FFFFFF" />
                    <Text style={styles.detailLogBtnText}>Log {activeDetail.title}</Text>
                  </TouchableOpacity>
                )}
              </View>
            )}
          </ScrollView>
        </View>
      </Modal>

      <AmountModal
        visible={modal != null}
        title={modal?.title ?? ""}
        emoji={modal?.emoji ?? ""}
        unit={modal?.unit ?? ""}
        presets={[]}
        initialDate={selectedDateKey}
        onSave={handleModalSave}
        onClose={() => setModal(null)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.bg,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: theme.spacing.xxxl * 2.5 + theme.spacing.xxl,
  },
  heroArea: {
    marginHorizontal: theme.spacing.xl,
    paddingTop: theme.spacing.xxl,
    paddingBottom: theme.spacing.xxl,
    alignItems: "center",
    paddingHorizontal: theme.spacing.xl,
    backgroundColor: theme.colors.card,
    borderRadius: theme.radii.xl,
    borderWidth: 1,
    borderColor: theme.colors.border,
    ...theme.shadows.card,
  },
  heroTitle: {
    ...theme.typography.titleMd,
    color: theme.colors.ink,
    textAlign: "center",
  },
  heroDate: {
    ...theme.typography.caption,
    color: theme.colors.muted,
    marginTop: theme.spacing.xs,
    textAlign: "center",
  },
  bioAgeValue: {
    ...theme.typography.displayXl,
    fontSize: 76,
    lineHeight: 80,
    color: theme.colors.info,
    marginTop: theme.spacing.md,
    textAlign: "center",
  },
  bioLabelPill: {
    marginTop: theme.spacing.sm,
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: theme.radii.pill,
    backgroundColor: theme.colors.surfaceElevated,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  bioLabelText: {
    ...theme.typography.caption,
    color: theme.colors.ink,
  },
  profilePromptHint: {
    ...theme.typography.legal,
    color: theme.colors.primary,
    textAlign: "center",
    paddingHorizontal: theme.spacing.xs,
  },
  bioHintDark: {
    ...theme.typography.legal,
    color: theme.colors.muted,
    textAlign: "center",
    paddingHorizontal: theme.spacing.xs,
  },
  profilePrompt: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing.xs,
    marginTop: theme.spacing.sm,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    borderRadius: theme.radii.pill,
    backgroundColor: theme.colors.surfaceElevated,
  },
  bioConfidence: {
    ...theme.typography.legal,
    color: theme.colors.muted,
    marginTop: theme.spacing.xs,
  },
  biomarkerHeader: {
    paddingHorizontal: theme.spacing.xl,
    marginTop: theme.spacing.xxl,
    marginBottom: theme.spacing.sm,
  },
  biomarkerHeaderTitle: {
    ...theme.typography.titleSm,
    color: theme.colors.ink,
  },
  biomarkerHeaderHint: {
    ...theme.typography.legal,
    color: theme.colors.muted,
    marginTop: 3,
  },
  biomarkersSection: {
    paddingHorizontal: theme.spacing.xl,
    gap: theme.spacing.sm,
  },
  biomarkerCard: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: theme.colors.card,
    borderRadius: theme.radii.lg,
    borderWidth: 0,
    borderColor: "transparent",
    padding: theme.spacing.md,
    ...theme.shadows.module,
  },
  biomarkerCardEmpty: {
    opacity: 0.75,
  },
  biomarkerLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing.sm,
    flex: 1,
  },
  biomarkerIcon: {
    width: 32,
    height: 32,
    borderRadius: theme.radii.sm,
    backgroundColor: theme.colors.surfaceElevated,
    alignItems: "center",
    justifyContent: "center",
  },
  biomarkerIconEmpty: {
    backgroundColor: theme.colors.surfaceElevated,
  },
  biomarkerTextCol: {
    flex: 1,
  },
  biomarkerLabel: {
    ...theme.typography.labelMd,
    color: theme.colors.ink,
  },
  biomarkerSubtitle: {
    ...theme.typography.legal,
    color: theme.colors.body,
    marginTop: 2,
  },
  biomarkerTextEmpty: {
    color: theme.colors.muted,
  },
  biomarkerRight: {
    marginLeft: theme.spacing.sm,
  },
  addBtn: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: theme.colors.surfaceElevated,
    alignItems: "center",
    justifyContent: "center",
    marginLeft: theme.spacing.sm,
  },
  emptySparkline: {
    width: 60,
    height: 24,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-end",
    gap: 0,
  },
  emptySparklineDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: theme.colors.border,
  },
  emptySparklineLine: {
    width: 40,
    height: StyleSheet.hairlineWidth,
    backgroundColor: theme.colors.border,
  },
  detailChevron: {
    marginLeft: 2,
  },
  dateNav: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: theme.spacing.sm,
    marginTop: theme.spacing.sm,
  },
  dateNavBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: theme.colors.surfaceElevated,
    borderWidth: 1,
    borderColor: theme.colors.border,
    alignItems: "center",
    justifyContent: "center",
  },
  dateNavBtnDisabled: {
    opacity: 0.4,
  },
  dateNavCenter: {
    alignItems: "center",
    paddingHorizontal: theme.spacing.sm,
  },
  dateNavReset: {
    ...theme.typography.legal,
    color: theme.colors.primary,
    marginTop: 2,
  },
  // ── Metric detail (full-screen change-over-time) ──
  detailContainer: {
    flex: 1,
    backgroundColor: theme.colors.bg,
  },
  detailHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: theme.spacing.xl,
    paddingTop: 20,
    paddingBottom: theme.spacing.sm,
  },
  detailCloseBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: theme.colors.surfaceElevated,
    alignItems: "center",
    justifyContent: "center",
  },
  detailTitleCol: {
    alignItems: "center",
    flex: 1,
  },
  detailTitle: {
    ...theme.typography.titleLg,
    color: theme.colors.ink,
  },
  detailSubtitle: {
    ...theme.typography.legal,
    color: theme.colors.muted,
    marginTop: 2,
  },
  detailScroll: {
    flex: 1,
  },
  detailContent: {
    paddingHorizontal: theme.spacing.xl,
    paddingBottom: theme.spacing.xxxl * 2,
  },
  detailLatestCard: {
    alignItems: "center",
    backgroundColor: theme.colors.card,
    borderRadius: theme.radii.lg,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: theme.spacing.xl,
    marginBottom: theme.spacing.md,
    ...theme.shadows.cardSoft,
  },
  detailLatestValue: {
    ...theme.typography.displayMd,
    color: theme.colors.ink,
  },
  detailLatestLabel: {
    ...theme.typography.legal,
    color: theme.colors.muted,
    marginTop: 4,
  },
  detailChange: {
    ...theme.typography.caption,
    fontFamily: "Nunito_600SemiBold",
    fontWeight: "600",
    marginTop: 6,
  },
  detailChangeUp: {
    color: theme.colors.success,
  },
  detailChangeDown: {
    color: theme.colors.danger,
  },
  rangeRow: {
    flexDirection: "row",
    justifyContent: "center",
    gap: theme.spacing.sm,
    marginBottom: theme.spacing.md,
  },
  rangeChip: {
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.sm,
    borderRadius: theme.radii.pill,
    backgroundColor: theme.colors.card,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  rangeChipActive: {
    backgroundColor: theme.colors.ink,
    borderColor: theme.colors.ink,
  },
  rangeChipText: {
    ...theme.typography.labelMd,
    color: theme.colors.muted,
  },
  rangeChipTextActive: {
    color: theme.colors.card,
  },
  detailChartCard: {
    backgroundColor: theme.colors.card,
    borderRadius: theme.radii.lg,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: theme.spacing.md,
    alignItems: "center",
    marginBottom: theme.spacing.md,
    ...theme.shadows.cardSoft,
  },
  detailChartEmpty: {
    paddingVertical: theme.spacing.xl,
    alignItems: "center",
  },
  detailChartEmptyText: {
    ...theme.typography.caption,
    color: theme.colors.muted,
    textAlign: "center",
    lineHeight: 18,
  },
  detailChartAxis: {
    flexDirection: "row",
    justifyContent: "space-between",
    width: 304,
    marginTop: 4,
  },
  detailAxisLabel: {
    ...theme.typography.legal,
    color: theme.colors.muted,
  },
  detailStatsRow: {
    flexDirection: "row",
    gap: theme.spacing.sm,
    marginBottom: theme.spacing.lg,
  },
  detailStat: {
    flex: 1,
    backgroundColor: theme.colors.card,
    borderRadius: theme.radii.lg,
    borderWidth: 1,
    borderColor: theme.colors.border,
    paddingVertical: theme.spacing.md,
    alignItems: "center",
  },
  detailStatValue: {
    ...theme.typography.titleSm,
    color: theme.colors.ink,
  },
  detailStatLabel: {
    ...theme.typography.legal,
    color: theme.colors.muted,
    marginTop: 2,
  },
  detailHistoryTitle: {
    ...theme.typography.titleSm,
    color: theme.colors.ink,
    marginBottom: theme.spacing.sm,
  },
  detailHistoryCard: {
    backgroundColor: theme.colors.card,
    borderRadius: theme.radii.lg,
    borderWidth: 1,
    borderColor: theme.colors.border,
    paddingHorizontal: theme.spacing.lg,
    marginBottom: theme.spacing.lg,
  },
  detailHistoryDivider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: theme.colors.border,
  },
  detailHistoryRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: theme.spacing.sm,
  },
  detailHistoryDate: {
    ...theme.typography.caption,
    color: theme.colors.body,
  },
  detailHistoryValue: {
    ...theme.typography.labelMd,
    color: theme.colors.ink,
  },
  detailLogBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: theme.spacing.sm,
    backgroundColor: theme.colors.ink,
    borderRadius: theme.radii.md,
    paddingVertical: theme.spacing.md,
    marginTop: theme.spacing.sm,
  },
  detailLogBtnText: {
    ...theme.typography.labelMd,
    color: "#FFFFFF",
  },
});

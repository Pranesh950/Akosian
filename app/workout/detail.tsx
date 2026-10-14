// Akosian
// Copyright (C) 2026 Pranesh Shivaraj
//
// This program is free software: you can redistribute it and/or modify
// it under the terms of the GNU General Public License as published by
// the Free Software Foundation, either version 3 of the License, or
// (at your option) any later version.

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import { useGoBack } from "../../src/hooks/useGoBack";
import { HealthService, WorkoutSession } from "../../src/services/health";
import { InteractiveAreaChart } from "../../src/components/InteractiveAreaChart";
import { theme } from "../../src/theme";

function workoutStyle(name: string): { icon: string; color: string; bg: string } {
  const n = name.toLowerCase();
  if (n.includes("run") || n.includes("jog"))
    return { icon: "run", color: theme.colors.coral, bg: `${theme.colors.coral}14` };
  if (n.includes("walk") || n.includes("hike"))
    return { icon: "walk", color: theme.colors.success, bg: `${theme.colors.success}14` };
  if (n.includes("cycle") || n.includes("bike") || n.includes("cycling"))
    return { icon: "bike", color: theme.colors.sky, bg: `${theme.colors.sky}14` };
  if (n.includes("swim"))
    return { icon: "swim", color: theme.colors.recovery, bg: `${theme.colors.recovery}14` };
  if (n.includes("yoga") || n.includes("pilates"))
    return { icon: "yoga", color: theme.colors.lilac, bg: `${theme.colors.lilac}14` };
  if (n.includes("hiit") || n.includes("interval"))
    return { icon: "lightning-bolt", color: theme.colors.warning, bg: `${theme.colors.warning}14` };
  return { icon: "dumbbell", color: theme.colors.ink, bg: theme.colors.surfaceElevated };
}

function formatDurationLong(totalMin: number): string {
  const total = Math.round(totalMin);
  const h = Math.floor(total / 60);
  const m = total % 60;
  if (h <= 0) return `${m} min`;
  if (m === 0) return `${h} hr`;
  return `${h} hr ${m} min`;
}

/** Average pace as m:ss per km, or null when there's no distance. */
function pacePerKm(durationMin: number, distanceMeters: number | null): string | null {
  if (!distanceMeters || distanceMeters <= 0) return null;
  const km = distanceMeters / 1000;
  const secPerKm = (durationMin * 60) / km;
  const m = Math.floor(secPerKm / 60);
  const s = Math.round(secPerKm % 60);
  return `${m}:${String(s).padStart(2, "0")} /km`;
}

function formatTime(d: Date): string {
  return d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
}

export default function WorkoutDetailScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const handleBack = useGoBack();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [workout, setWorkout] = useState<WorkoutSession | null>(null);
  const [loaded, setLoaded] = useState(false);

  const load = useCallback(async () => {
    await HealthService.initialize(false);
    const list = await HealthService.getWorkouts(30);
    setWorkout(list.find((w) => w.id === id) ?? null);
    setLoaded(true);
  }, [id]);

  useEffect(() => {
    load().catch((e) => {
      console.warn("[WorkoutDetail] load failed:", e);
      setLoaded(true);
    });
  }, [load]);

  const style = workout ? workoutStyle(workout.name) : workoutStyle("");
  const pace = workout ? pacePerKm(workout.durationMin, workout.distance) : null;

  // Heart-rate curve read from the raw samples the wearable recorded during
  // the session (ExerciseSession records themselves carry no HR fields).
  const hrCurve = workout?.heartRateCurve ?? null;
  const hasHrCurve = !!hrCurve && hrCurve.length > 1;
  // The curve is evenly spaced across the session window, so each point's
  // timestamp can be derived exactly — that keeps the scrub tooltip honest.
  const hrLabels = useMemo(() => {
    if (!workout || !hasHrCurve || !hrCurve) return undefined;
    const startMs = workout.startTime.getTime();
    const endMs = workout.endTime.getTime();
    if (!Number.isFinite(startMs) || !Number.isFinite(endMs) || endMs <= startMs) {
      return undefined;
    }
    const bucketMs = (endMs - startMs) / hrCurve.length;
    return hrCurve.map((_, i) => formatTime(new Date(startMs + (i + 0.5) * bucketMs)));
  }, [workout, hrCurve, hasHrCurve]);
  const hrMin = hasHrCurve && hrCurve ? Math.min(...hrCurve) : null;
  const hrMax = workout?.maxHeartRate ?? (hasHrCurve && hrCurve ? Math.max(...hrCurve) : null);
  const hrAvg = workout?.avgHeartRate ?? null;
  const isSwim = workout ? workout.name.toLowerCase().includes("swim") : false;
  const isCycle = workout
    ? /cycl|bike/.test(workout.name.toLowerCase())
    : false;
  const swimPacePer100m = (() => {
    if (!isSwim || !workout?.distance || workout.distance <= 0) return null;
    const per100 = (workout.durationMin * 60) / (workout.distance / 100);
    const m = Math.floor(per100 / 60);
    const s = Math.round(per100 % 60);
    return `${m}:${String(s).padStart(2, "0")} /100m`;
  })();

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={handleBack} style={styles.headerIconBtn} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <MaterialCommunityIcons name="arrow-left" size={22} color={theme.colors.ink} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Workout</Text>
        <View style={styles.headerIconBtn} />
      </View>

      {!loaded ? (
        <ActivityIndicator style={{ marginTop: 40 }} color={theme.colors.muted} />
      ) : !workout ? (
        <View style={styles.emptyWrap}>
          <Text style={styles.emptyText}>Workout not found.</Text>
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.content}>
          <View style={styles.hero}>
            <View style={[styles.heroIcon, { backgroundColor: style.bg }]}>
              <MaterialCommunityIcons name={style.icon as any} size={34} color={style.color} />
            </View>
            <Text style={styles.heroName}>{workout.name}</Text>
            <Text style={styles.heroDate}>
              {workout.startTime.toLocaleDateString("en-US", {
                weekday: "long", month: "long", day: "numeric",
              })}
            </Text>
            <Text style={styles.heroTime}>
              {formatTime(workout.startTime)} – {formatTime(workout.endTime)}
            </Text>
          </View>

          {workout.distance != null && workout.distance > 0 ? (
            <View style={styles.distanceHero}>
              <Text style={styles.distanceValue}>
                {isSwim
                  ? Math.round(workout.distance)
                  : (workout.distance / 1000).toFixed(2)}
                <Text style={styles.distanceUnit}> {isSwim ? "m" : "km"}</Text>
              </Text>
              <Text style={styles.distanceLabel}>Distance</Text>
            </View>
          ) : (
            <View style={styles.distanceHero}>
              <Text style={styles.distanceValue}>
                {formatDurationLong(workout.durationMin)}
              </Text>
              <Text style={styles.distanceLabel}>Duration</Text>
            </View>
          )}

          <View style={styles.statGrid}>
            <StatTile label="Duration" value={formatDurationLong(workout.durationMin)} icon="timer-outline" color={theme.colors.ink} />
            {pace && !isSwim && !isCycle && <StatTile label="Avg pace" value={pace} icon="speedometer" color={theme.colors.success} />}
            {swimPacePer100m && <StatTile label="Avg pace" value={swimPacePer100m} icon="swim" color={theme.colors.recovery} />}
            {workout.calories != null && (
              <StatTile label="Calories" value={`${Math.round(workout.calories)}`} icon="fire" color={theme.colors.coral} />
            )}
            {workout.avgHeartRate != null && (
              <StatTile label="Avg HR" value={`${Math.round(workout.avgHeartRate)} bpm`} icon="heart-pulse" color={theme.colors.danger} />
            )}
            {workout.distance != null && workout.distance > 0 && (
              <StatTile label="Avg speed" value={`${((workout.distance / 1000) / (workout.durationMin / 60)).toFixed(1)} km/h`} icon="map-marker-distance" color={theme.colors.sky} />
            )}

          </View>

          {hasHrCurve && hrCurve && hrLabels ? (
            <View style={styles.hrCard}>
              <View style={styles.hrCardHeader}>
                <MaterialCommunityIcons name="heart-pulse" size={18} color={theme.colors.danger} />
                <Text style={styles.hrCardTitle}>Heart rate</Text>
              </View>
              <InteractiveAreaChart
                values={hrCurve}
                color={theme.colors.danger}
                height={150}
                decimals={0}
                unit="bpm"
                labels={hrLabels}
                accessibilityLabel="Heart rate curve for this workout — drag along the line to explore"
              />
              <View style={styles.hrStatsRow}>
                <View style={styles.hrStatItem}>
                  <Text style={styles.hrStatLabel}>Avg</Text>
                  <Text style={styles.hrStatValue}>{hrAvg != null ? `${Math.round(hrAvg)} bpm` : "—"}</Text>
                </View>
                <View style={styles.hrStatItem}>
                  <Text style={styles.hrStatLabel}>Max</Text>
                  <Text style={styles.hrStatValue}>{hrMax != null ? `${Math.round(hrMax)} bpm` : "—"}</Text>
                </View>
                <View style={styles.hrStatItem}>
                  <Text style={styles.hrStatLabel}>Min</Text>
                  <Text style={styles.hrStatValue}>{hrMin != null ? `${Math.round(hrMin)} bpm` : "—"}</Text>
                </View>
              </View>
            </View>
          ) : null}

          <Text style={styles.note}>
            {hasHrCurve
              ? "Per-kilometre splits need GPS route or lap data, which wearables rarely share — everything above came straight from your wearable."
              : "Your wearable shared no heart-rate samples for this session, so there's no curve to draw. Splits need GPS route or lap data, which is shared even less often."}
          </Text>
        </ScrollView>
      )}
    </View>
  );
}

function StatTile({ label, value, icon, color }: { label: string; value: string; icon?: any; color?: string }) {
  const c = color ?? theme.colors.ink;
  return (
    <View style={styles.statTile}>
      <View style={styles.statTileTop}>
        {icon ? (
          <View style={[styles.statIcon, { backgroundColor: `${c}14` }]}>
            <MaterialCommunityIcons name={icon} size={16} color={c} />
          </View>
        ) : null}
        <Text style={styles.statLabel}>{label}</Text>
      </View>
      <Text style={styles.statValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.bg },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.sm,
  },
  headerIconBtn: { width: 38, height: 38, borderRadius: 19, alignItems: "center", justifyContent: "center" },
  headerTitle: { ...theme.typography.titleLg, color: theme.colors.ink },
  content: { padding: theme.spacing.xl },
  hero: { alignItems: "center", marginBottom: theme.spacing.xl },
  heroIcon: {
    width: 72, height: 72, borderRadius: 36,
    alignItems: "center", justifyContent: "center",
    marginBottom: theme.spacing.md,
  },
  heroName: { ...theme.typography.displayLg, color: theme.colors.ink, fontSize: 26 },
  heroDate: { ...theme.typography.bodyMd, color: theme.colors.body, marginTop: 4 },
  heroTime: { ...theme.typography.caption, color: theme.colors.muted, marginTop: 2 },
  statGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: theme.spacing.sm,
  },
  statTile: {
    flexBasis: "47%",
    flexGrow: 1,
    backgroundColor: theme.colors.card,
    borderRadius: theme.radii.lg,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: theme.spacing.lg,
    ...theme.shadows.cardSoft,
  },
  statTileTop: { flexDirection: "row", alignItems: "center", gap: 6, marginBottom: theme.spacing.xs },
  statIcon: { width: 26, height: 26, borderRadius: 8, alignItems: "center", justifyContent: "center" },
  statValue: { ...theme.typography.titleLg, color: theme.colors.ink },
  statLabel: { ...theme.typography.caption, color: theme.colors.muted, textTransform: "uppercase" },
  distanceHero: { alignItems: "center", marginBottom: theme.spacing.xl },
  distanceValue: { ...theme.typography.displayXl, color: theme.colors.ink, fontSize: 52 },
  distanceUnit: { ...theme.typography.titleLg, color: theme.colors.body },
  distanceLabel: { ...theme.typography.caption, color: theme.colors.muted, marginTop: 2 },
  hrCard: {
    marginTop: theme.spacing.lg,
    backgroundColor: theme.colors.card,
    borderRadius: theme.radii.lg,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: theme.spacing.lg,
    ...theme.shadows.cardSoft,
  },
  hrCardHeader: { flexDirection: "row", alignItems: "center", gap: 6, marginBottom: theme.spacing.sm },
  hrCardTitle: { ...theme.typography.labelMd, color: theme.colors.ink },
  hrStatsRow: {
    flexDirection: "row",
    justifyContent: "space-around",
    marginTop: theme.spacing.sm,
  },
  hrStatItem: { alignItems: "center", gap: 2 },
  hrStatLabel: { ...theme.typography.caption, color: theme.colors.muted, textTransform: "uppercase" },
  hrStatValue: { ...theme.typography.titleSm, color: theme.colors.ink },
  note: {
    ...theme.typography.caption,
    color: theme.colors.muted,
    marginTop: theme.spacing.lg,
    textAlign: "center",
  },
  emptyWrap: { flex: 1, alignItems: "center", justifyContent: "center" },
  emptyText: { ...theme.typography.bodyMd, color: theme.colors.muted },
});

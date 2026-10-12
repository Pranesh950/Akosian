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
  Dimensions,
  FlatList,
  TouchableOpacity,
} from "react-native";
import { useFocusEffect, useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LineChart, type lineDataItem } from "react-native-gifted-charts";
import Svg, { Path } from "react-native-svg";
import { HealthService, DailyActivity, WorkoutSession } from "../../src/services/health";
import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import { theme, formatMonthYear } from "../../src/theme";
import { GradientWash } from "../../src/components/GradientWash";

const SCREEN_WIDTH = Dimensions.get("window").width;
const SIDE_PADDING = theme.spacing.xl * 2;

const WEEKDAYS = ["S", "M", "T", "W", "T", "F", "S"];
const CALENDAR_GAP = 8;
const CALENDAR_CELL_SIZE = Math.max(
  24,
  (SCREEN_WIDTH - SIDE_PADDING - 40 - CALENDAR_GAP * 6) / 7
);

function getActivityColor(count: number): string {
  if (count === 0) return "#F0F1F4";
  if (count === 1) return "#E4F0E5";
  if (count === 2) return "#BFDCC6";
  return "#79B88A";
}

function formatDuration(totalMin: number): string {
  const h = Math.floor(totalMin / 60);
  const m = Math.round(totalMin % 60);
  if (h <= 0) return `${m}m`;
  return `${h}h ${m}m`;
}

function buildCumulativeSeries(
  daily: DailyActivity[]
): { data: lineDataItem[]; maxHours: number } {
  if (!daily.length) return { data: [], maxHours: 1 };

  let cumMin = 0;
  const data: lineDataItem[] = daily.map((d) => {
    cumMin += d.activeMinutes || (d.steps > 3000 ? 20 : d.steps > 0 ? 5 : 0);
    return { value: cumMin / 60 };
  });
  const maxHours = Math.max(1, ...data.map((d) => d.value ?? 0)) * 1.1;
  return { data, maxHours };
}

const WORKOUT_CARD_WIDTH = SCREEN_WIDTH * 0.62;

// Inline heart-rate sparkline geometry for the workout cards. A plain SVG
// path is used (not a chart component) so the horizontal card list never
// fights with a chart's touch responder.
const HR_SPARK_HEIGHT = 40;
const HR_SPARK_WIDTH = Math.max(80, WORKOUT_CARD_WIDTH - theme.spacing.lg * 2);

function buildHrSparkPath(values: number[], w: number, h: number): string {
  if (values.length < 2) return "";
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;
  const step = w / (values.length - 1);
  return values
    .map((v, i) => {
      const x = i * step;
      const y = h - 3 - ((v - min) / range) * (h - 6);
      return `${i === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");
}

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
  // strength/weights/default
  return { icon: "dumbbell", color: theme.colors.ink, bg: theme.colors.surfaceElevated };
}

function formatShortDate(date: string): string {
  const d = new Date(date + "T12:00:00");
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}



export default function FitnessScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [refreshing, setRefreshing] = useState(false);
  const [daily, setDaily] = useState<DailyActivity[]>([]);
  const [workouts, setWorkouts] = useState<WorkoutSession[]>([]);
  const [chartWidth, setChartWidth] = useState(0);
  // Null while unknown. False on Android when the Health Connect exercise
  // permission is missing — getWorkouts() then returns [] even if the user
  // has workouts, so the empty state must say so instead of "no workouts".
  const [canReadWorkouts, setCanReadWorkouts] = useState<boolean | null>(null);
  const [requestingAccess, setRequestingAccess] = useState(false);

  const loadData = useCallback(async () => {
    setRefreshing(true);
    try {
      await HealthService.initialize(false);
      const d = await HealthService.getDailyActivity(30);
      setDaily(d);
      const w = await HealthService.getWorkouts(30);
      setWorkouts(w);
      setCanReadWorkouts(await HealthService.canReadWorkouts());
    } catch (e) {
      console.warn("[Fitness] load failed:", e);
    } finally {
      setRefreshing(false);
    }
  }, []);

  const handleGrantWorkoutAccess = useCallback(async () => {
    setRequestingAccess(true);
    try {
      await HealthService.initialize(true);
    } catch (e) {
      console.warn("[Fitness] workout permission request failed:", e);
    } finally {
      setRequestingAccess(false);
      await loadData();
    }
  }, [loadData]);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData])
  );

  const todayKey = useMemo(() => {
    const n = new Date();
    return `${n.getFullYear()}-${String(n.getMonth() + 1).padStart(2, "0")}-${String(n.getDate()).padStart(2, "0")}`;
  }, []);

  const totalMinutes = useMemo(
    () =>
      daily.reduce(
        (sum, d) =>
          sum +
          (d.activeMinutes ||
            (d.workoutCount > 0 ? d.workoutCount * 30 : d.steps > 5000 ? 25 : 0)),
        0
      ),
    [daily]
  );

  const totalWorkouts = useMemo(
    () => daily.reduce((sum, d) => sum + d.workoutCount, 0),
    [daily]
  );

  const dateRangeLabel = useMemo(() => {
    if (daily.length < 2) return "Last 30 days";
    const first = new Date(daily[0].date + "T12:00:00");
    const last = new Date(daily[daily.length - 1].date + "T12:00:00");
    const fmt = (d: Date) =>
      d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
    return `${fmt(first)} – ${fmt(last)}`;
  }, [daily]);

  const chartGeomWidth =
    chartWidth > 0 ? chartWidth : Math.max(280, SCREEN_WIDTH - SIDE_PADDING - 32);

  const chart = useMemo(() => buildCumulativeSeries(daily), [daily]);

  const monthLabel = formatMonthYear();

  // Render the current month as a familiar Sunday–Saturday calendar.
  const calendarCells = useMemo(() => {
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth();
    const firstDate = new Date(year, month, 1);
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const activityByDate = new Map(daily.map((d) => [d.date, d]));
    const leadingPads = firstDate.getDay();

    const cells: {
      key: string;
      count: number;
      isToday: boolean;
    }[] = Array.from({ length: leadingPads }, (_, i) => ({
      key: `pad-start-${i}`,
      count: -1,
      isToday: false,
    }));

    for (let day = 1; day <= daysInMonth; day += 1) {
      const dateKey = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
      const activity = activityByDate.get(dateKey);
      cells.push({
        key: dateKey,
        count: activity
          ? activity.workoutCount > 0
            ? activity.workoutCount
            : activity.steps >= 7500
              ? 1
              : 0
          : 0,
        isToday: dateKey === todayKey,
      });
    }

    const trailingCount = (7 - (cells.length % 7)) % 7;
    for (let i = 0; i < trailingCount; i += 1) {
      cells.push({
        key: `pad-end-${i}`,
        count: -1,
        isToday: false,
      });
    }

    return cells;
  }, [daily, todayKey]);

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <GradientWash color={theme.colors.info} />
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Fitness</Text>
        <Text style={styles.headerDate}>Last 30 days</Text>
      </View>

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
        {/* Calendar heatmap */}
        <View style={styles.heatmapCard}>
          <Text style={styles.monthLabel}>{monthLabel}</Text>
          <View style={styles.weekdayRow}>
            {WEEKDAYS.map((d, i) => (
              <Text key={i} style={styles.weekdayLabel}>
                {d}
              </Text>
            ))}
          </View>
          <View style={styles.calendarGrid}>
            {calendarCells.map((cell) =>
              cell.count < 0 ? (
                <View key={cell.key} style={[styles.calCell, styles.calCellEmpty]} />
              ) : (
                <View
                  key={cell.key}
                  style={[
                    styles.calCell,
                    { backgroundColor: getActivityColor(cell.count) },
                    cell.isToday && styles.todayCell,
                  ]}
                />
              )
            )}
          </View>
          <View style={styles.legendRow}>
            <View style={styles.legendItem}>
              <View
                style={[styles.legendDot, { backgroundColor: theme.colors.surfaceElevated }]}
              />
              <Text style={styles.legendText}>No activity</Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: "#E4F0E5" }]} />
              <Text style={styles.legendText}>1 activity</Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: "#BFDCC6" }]} />
              <Text style={styles.legendText}>2 activities</Text>
            </View>
            <View style={styles.legendItem}>
              <View
                style={[styles.legendDot, { backgroundColor: "#79B88A" }]}
              />
              <Text style={styles.legendText}>3+ activities</Text>
            </View>
          </View>
        </View>

        {/* Activity summary */}
        <View style={styles.activitySummaryCard}>
          <View style={styles.summaryHeader}>
            <Text style={styles.summaryTitle}>Activity summary</Text>
          </View>
          <View style={styles.summaryStatsRow}>
            <View>
              <Text style={styles.summaryStatValue}>
                {totalMinutes > 0 ? formatDuration(totalMinutes) : "—"}
              </Text>
              <Text style={styles.summaryStatRange}>{dateRangeLabel}</Text>
            </View>
            <View style={styles.summaryDelta}>
              <Text style={styles.summaryDeltaText}>
                {totalWorkouts > 0
                  ? `${totalWorkouts} workout${totalWorkouts === 1 ? "" : "s"}`
                  : "No workouts"}
              </Text>
            </View>
          </View>

          {chart.data.length > 0 ? (
            <View style={styles.dualChartContainer}>
              <Text style={styles.axisLabel}>{Math.ceil(chart.maxHours)}</Text>
              <Text style={styles.axisLabelBottom}>0</Text>

              <View
                style={styles.chartTouchArea}
                onLayout={(e) => setChartWidth(e.nativeEvent.layout.width)}
                accessibilityLabel="Cumulative activity chart — drag along the line to explore each day"
              >
                {chartGeomWidth > 0 && (
                  <LineChart
                    data={chart.data}
                    width={chartGeomWidth}
                    height={100}
                    maxValue={chart.maxHours}
                    areaChart
                    curved
                    thickness={2.5}
                    color="#C45C52"
                    startFillColor="#C4892A"
                    endFillColor="#C45C52"
                    startOpacity={0.3}
                    endOpacity={0.04}
                    hideDataPoints
                    hideAxesAndRules
                    hideYAxisText
                    yAxisLabelWidth={0}
                    rulesColor="transparent"
                    initialSpacing={0}
                    endSpacing={0}
                    adjustToWidth
                    disableScroll
                    pointerConfig={{
                      pointerColor: "#C45C52",
                      radius: 5,
                      pointerStripColor: "#C45C52",
                      pointerStripWidth: 1,
                      pointerStripUptoDataPoint: true,
                      showPointerStrip: true,
                      pointerLabelComponent: (items: any[], index: number) => {
                        const item = items?.[0];
                        if (!item) return null;
                        const day = daily[index];
                        const value = Number(item.value ?? 0);
                        return (
                          <View style={styles.scrubTooltip}>
                            <Text style={styles.scrubTooltipDate}>
                              {day ? formatShortDate(day.date) : ""}
                            </Text>
                            <Text style={styles.scrubTooltipValue}>
                              {value.toFixed(1)}h cumulative
                            </Text>
                            {day && day.workoutCount > 0 && (
                              <Text style={styles.scrubTooltipSub}>
                                {day.workoutCount} workout{day.workoutCount === 1 ? "" : "s"}
                              </Text>
                            )}
                          </View>
                        );
                      },
                      pointerLabelWidth: 132,
                      pointerLabelHeight: 58,
                      autoAdjustPointerLabelPosition: true,
                      pointerVanishDelay: 900,
                      activatePointersOnLongPress: true,
                    }}
                  />
                )}
              </View>

              <Text style={styles.scrubHint}>Touch and hold, then drag to explore</Text>
            </View>
          ) : (
            <Text style={styles.emptyChartNote}>
              Move more this month to see your cumulative activity curve.
            </Text>
          )}
        </View>

        {/* Recent workouts carousel */}
        <View style={styles.workoutsSection}>
          <Text style={styles.workoutsTitle}>Recent workouts</Text>
          {workouts.length === 0 ? (
            canReadWorkouts === false ? (
              <View style={styles.workoutAccessCard}>
                <MaterialCommunityIcons name="shield-alert-outline" size={22} color={theme.colors.warning} />
                <Text style={styles.workoutAccessTitle}>We can't see your workouts yet</Text>
                <Text style={styles.workoutAccessText}>
                  Your workouts live in Health Connect, but exercise access isn't granted so they don't show up here.
                </Text>
                <TouchableOpacity
                  style={styles.workoutAccessBtn}
                  onPress={handleGrantWorkoutAccess}
                  disabled={requestingAccess}
                  activeOpacity={0.8}
                >
                  <Text style={styles.workoutAccessBtnText}>
                    {requestingAccess ? "Requesting…" : "Allow workout access"}
                  </Text>
                </TouchableOpacity>
              </View>
            ) : (
              <Text style={styles.workoutsEmpty}>
                No workouts recorded in the last 30 days.
              </Text>
            )
          ) : (
            <FlatList
              data={workouts}
              keyExtractor={(w) => w.id}
              horizontal
              showsHorizontalScrollIndicator={false}
              snapToInterval={WORKOUT_CARD_WIDTH + 12}
              decelerationRate="fast"
              renderItem={({ item }) => (
                <TouchableOpacity
                  key={item.id}
                  onPress={() => router.push(`/workout/detail?id=${encodeURIComponent(item.id)}` as any)}
                  activeOpacity={0.85}
                >
                <View style={styles.workoutCard}>
                  <View style={[styles.workoutHeaderBand, { backgroundColor: workoutStyle(item.name).bg }]}>
                    <View style={[styles.workoutIconWrap, { backgroundColor: `${workoutStyle(item.name).color}1F` }]}>
                      <MaterialCommunityIcons
                        name={workoutStyle(item.name).icon as any}
                        size={20}
                        color={workoutStyle(item.name).color}
                      />
                    </View>
                    <Text style={styles.workoutDate}>
                      {item.startTime.toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                      })}
                    </Text>
                  </View>
                  <Text style={styles.workoutName} numberOfLines={1}>
                    {item.name}
                  </Text>
                  <Text style={styles.workoutDuration}>
                    {formatDuration(item.durationMin)}
                  </Text>
                  <View style={styles.workoutMetaRow}>
                    {item.calories != null && (
                      <View style={styles.workoutMetaChip}>
                        <MaterialCommunityIcons name="fire" size={12} color={theme.colors.coral} />
                        <Text style={styles.workoutMeta}>{Math.round(item.calories)} cal</Text>
                      </View>
                    )}
                    {item.distance != null && item.distance > 0 && (
                      <View style={styles.workoutMetaChip}>
                        <MaterialCommunityIcons name="map-marker-distance" size={12} color={theme.colors.sky} />
                        <Text style={styles.workoutMeta}>{(item.distance / 1000).toFixed(1)} km</Text>
                      </View>
                    )}
                    {item.avgHeartRate != null && (
                      <View style={styles.workoutMetaChip}>
                        <MaterialCommunityIcons name="heart-pulse" size={12} color={theme.colors.danger} />
                        <Text style={styles.workoutMeta}>{Math.round(item.avgHeartRate)} bpm</Text>
                      </View>
                    )}
                  </View>
                  {item.heartRateCurve && item.heartRateCurve.length > 1 ? (
                    <View
                      style={styles.workoutHrChart}
                      accessibilityLabel={
                        item.avgHeartRate != null
                          ? `Heart rate curve for ${item.name}, average ${Math.round(item.avgHeartRate)} beats per minute`
                          : `Heart rate curve for ${item.name}`
                      }
                    >
                      <Svg
                        width={HR_SPARK_WIDTH}
                        height={HR_SPARK_HEIGHT}
                        viewBox={`0 0 ${HR_SPARK_WIDTH} ${HR_SPARK_HEIGHT}`}
                      >
                        <Path
                          d={buildHrSparkPath(item.heartRateCurve, HR_SPARK_WIDTH, HR_SPARK_HEIGHT)}
                          stroke={theme.colors.danger}
                          strokeWidth={1.5}
                          fill="none"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </Svg>
                    </View>
                  ) : null}
                  </View>
                </TouchableOpacity>
              )}
            />
          )}
        </View>

      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.bg,
  },
  header: {
    paddingTop: theme.spacing.md,
    paddingHorizontal: theme.spacing.xl,
    paddingBottom: theme.spacing.sm,
  },
  headerTitle: {
    ...theme.typography.displayMd,
    color: theme.colors.ink,
  },
  headerDate: {
    ...theme.typography.caption,
    color: theme.colors.muted,
    marginTop: 2,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: theme.spacing.xl,
    paddingBottom: theme.spacing.xxxl * 2.5 + theme.spacing.xxl,
    paddingTop: theme.spacing.sm,
  },
  workoutMeta: {
    ...theme.typography.caption,
    color: theme.colors.body,
  },
  workoutMetaChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: theme.colors.surfaceElevated,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: theme.radii.full,
  },
  workoutsSection: {
    marginTop: theme.spacing.lg,
  },
  workoutsTitle: {
    ...theme.typography.titleSm,
    color: theme.colors.ink,
    marginBottom: theme.spacing.sm,
  },
  workoutsEmpty: {
    ...theme.typography.bodyMd,
    color: theme.colors.muted,
  },
  workoutAccessCard: {
    backgroundColor: theme.colors.card,
    borderRadius: theme.radii.xl,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: theme.spacing.lg,
    alignItems: "center",
    gap: theme.spacing.xs,
    ...theme.shadows.card,
  },
  workoutAccessTitle: {
    ...theme.typography.titleSm,
    color: theme.colors.ink,
    marginTop: theme.spacing.xs,
  },
  workoutAccessText: {
    ...theme.typography.bodyMd,
    color: theme.colors.muted,
    textAlign: "center",
    lineHeight: 20,
  },
  workoutAccessBtn: {
    marginTop: theme.spacing.sm,
    paddingHorizontal: theme.spacing.xl,
    paddingVertical: theme.spacing.sm,
    backgroundColor: theme.colors.primary,
    borderRadius: theme.radii.md,
  },
  workoutAccessBtnText: {
    ...theme.typography.labelMd,
    color: "#FFFFFF",
  },
  workoutCard: {
    width: WORKOUT_CARD_WIDTH,
    backgroundColor: theme.colors.card,
    borderRadius: theme.radii.xl,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: theme.spacing.lg,
    marginRight: 12,
    overflow: "hidden",
    ...theme.shadows.card,
  },
  workoutHeaderBand: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginHorizontal: -theme.spacing.lg,
    marginTop: -theme.spacing.lg,
    marginBottom: theme.spacing.md,
    paddingHorizontal: theme.spacing.lg,
    paddingTop: theme.spacing.md,
    paddingBottom: theme.spacing.md,
  },
  workoutIconWrap: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: theme.colors.surfaceElevated,
    alignItems: "center",
    justifyContent: "center",
  },
  workoutDate: {
    ...theme.typography.caption,
    color: theme.colors.muted,
  },
  workoutName: {
    ...theme.typography.titleSm,
    color: theme.colors.ink,
  },
  workoutDuration: {
    ...theme.typography.displayMd,
    color: theme.colors.ink,
    marginTop: 2,
    fontSize: 24,
  },
  workoutMetaRow: {
    flexDirection: "row",
    gap: theme.spacing.sm,
    marginTop: theme.spacing.sm,
  },
  workoutHrChart: {
    marginTop: theme.spacing.sm,
  },
  heatmapCard: {
    backgroundColor: theme.colors.card,
    borderRadius: theme.radii.xl,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: theme.spacing.lg,
    marginBottom: theme.spacing.md,
    ...theme.shadows.card,
  },
  monthLabel: {
    ...theme.typography.caption,
    color: theme.colors.ink,
    marginBottom: theme.spacing.sm,
  },
  weekdayRow: {
    flexDirection: "row",
    gap: CALENDAR_GAP,
    marginBottom: theme.spacing.xs,
  },
  weekdayLabel: {
    ...theme.typography.legal,
    color: theme.colors.muted,
    fontSize: 10,
    width: CALENDAR_CELL_SIZE,
    textAlign: "center",
  },
  calendarGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: CALENDAR_GAP,
  },
  calCell: {
    width: CALENDAR_CELL_SIZE,
    height: CALENDAR_CELL_SIZE,
    borderRadius: CALENDAR_CELL_SIZE / 2,
  },
  calCellEmpty: {
    backgroundColor: "transparent",
  },
  todayCell: {
    borderWidth: 2,
    borderColor: theme.colors.ink,
  },
  legendRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
    columnGap: theme.spacing.md,
    rowGap: theme.spacing.xs,
    marginTop: theme.spacing.lg,
    paddingHorizontal: theme.spacing.xs,
  },
  legendItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 2,
  },
  legendText: {
    ...theme.typography.legal,
    color: theme.colors.muted,
  },
  activitySummaryCard: {
    backgroundColor: theme.colors.card,
    borderRadius: theme.radii.xl,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: theme.spacing.lg,
    marginBottom: theme.spacing.md,
    ...theme.shadows.card,
  },
  summaryHeader: {
    marginBottom: theme.spacing.sm,
  },
  summaryTitle: {
    ...theme.typography.labelMd,
    color: theme.colors.ink,
  },
  summaryStatsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: theme.spacing.sm,
  },
  summaryStatValue: {
    ...theme.typography.titleLg,
    color: theme.colors.ink,
  },
  summaryStatRange: {
    ...theme.typography.legal,
    color: theme.colors.muted,
    marginTop: 2,
  },
  summaryDelta: {
    backgroundColor: theme.colors.surfaceElevated,
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: 4,
    borderRadius: theme.radii.sm,
  },
  summaryDeltaText: {
    ...theme.typography.legal,
    color: theme.colors.body,
  },
  dualChartContainer: {
    marginTop: theme.spacing.sm,
    position: "relative",
  },
  chartTouchArea: {
    position: "relative",
    // Paints above the corner axis labels (zIndex 10) so the scrub tooltip
    // is never covered by them.
    zIndex: 12,
  },
  scrubTooltip: {
    position: "absolute",
    width: 132,
    backgroundColor: theme.colors.ink,
    borderRadius: theme.radii.sm,
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: theme.spacing.xs,
    alignItems: "center",
    zIndex: 20,
    shadowColor: theme.colors.ink,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.18,
    shadowRadius: 7,
    elevation: 4,
  },
  scrubTooltipDate: {
    color: "#C9CBD1",
    fontFamily: "Nunito_400Regular",
    fontSize: 10,
  },
  scrubTooltipValue: {
    color: theme.colors.card,
    fontFamily: "Nunito_700Bold",
    fontWeight: "700",
    fontSize: 12,
    marginTop: 1,
  },
  scrubTooltipSub: {
    color: "#C9CBD1",
    fontFamily: "Nunito_400Regular",
    fontSize: 10,
    marginTop: 1,
  },
  scrubHint: {
    ...theme.typography.legal,
    color: theme.colors.muted,
    textAlign: "center",
    marginTop: theme.spacing.xs,
  },
  axisLabel: {
    position: "absolute",
    top: 0,
    left: 0,
    ...theme.typography.legal,
    color: theme.colors.muted,
    zIndex: 10,
  },
  axisLabelBottom: {
    position: "absolute",
    bottom: 4,
    left: 0,
    ...theme.typography.legal,
    color: theme.colors.muted,
    zIndex: 10,
  },
  emptyChartNote: {
    ...theme.typography.legal,
    color: theme.colors.muted,
    marginTop: theme.spacing.sm,
  },
});

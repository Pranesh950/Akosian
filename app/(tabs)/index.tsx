// Myrri Health
// Copyright (C) 2026 Pranesh Shivaraj
//
// This program is free software: you can redistribute it and/or modify
// it under the terms of the GNU General Public License as published by
// the Free Software Foundation, either version 3 of the License, or
// (at your option) any later version.

import { useCallback, useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  Animated,
  Platform,
  Alert,
} from "react-native";
import { useFocusEffect, useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import {
  HealthService,
  HealthData,
  HealthConnectionStatus,
  computeStrainScore,
  computeSleepScore,
  resetOnboardingState,
} from "../../src/services/health";
import { theme, formatFriendlyDate, formatSleepDuration } from "../../src/theme";
import { GradientWash } from "../../src/components/GradientWash";
import { BandGauge } from "../../src/components/BandGauge";
import { loadPlan } from "../../src/services/coachPlan";
import { getDistanceUnit, formatDistance, type DistanceUnit } from "../../src/services/units";

function scoreColor(score: number): string {
  if (score >= 70) return theme.colors.success;
  if (score >= 40) return theme.colors.warning;
  return theme.colors.danger;
}

function fmt(value: number | null | undefined, digits = 0): string {
  if (value == null || !Number.isFinite(value)) return "—";
  if (digits === 0) return Math.round(value).toString();
  return value.toFixed(digits);
}

interface VitalSignCardProps {
  label: string;
  value: string;
  unit: string;
  icon: keyof typeof MaterialCommunityIcons.glyphMap;
  accent?: string;
}

function VitalSignCard({ label, value, unit, icon, accent }: VitalSignCardProps) {
  const empty = value === "—";
  const c = accent ?? theme.colors.ink;
  return (
    <View style={[styles.vitalCard, empty && styles.vitalCardEmpty]}>
      <View style={[styles.vitalAccent, { backgroundColor: empty ? theme.colors.border : c }]} />
      <View style={styles.vitalTop}>
        <View style={[styles.vitalIconWrap, { backgroundColor: `${c}14` }]}>
          <MaterialCommunityIcons
            name={icon}
            size={15}
            color={empty ? theme.colors.muted : c}
          />
        </View>
        <Text style={styles.vitalLabel}>{label}</Text>
      </View>
      <View style={styles.vitalValueRow}>
        <Text style={[styles.vitalValue, empty && styles.vitalValueEmpty]}>{value}</Text>
        {!empty && unit ? <Text style={styles.vitalUnit}>{unit}</Text> : null}
      </View>
    </View>
  );
}

export default function HomeScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [data, setData] = useState<HealthData | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [status, setStatus] = useState<HealthConnectionStatus>("needs_permission");
  const [loaded, setLoaded] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [sleepGoal, setSleepGoal] = useState<number | null>(null);
  const [distanceUnit, setDistanceUnit] = useState<DistanceUnit>("km");

  const bandsAnim = useRef(new Animated.Value(0)).current;
  const snapshotAnim = useRef(new Animated.Value(0)).current;
  const vitalsAnim = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const spinAnim = useRef(new Animated.Value(0)).current;

  const loadData = useCallback(async (showIndicator = true): Promise<HealthConnectionStatus> => {
    if (showIndicator) setRefreshing(true);
    try {
      // Refresh existing access only. Permission prompts belong to an explicit
      // connect action, not a tab focus or pull-to-refresh.
      await HealthService.initialize(false);
      const [today, conn] = await Promise.all([
        HealthService.getTodayData(),
        HealthService.getConnectionStatus(),
      ]);
      setData(today);
      setStatus(conn);
      const plan = await loadPlan();
      setSleepGoal(plan?.sleepHours ?? null);
      setDistanceUnit(await getDistanceUnit());
      return conn;
    } catch (e) {
      console.warn("[Home] load failed:", e);
      setStatus("error");
      return "error";
    } finally {
      setRefreshing(false);
      setLoaded(true);
      bandsAnim.setValue(0);
      snapshotAnim.setValue(0);
      vitalsAnim.setValue(0);
      Animated.stagger(100, [
        Animated.timing(bandsAnim, { toValue: 1, duration: 400, useNativeDriver: true }),
        Animated.timing(snapshotAnim, { toValue: 1, duration: 400, useNativeDriver: true }),
        Animated.timing(vitalsAnim, { toValue: 1, duration: 400, useNativeDriver: true }),
      ]).start();
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData])
  );

  useEffect(() => {
    if (status !== "connected") {
      const loop = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, { toValue: 0.3, duration: 800, useNativeDriver: true }),
          Animated.timing(pulseAnim, { toValue: 1, duration: 800, useNativeDriver: true }),
        ])
      );
      loop.start();
      return () => loop.stop();
    } else {
      pulseAnim.setValue(1);
    }
  }, [status]);

  const strainScore = data ? computeStrainScore(data) : 0;
  const sleepScore = data ? computeSleepScore(data) : 0;
  const hasActivity = (data?.steps ?? 0) > 0 || (data?.activeCalories ?? 0) > 0;
  const hasSleep = (data?.sleepHours ?? 0) > 0;

  const showConnectBanner = loaded && status !== "connected";

  // Explicit sync action. Health Connect / Apple Health cannot pull from a
  // wearable directly — data only arrives once the wearable's own app syncs
  // over Bluetooth — so any sync that lands empty points the user there.
  const handleSync = async () => {
    if (syncing) return;
    setSyncing(true);
    const spin = Animated.loop(
      Animated.timing(spinAnim, { toValue: 1, duration: 900, useNativeDriver: true })
    );
    spin.start();
    try {
      // Skip the pull-to-refresh spinner; the spinning icon is the cue.
      const conn = await loadData(false);
      if (conn !== "connected") {
        const needsHealthSetup =
          conn === "needs_permission" ||
          conn === "not_connected" ||
          conn === "access_requested" ||
          conn === "unavailable";
        Alert.alert(
          conn === "connected_no_data" ? "No new data yet" : "Sync failed",
          needsHealthSetup
            ? "Myrri can't read your health data yet — connect your health data first, then tap Sync again."
            : "We couldn't pull any new data. Turn on Bluetooth and make sure your wearable is connected and syncing in its companion app, then tap Sync again."
        );
      }
    } finally {
      spin.stop();
      spinAnim.setValue(0);
      setSyncing(false);
    }
  };

  const handleConnect = async () => {
    // iOS only shows the HealthKit permission sheet once per data type. Once
    // Apple has recorded a decision there is no sheet left to show, so calling
    // init again looks like a dead button — give the tap a visible response and
    // send the user to the Health app, where access actually lives.
    if (Platform.OS === "ios") {
      if (status === "unavailable") {
        Alert.alert(
          "Apple Health not available",
          "HealthKit needs a development or App Store build — it does not work in Expo Go. You can keep using Myrri with manual logging in the meantime."
        );
        return;
      }
      if (status === "access_requested" || status === "connected_no_data") {
        Alert.alert(
          "Review access in the Health app",
          "Apple does not tell apps which read types you allowed. Open Health → Sharing → Apps → Myrri to review or change access, then come back and pull to refresh.",
          [
            { text: "Not now", style: "cancel" },
            {
              text: "Open Health app",
              onPress: async () => {
                await HealthService.openSettings();
                loadData();
              },
            },
          ]
        );
        return;
      }
    }

    if (status === "unavailable" || status === "access_requested") {
      await HealthService.openSettings();
      loadData();
      return;
    }

    const granted = await HealthService.initialize(true);
    if (!granted) {
      Alert.alert(
        "Health access could not be requested",
        Platform.OS === "ios"
          ? "HealthKit is unavailable in this build or on this device. You can continue using Myrri with manual logging."
          : "Health Connect is unavailable right now. Install or update Health Connect, then tap Connect again."
      );
    }
    loadData();
  };

  // Dev-only: wipe onboarding flags/state and restart the setup flow.
  const confirmRestartOnboarding = () => {
    Alert.alert(
      "Restart onboarding?",
      "This clears your profile, coach plan, AI provider settings, and health setup so you can walk through onboarding again. Your meals and journal logs are kept.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Restart",
          style: "destructive",
          onPress: async () => {
            await resetOnboardingState();
            router.replace("/onboarding/device");
          },
        },
      ]
    );
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <GradientWash color={theme.colors.info} />
      <View style={styles.header}>
        <View>
          <Text style={styles.greeting}>Overview</Text>
          <Text style={styles.dateText}>{formatFriendlyDate()}</Text>
        </View>
        <View style={styles.headerRight}>
          <TouchableOpacity
            style={styles.headerIconButton}
            onPress={handleSync}
            activeOpacity={0.7}
            disabled={syncing}
            accessibilityLabel="Sync health data"
            accessibilityRole="button"
          >
            <Animated.View
              style={{
                transform: [
                  {
                    rotate: spinAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: ["0deg", "360deg"],
                    }),
                  },
                ],
              }}
            >
              <MaterialCommunityIcons
                name="sync"
                size={18}
                color={syncing ? theme.colors.primary : theme.colors.ink}
              />
            </Animated.View>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.headerIconButton}
            onPress={() => router.push("/settings")}
            activeOpacity={0.7}
            accessibilityLabel="Settings"
          >
            <MaterialCommunityIcons name="cog-outline" size={20} color={theme.colors.ink} />
          </TouchableOpacity>
          {__DEV__ && (
            <TouchableOpacity
              style={styles.devRestartButton}
              onPress={confirmRestartOnboarding}
              activeOpacity={0.7}
              accessibilityLabel="Restart onboarding (dev only)"
            >
              <MaterialCommunityIcons name="restart" size={18} color={theme.colors.muted} />
            </TouchableOpacity>
          )}
          <View
            style={[
              styles.statusPill,
              status === "connected" ? styles.statusOk : styles.statusWarn,
            ]}
          >
            <Animated.View
              style={[
                styles.statusDot,
                {
                  backgroundColor:
                    status === "connected"
                      ? theme.colors.success
                      : theme.colors.warning,
                  opacity: status === "connected" ? 1 : pulseAnim,
                },
              ]}
            />
            <Text style={styles.statusText}>
              {status === "connected"
                ? Platform.OS === "ios"
                  ? "Health"
                  : "Connected"
                : status === "needs_permission"
                  ? "Connect"
                  : status === "access_requested"
                    ? "Check access"
                    : status === "not_connected"
                      ? "Not connected"
                      : status === "unavailable"
                        ? "Unavailable"
                        : "Error"}
            </Text>
          </View>
        </View>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => loadData()}
            tintColor={theme.colors.muted}
          />
        }
      >
        {showConnectBanner && (
          <TouchableOpacity
            style={styles.connectBanner}
            onPress={handleConnect}
            activeOpacity={0.8}
          >
            <View style={styles.connectIcon}>
              <MaterialCommunityIcons
                name={Platform.OS === "ios" ? "apple" : "heart-pulse"}
                size={20}
                color={theme.colors.primary}
              />
            </View>
            <View style={styles.connectCopy}>
              <Text style={styles.connectTitle}>
                {status === "unavailable"
                  ? Platform.OS === "android"
                    ? "Health Connect not available"
                    : "Apple Health not available"
                  : status === "connected_no_data"
                    ? "Waiting for wearable data"
                    : "Connect your health data"}
              </Text>
              <Text style={styles.connectSub}>
                {status === "unavailable"
                  ? Platform.OS === "android"
                    ? "Install or update Health Connect, then return here."
                    : "Health data is not available on this device."
                  : status === "connected_no_data"
                    ? Platform.OS === "android"
                      ? "Access is allowed, but Health Connect has no recent records. Open your wearable app and sync it first."
                      : "Access is allowed, but Apple Health has no recent records. Open the Health app and confirm your watch has synced."                    : status === "access_requested"
                    ? "Apple hides read permission details. Tap to review access in the Health app."
                    : status === "not_connected"
                      ? "You chose to set this up later. Tap to connect when ready."
                      : "Allow read access to steps, sleep, heart rate, and more."}
              </Text>
            </View>
            <MaterialCommunityIcons
              name="chevron-right"
              size={20}
              color={theme.colors.muted}
            />
          </TouchableOpacity>
        )}

        {/* Strain & Sleep */}
        <Animated.View style={[styles.bandsCard, { opacity: bandsAnim, transform: [{ translateY: bandsAnim.interpolate({ inputRange: [0, 1], outputRange: [16, 0] }) }] }]}>
          <TouchableOpacity
            onPress={() => router.push("/sleep/detail")}
            activeOpacity={0.7}
            style={styles.gaugeTouchable}
          >
            <BandGauge
              label="Sleep"
              score={hasSleep ? sleepScore : 0}
              color={hasSleep ? theme.colors.info : theme.colors.muted}
              size={130}
            />
            {hasSleep && sleepGoal != null && (
              <Text
                style={[
                  styles.sleepGoalCaption,
                  (data?.sleepHours ?? 0) >= sleepGoal - 0.5 && styles.sleepGoalCaptionHit,
                ]}
              >
                {formatSleepDuration(data?.sleepHours)} of {formatSleepDuration(sleepGoal)} goal
              </Text>
            )}
          </TouchableOpacity>
          <View style={styles.ringDivider} />
          <TouchableOpacity
            onPress={() => router.push("/strain/detail")}
            activeOpacity={0.7}
            style={styles.gaugeTouchable}
          >
            <BandGauge
              label="Strain"
              score={hasActivity ? strainScore : 0}
              color={hasActivity ? theme.colors.danger : theme.colors.muted}
              size={130}
            />
          </TouchableOpacity>
        </Animated.View>

        {/* Day snapshot */}
        <Animated.View style={{ opacity: snapshotAnim, transform: [{ translateY: snapshotAnim.interpolate({ inputRange: [0, 1], outputRange: [16, 0] }) }] }}>
        <Text style={styles.sectionTitle}>Today</Text>
        <View style={styles.snapshotRow}>
          <View style={styles.snapshotCard}>
            <View style={[styles.snapshotIcon, { backgroundColor: `${theme.colors.success}14` }]}>
              <MaterialCommunityIcons name="shoe-print" size={15} color={theme.colors.success} />
            </View>
            <Text style={styles.snapshotLabel}>Steps</Text>
            <Text style={styles.snapshotValue}>
              {data?.steps ? data.steps.toLocaleString() : "—"}
            </Text>
          </View>
          <View style={styles.snapshotCard}>
            <View style={[styles.snapshotIcon, { backgroundColor: `${theme.colors.warning}14` }]}>
              <MaterialCommunityIcons name="fire" size={15} color={theme.colors.warning} />
            </View>
            <Text style={styles.snapshotLabel}>Active cal</Text>
            <Text style={styles.snapshotValue}>
              {data?.activeCalories ? Math.round(data.activeCalories).toString() : "—"}
            </Text>
            {data?.activeCalories ? (
              <Text style={styles.snapshotUnit}>kcal</Text>
            ) : null}
          </View>
          <View style={styles.snapshotCard}>
            <View style={[styles.snapshotIcon, { backgroundColor: `${theme.colors.info}14` }]}>
              <MaterialCommunityIcons name="map-marker-distance" size={15} color={theme.colors.info} />
            </View>
            <Text style={styles.snapshotLabel}>Distance</Text>
            <Text style={styles.snapshotValue}>
              {data?.distance ? formatDistance(data.distance, distanceUnit) : "—"}
            </Text>
          </View>
        </View>
        </Animated.View>

        {/* Vital signs */}
        <Animated.View style={{ opacity: vitalsAnim, transform: [{ translateY: vitalsAnim.interpolate({ inputRange: [0, 1], outputRange: [16, 0] }) }] }}>
        <Text style={styles.sectionTitle}>Vitals</Text>
        <View style={styles.vitalGrid}>
          <VitalSignCard
            label="HRV"
            value={fmt(data?.heartRateVariability)}
            unit="ms"
            icon="waveform"
            accent={theme.colors.lilac}
          />
          <VitalSignCard
            label="Resting HR"
            value={fmt(data?.restingHeartRate)}
            unit="bpm"
            icon="heart-pulse"
            accent={theme.colors.danger}
          />
          <VitalSignCard
            label="Sleep"
            value={formatSleepDuration(
              data?.sleepHours && data.sleepHours > 0 ? data.sleepHours : null
            )}
            unit=""
            icon="weather-night"
            accent={theme.colors.sleep}
          />
          <VitalSignCard
            label="Resp. rate"
            value={fmt(data?.respiratoryRate, 1)}
            unit="rpm"
            icon="lungs"
            accent={theme.colors.sky}
          />
          <VitalSignCard
            label="Blood O₂"
            value={fmt(data?.bloodOxygen)}
            unit="%"
            icon="water-outline"
            accent={theme.colors.success}
          />
          <VitalSignCard
            label="Avg HR"
            value={
              data?.heartRate?.length
                ? Math.round(
                    data.heartRate.reduce((a, b) => a + b, 0) / data.heartRate.length
                  ).toString()
                : "—"
            }
            unit="bpm"
            icon="heart-outline"
            accent={theme.colors.coral}
          />
        </View>
      </Animated.View>
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
    paddingHorizontal: theme.spacing.xl,
    paddingTop: theme.spacing.lg,
    paddingBottom: theme.spacing.md,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  greeting: {
    ...theme.typography.displayLg,
    color: theme.colors.ink,
    letterSpacing: -1,
  },
  dateText: {
    ...theme.typography.caption,
    color: theme.colors.muted,
    marginTop: 2,
  },
  headerRight: {
    paddingTop: 6,
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing.sm,
  },
  headerIconButton: {
    width: 38,
    height: 38,
    borderRadius: theme.radii.full,
    backgroundColor: theme.colors.card,
    borderWidth: 1,
    borderColor: theme.colors.border,
    alignItems: "center",
    justifyContent: "center",
  },
  devRestartButton: {
    width: 38,
    height: 38,
    borderRadius: theme.radii.full,
    backgroundColor: theme.colors.card,
    borderWidth: 1,
    borderColor: theme.colors.border,
    alignItems: "center",
    justifyContent: "center",
  },
  statusPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: theme.radii.pill,
    backgroundColor: theme.colors.card,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  statusOk: {},
  statusWarn: {
    borderColor: `${theme.colors.warning}55`,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  statusText: {
    ...theme.typography.legal,
    color: theme.colors.body,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: theme.spacing.xl,
    paddingBottom: theme.spacing.xxxl * 2.5 + theme.spacing.xxl,
    paddingTop: theme.spacing.sm,
  },
  connectBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing.sm,
    backgroundColor: theme.colors.card,
    borderRadius: theme.radii.lg,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.md,
    ...theme.shadows.cardSoft,
  },
  connectIcon: {
    width: 40,
    height: 40,
    borderRadius: theme.radii.md,
    backgroundColor: theme.colors.surfaceElevated,
    alignItems: "center",
    justifyContent: "center",
  },
  connectCopy: {
    flex: 1,
  },
  connectTitle: {
    ...theme.typography.labelMd,
    color: theme.colors.ink,
  },
  connectSub: {
    ...theme.typography.legal,
    color: theme.colors.muted,
    marginTop: 2,
    lineHeight: 15,
  },
  bandsCard: {
    flexDirection: "row",
    backgroundColor: theme.colors.card,
    borderRadius: theme.radii.xl,
    borderWidth: 1,
    borderColor: theme.colors.border,
    paddingVertical: theme.spacing.xl,
    paddingHorizontal: theme.spacing.md,
    marginBottom: theme.spacing.lg,
    alignItems: "center",
    justifyContent: "space-around",
    ...theme.shadows.card,
  },
  ringDivider: {
    width: StyleSheet.hairlineWidth,
    height: 78,
    backgroundColor: theme.colors.border,
  },
  sleepGoalCaption: {
    ...theme.typography.legal,
    color: theme.colors.muted,
    marginTop: 4,
    textAlign: "center",
  },
  sleepGoalCaptionHit: {
    color: theme.colors.success,
    fontFamily: "Nunito_600SemiBold",
    fontWeight: "600",
  },
  gaugeTouchable: {
    borderRadius: theme.radii.md,
    paddingVertical: 4,
    paddingHorizontal: 4,
  },
  sectionTitle: {
    ...theme.typography.titleMd,
    color: theme.colors.ink,
    marginBottom: theme.spacing.sm,
    marginTop: theme.spacing.xs,
    letterSpacing: -0.1,
  },
  snapshotRow: {
    flexDirection: "row",
    gap: theme.spacing.sm,
    marginBottom: theme.spacing.lg,
  },
  snapshotCard: {
    flex: 1,
    backgroundColor: theme.colors.card,
    borderRadius: theme.radii.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
    paddingVertical: theme.spacing.md,
    paddingHorizontal: theme.spacing.sm,
    ...theme.shadows.cardSoft,
  },
  snapshotLabel: {
    ...theme.typography.legal,
    color: theme.colors.muted,
    marginBottom: 4,
    textTransform: "uppercase",
  },
  snapshotIcon: {
    width: 28,
    height: 28,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: theme.spacing.sm,
  },
  snapshotValue: {
    ...theme.typography.titleLg,
    fontSize: 22,
    color: theme.colors.ink,
  },
  snapshotUnit: {
    ...theme.typography.legal,
    color: theme.colors.muted,
    marginTop: 1,
  },
  vitalGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: theme.spacing.sm,
  },
  vitalCard: {
    width: "48%",
    flexGrow: 1,
    backgroundColor: theme.colors.card,
    borderRadius: theme.radii.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: theme.spacing.md,
    overflow: "hidden",
    ...theme.shadows.cardSoft,
  },
  vitalAccent: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: 3,
  },
  vitalCardEmpty: {
    opacity: 0.85,
  },
  vitalTop: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: theme.spacing.xs,
  },
  vitalLabel: {
    ...theme.typography.legal,
    color: theme.colors.muted,
    textTransform: "uppercase",
  },
  vitalIconWrap: {
    width: 26,
    height: 26,
    borderRadius: 8,
    backgroundColor: theme.colors.surfaceElevated,
    alignItems: "center",
    justifyContent: "center",
  },
  vitalIconWrapEmpty: {
    backgroundColor: theme.colors.surfaceElevated,
  },
  vitalValueRow: {
    flexDirection: "row",
    alignItems: "baseline",
    gap: 4,
  },
  vitalValue: {
    ...theme.typography.metricValue,
    fontSize: 30,
    color: theme.colors.ink,
  },
  vitalValueEmpty: {
    color: theme.colors.muted,
  },
  vitalUnit: {
    ...theme.typography.caption,
    color: theme.colors.muted,
  },

});

// Myrri Health
// Copyright (C) 2026 Pranesh Shivaraj
//
// This program is free software: you can redistribute it and/or modify
// it under the terms of the GNU General Public License as published by
// the Free Software Foundation, either version 3 of the License, or
// (at your option) any later version.

import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Platform,
  ScrollView,
} from "react-native";
import { useRouter } from "expo-router";
import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import { theme } from "../../src/theme";
import { GradientWash } from "../../src/components/GradientWash";
import { HealthService } from "../../src/services/health";

type Device =
  | "apple"
  | "samsung"
  | "googlefit"
  | "garmin"
  | "fitbit"
  | "xiaomi"
  | "huawei"
  | "oura"
  | "whoop"
  | "amazfit"
  | "other";

// Soft tinted icon chips, cycled per row — echoes the vitals grid on Home.
const DEVICE_ACCENTS = [
  theme.colors.info,
  theme.colors.success,
  theme.colors.danger,
  theme.colors.warning,
  theme.colors.lilac,
  theme.colors.sky,
  theme.colors.coral,
  theme.colors.sleep,
  theme.colors.energy,
];

const devices: {
  id: Device;
  label: string;
  icon: string;
  description: string;
  platforms: ("android" | "ios")[];
}[] = [
  {
    id: "apple",
    label: "Apple Watch",
    icon: "watch",
    description: "Syncs directly with Apple Health",
    platforms: ["ios"],
  },
  {
    id: "samsung",
    label: "Samsung Galaxy Watch",
    icon: "watch",
    description: "Syncs via Samsung Health",
    platforms: ["android"],
  },
  {
    id: "googlefit",
    label: "Pixel Watch",
    icon: "watch-variant",
    description: "Syncs via Google Fit",
    platforms: ["android"],
  },
  {
    id: "garmin",
    label: "Garmin",
    icon: "watch-variant",
    description: "Syncs via Health Connect / Apple Health",
    platforms: ["android", "ios"],
  },
  {
    id: "fitbit",
    label: "Fitbit",
    icon: "watch-variant",
    description: "Syncs via Health Connect / Apple Health",
    platforms: ["android", "ios"],
  },
  {
    id: "xiaomi",
    label: "Xiaomi (Mi Band)",
    icon: "watch",
    description: "Syncs via Mi Fitness",
    platforms: ["android", "ios"],
  },
  {
    id: "amazfit",
    label: "Amazfit",
    icon: "watch",
    description: "Syncs via the Zepp app",
    platforms: ["android", "ios"],
  },
  {
    id: "huawei",
    label: "Huawei",
    icon: "watch",
    description: "Syncs via HUAWEI Health",
    platforms: ["android", "ios"],
  },
  {
    id: "other",
    label: "No Device",
    icon: "cellphone",
    description: "Track manually",
    platforms: ["android", "ios"],
  },
];

export default function DeviceScreen() {
  const router = useRouter();
  const currentPlatform = Platform.OS === "ios" ? "ios" : "android";
  const visibleDevices = devices.filter((device) =>
    device.platforms.includes(currentPlatform)
  );

  const handleSelect = async (device: Device) => {
    if (device === "apple") {
      router.push("/onboarding/apple");
    } else if (device === "other") {
      await HealthService.markSetupLater();
      router.push("/onboarding/profile");
    } else {
      router.push({
        pathname: "/onboarding/wearables",
        params: { brand: device },
      });
    }
  };

  return (
    <View style={styles.container}>
      <GradientWash color={theme.colors.info} />
      <View style={styles.header}>
        <Text style={styles.step}>1 of 3</Text>
        <Text style={styles.title}>What do you wear?</Text>
        <Text style={styles.subtitle}>
          Connect a device for automatic data, or continue without one — you
          can change this later.
        </Text>
      </View>

      <ScrollView
        contentContainerStyle={styles.options}
        showsVerticalScrollIndicator={false}
      >
        {visibleDevices.map((device, i) => {
          const accent = DEVICE_ACCENTS[i % DEVICE_ACCENTS.length];
          return (
          <TouchableOpacity
            key={device.id}
            style={styles.option}
            onPress={() => handleSelect(device.id)}
            activeOpacity={0.75}
          >
            <View style={[styles.optionIcon, { backgroundColor: `${accent}14` }]}>
              <MaterialCommunityIcons
                name={device.icon as any}
                size={26}
                color={accent}
              />
            </View>
            <View style={styles.optionInfo}>
              <Text style={styles.optionLabel}>{device.label}</Text>
              <Text style={styles.optionDesc}>{device.description}</Text>
            </View>
            <MaterialCommunityIcons
              name="chevron-right"
              size={22}
              color={theme.colors.muted}
            />
          </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.canvas,
    paddingHorizontal: theme.spacing.xl,
  },
  header: {
    marginTop: 100,
    marginBottom: theme.spacing.xxl,
  },
  step: {
    ...theme.typography.caption,
    color: theme.colors.ink,
    marginBottom: theme.spacing.md,
    textTransform: "uppercase",
  },
  title: {
    ...theme.typography.displayMd,
    color: theme.colors.ink,
    marginBottom: theme.spacing.sm,
  },
  subtitle: {
    ...theme.typography.bodyMd,
    color: theme.colors.body,
    lineHeight: 22,
  },
  options: {
    gap: theme.spacing.md,
    paddingBottom: theme.spacing.xxl * 2,
  },
  option: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: theme.colors.canvas,
    borderRadius: theme.radii.md,
    borderWidth: 1,
    borderColor: theme.colors.hairline,
    padding: theme.spacing.lg,
    gap: theme.spacing.md,
  },
  optionIcon: {
    width: 48,
    height: 48,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  optionInfo: {
    flex: 1,
  },
  optionLabel: {
    ...theme.typography.labelMd,
    color: theme.colors.ink,
  },
  optionDesc: {
    ...theme.typography.caption,
    color: theme.colors.body,
    marginTop: 2,
  },
});

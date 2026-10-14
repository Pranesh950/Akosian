// Akosian
// Copyright (C) 2026 Pranesh Shivaraj
//
// This program is free software: you can redistribute it and/or modify
// it under the terms of the GNU General Public License as published by
// the Free Software Foundation, either version 3 of the License, or
// (at your option) any later version.

import { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TextInput,
  TouchableOpacity,
  Animated,
  Dimensions,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import { theme } from "../theme";

interface AmountModalProps {
  visible: boolean;
  title: string;
  emoji: string;
  unit: string;
  placeholder?: string;
  initialValue?: number;
  /** Quick-select chips; pass [] to hide them entirely. Defaults to unit-based presets. */
  presets?: number[];
  /** YYYY-MM-DD the entry should be logged to. Defaults to today. */
  initialDate?: string;
  /** Hide the date stepper (for callers that save to their own selected day). */
  hideDate?: boolean;
  onSave: (value: number, date: string) => void;
  onClose: () => void;
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

function formatDateKeyShort(key: string): string {
  const d = new Date(key + "T12:00:00");
  if (Number.isNaN(d.getTime())) return key;
  const today = toDateKey(new Date());
  if (key === today) return "Today";
  const yesterday = shiftDateKey(today, -1);
  if (key === yesterday) return "Yesterday";
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

const { height: SCREEN_HEIGHT } = Dimensions.get("window");

export default function AmountModal({
  visible,
  title,
  emoji,
  unit,
  placeholder,
  initialValue,
  presets,
  initialDate,
  hideDate,
  onSave,
  onClose,
}: AmountModalProps) {
  const [value, setValue] = useState(
    initialValue && initialValue > 0 ? initialValue.toString() : ""
  );
  const [date, setDate] = useState<string>(() => initialDate ?? toDateKey(new Date()));
  const slideAnim = useRef(new Animated.Value(SCREEN_HEIGHT)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const inputRef = useRef<TextInput>(null);

  useEffect(() => {
    if (visible) {
      setValue(
        initialValue && initialValue > 0 ? initialValue.toString() : ""
      );
      setDate(initialDate ?? toDateKey(new Date()));
      Animated.parallel([
        Animated.spring(slideAnim, {
          toValue: 0,
          damping: 28,
          stiffness: 300,
          useNativeDriver: true,
        }),
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();

      // Auto-focus after animation
      const t = setTimeout(() => inputRef.current?.focus(), 300);
      return () => clearTimeout(t);
    } else {
      Animated.parallel([
        Animated.timing(slideAnim, {
          toValue: SCREEN_HEIGHT,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: 150,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [visible, initialDate]);

  const handleSave = () => {
    const num = parseFloat(value);
    if (!isNaN(num) && num >= 0) {
      onSave(num, date);
    }
    onClose();
  };

  const quickPresets =
    presets !== undefined
      ? presets
      : unit === "mg"
        ? [50, 100, 200]
        : unit === "drinks"
          ? [1, 2, 3]
          : unit === "cups"
            ? [1, 2, 4, 8]
            : [1, 3, 5];

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        style={styles.overlay}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 8}
      >
        <Animated.View
          style={[styles.backdrop, { opacity: fadeAnim }]}
        >
          <TouchableOpacity
            style={StyleSheet.absoluteFill}
            activeOpacity={1}
            onPress={onClose}
          />
        </Animated.View>

        <Animated.View
          style={[
            styles.sheet,
            { transform: [{ translateY: slideAnim }] },
          ]}
        >
          {/* Handle bar */}
          <View style={styles.handleBar} />

          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.emoji}>{emoji}</Text>
            <Text style={styles.title}>{title}</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <MaterialCommunityIcons name="close" size={20} color={theme.colors.muted} />
            </TouchableOpacity>
          </View>

          {/* Input area */}
          <View style={styles.inputRow}>
            <TextInput
              ref={inputRef}
              style={styles.input}
              value={value}
              onChangeText={setValue}
              keyboardType="decimal-pad"
              placeholder={placeholder ?? "0"}
              placeholderTextColor={theme.colors.muted}
              selectTextOnFocus
            />
            <Text style={styles.unit}>{unit}</Text>
          </View>
          {!hideDate && (
          <View style={styles.dateTimeRow}>
            <TouchableOpacity
              style={styles.dateStepBtn}
              onPress={() => setDate((d) => shiftDateKey(d, -1))}
              activeOpacity={0.7}
              accessibilityLabel="Log to previous day"
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <MaterialCommunityIcons name="chevron-left" size={20} color={theme.colors.ink} />
            </TouchableOpacity>
            <View style={styles.dateCenter}>
              <Text style={styles.dateTimeLabel}>{formatDateKeyShort(date)}</Text>
              <Text style={styles.dateTimeSub}>{date}</Text>
            </View>
            <TouchableOpacity
              style={[
                styles.dateStepBtn,
                date >= toDateKey(new Date()) && styles.dateStepBtnDisabled,
              ]}
              onPress={() => setDate((d) => shiftDateKey(d, 1))}
              activeOpacity={0.7}
              accessibilityLabel="Log to next day"
              disabled={date >= toDateKey(new Date())}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <MaterialCommunityIcons
                name="chevron-right"
                size={20}
                color={date >= toDateKey(new Date()) ? theme.colors.muted : theme.colors.ink}
              />
            </TouchableOpacity>
            {date !== toDateKey(new Date()) ? (
              <TouchableOpacity
                style={styles.changeDateButton}
                onPress={() => setDate(toDateKey(new Date()))}
              >
                <Text style={styles.changeDateText}>Today</Text>
              </TouchableOpacity>
            ) : null}
          </View>
          )}

          {/* Quick presets */}
          {quickPresets.length > 0 && (
            <View style={styles.presets}>
              {quickPresets.map((p) => (
                <TouchableOpacity
                  key={p}
                  style={[
                    styles.presetChip,
                    parseFloat(value) === p && styles.presetChipActive,
                  ]}
                  onPress={() => setValue(p.toString())}
                  activeOpacity={0.7}
                >
                  <Text
                    style={[
                      styles.presetText,
                      parseFloat(value) === p && styles.presetTextActive,
                    ]}
                  >
                    {p}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          )}

          {/* Save button */}
          <TouchableOpacity
            style={styles.saveButton}
            onPress={handleSave}
            activeOpacity={0.8}
          >
            <MaterialCommunityIcons
              name="check"
              size={18}
              color={theme.colors["on-primary"]}
            />
            <Text style={styles.saveButtonText}>Save</Text>
          </TouchableOpacity>
        </Animated.View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: "flex-end",
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.35)",
  },
  sheet: {
    backgroundColor: theme.colors.card,
    borderTopLeftRadius: theme.radii.lg,
    borderTopRightRadius: theme.radii.lg,
    paddingHorizontal: theme.spacing.xl,
    paddingBottom: 40,
    ...theme.shadows.elevated,
  },
  handleBar: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: theme.colors.border,
    alignSelf: "center",
    marginTop: theme.spacing.md,
    marginBottom: theme.spacing.lg,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing.md,
    marginBottom: theme.spacing.xl,
  },
  emoji: {
    fontSize: 28,
  },
  title: {
    ...theme.typography.titleMd,
    color: theme.colors.ink,
    flex: 1,
  },
  closeButton: {
    width: 32,
    height: 32,
    borderRadius: theme.radii.full,
    backgroundColor: theme.colors.surfaceElevated,
    alignItems: "center",
    justifyContent: "center",
  },
  inputRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: theme.spacing.sm,
    marginBottom: theme.spacing.lg,
  },
  input: {
    ...theme.typography.displayMd,
    color: theme.colors.ink,
    fontFamily: "Nunito_700Bold",
    fontWeight: "700",
    fontSize: 40,
    textAlign: "center",
    minWidth: 100,
    borderBottomWidth: 2,
    borderBottomColor: theme.colors.border,
    paddingBottom: theme.spacing.xs,
  },
  unit: {
    ...theme.typography.titleMd,
    color: theme.colors.muted,
    fontFamily: "Nunito_600SemiBold",
    fontWeight: "600",
  },
  presets: {
    flexDirection: "row",
    justifyContent: "center",
    gap: theme.spacing.md,
    marginBottom: theme.spacing.xxl,
  },
  presetChip: {
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.sm,
    borderRadius: theme.radii.pill,
    backgroundColor: theme.colors.surfaceElevated,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  presetChipActive: {
    backgroundColor: theme.colors.ink,
    borderColor: theme.colors.ink,
  },
  presetText: {
    ...theme.typography.bodyMd,
    color: theme.colors.muted,
    fontFamily: "Nunito_600SemiBold",
    fontWeight: "600",
  },
  presetTextActive: {
    color: theme.colors.card,
  },
  saveButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: theme.spacing.sm,
    backgroundColor: theme.colors.ink,
    borderRadius: theme.radii.md,
    paddingVertical: theme.spacing.md,
    ...theme.shadows.card,
  },
  saveButtonText: {
    ...theme.typography.labelMd,
    color: theme.colors.card,
  },
  dateTimeRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: theme.spacing.sm,
    marginBottom: theme.spacing.lg,
  },
  dateStepBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: theme.colors.surfaceElevated,
    borderWidth: 1,
    borderColor: theme.colors.border,
    alignItems: "center",
    justifyContent: "center",
  },
  dateStepBtnDisabled: {
    opacity: 0.4,
  },
  dateCenter: {
    alignItems: "center",
    minWidth: 120,
  },
  dateTimeLabel: {
    ...theme.typography.labelMd,
    color: theme.colors.ink,
    fontFamily: "Nunito_600SemiBold",
    fontWeight: "600",
  },
  dateTimeSub: {
    ...theme.typography.legal,
    color: theme.colors.muted,
    marginTop: 1,
  },
  changeDateButton: {
    paddingVertical: theme.spacing.xs,
    paddingHorizontal: theme.spacing.sm,
    borderRadius: theme.radii.pill,
    backgroundColor: theme.colors.surfaceElevated,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  changeDateText: {
    ...theme.typography.caption,
    color: theme.colors.primary,
  },
});

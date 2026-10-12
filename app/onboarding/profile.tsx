// Myrri Health
// Copyright (C) 2026 Pranesh Shivaraj
//
// This program is free software: you can redistribute it and/or modify
// it under the terms of the GNU General Public License as published by
// the Free Software Foundation, either version 3 of the License, or
// (at your option) any later version.

import { useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import { theme } from "../../src/theme";
import { GradientWash } from "../../src/components/GradientWash";
import { useGoBack } from "../../src/hooks/useGoBack";
import {
  BiologicalSex,
  HEIGHT_CM_MAX,
  HEIGHT_CM_MIN,
  WEIGHT_KG_MAX,
  WEIGHT_KG_MIN,
  getHealthProfile,
  sanitizeHeightCm,
  sanitizeWeightKg,
  saveHealthProfile,
} from "../../src/services/profile";
import { KG_PER_LB } from "../../src/services/units";

const sexOptions: { value: BiologicalSex; label: string; description: string }[] = [
  { value: "female", label: "Female", description: "Use female reference ranges" },
  { value: "male", label: "Male", description: "Use male reference ranges" },
  { value: "unspecified", label: "Prefer not to say", description: "Use sex-neutral ranges" },
];

type HeightUnit = "cm" | "ft";
type WeightUnit = "kg" | "lb";

const CM_PER_IN = 2.54;

function cmToFtIn(cm: number): { ft: string; inch: string } {
  const totalIn = cm / CM_PER_IN;
  let ft = Math.floor(totalIn / 12);
  let inch = Math.round(totalIn - ft * 12);
  if (inch === 12) {
    ft += 1;
    inch = 0;
  }
  return { ft: String(ft), inch: String(inch) };
}

function UnitSwitch<T extends string>({
  options,
  value,
  onChange,
}: {
  options: T[];
  value: T;
  onChange: (value: T) => void;
}) {
  return (
    <View style={styles.unitSwitch}>
      {options.map((option) => {
        const active = option === value;
        return (
          <TouchableOpacity
            key={option}
            style={[styles.unitOption, active && styles.unitOptionActive]}
            onPress={() => onChange(option)}
            activeOpacity={0.8}
          >
            <Text style={[styles.unitOptionText, active && styles.unitOptionTextActive]}>
              {option}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

export default function ProfileScreen() {
  const router = useRouter();
  const handleBack = useGoBack();
  const params = useLocalSearchParams<{ from?: string }>();
  const [ageText, setAgeText] = useState("");
  const [biologicalSex, setBiologicalSex] = useState<BiologicalSex>("unspecified");
  const [heightUnit, setHeightUnit] = useState<HeightUnit>("cm");
  const [heightCmText, setHeightCmText] = useState("");
  const [heightFtText, setHeightFtText] = useState("");
  const [heightInText, setHeightInText] = useState("");
  const [weightUnit, setWeightUnitState] = useState<WeightUnit>("kg");
  const [weightText, setWeightText] = useState("");

  // Prefill when re-entering to edit (Settings / Biology entry points).
  useEffect(() => {
    let cancelled = false;
    getHealthProfile()
      .then((profile) => {
        if (cancelled || !profile) return;
        setAgeText(String(profile.chronologicalAge));
        setBiologicalSex(profile.biologicalSex);
        if (profile.heightCm != null) {
          setHeightCmText(String(profile.heightCm));
          const { ft, inch } = cmToFtIn(profile.heightCm);
          setHeightFtText(ft);
          setHeightInText(inch);
        }
        if (profile.weightKg != null) {
          setWeightText(String(profile.weightKg));
        }
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  const age = Number.parseInt(ageText, 10);
  const ageIsValid = Number.isFinite(age) && age >= 18 && age <= 100;
  const ageMessage = useMemo(() => {
    if (!ageText) return "Used to compare your metrics with age-matched reference ranges.";
    if (!ageIsValid) return "Enter an age between 18 and 100.";
    return "Your age is stored only on this device.";
  }, [ageText, ageIsValid]);

  // Height in cm. null = left blank (optional), undefined = invalid entry.
  const heightCm = useMemo((): number | null | undefined => {
    if (heightUnit === "cm") {
      if (!heightCmText.trim()) return null;
      return sanitizeHeightCm(Number.parseFloat(heightCmText)) ?? undefined;
    }
    if (!heightFtText.trim() && !heightInText.trim()) return null;
    const ft = Number.parseFloat(heightFtText || "0");
    const inch = Number.parseFloat(heightInText || "0");
    if (!Number.isFinite(ft) || !Number.isFinite(inch) || ft < 0 || inch < 0 || inch >= 12) {
      return undefined;
    }
    return sanitizeHeightCm((ft * 12 + inch) * CM_PER_IN) ?? undefined;
  }, [heightUnit, heightCmText, heightFtText, heightInText]);

  const heightIsValid = heightCm !== undefined;

  // Weight in kg. null = left blank (optional), undefined = invalid entry.
  const weightKg = useMemo((): number | null | undefined => {
    if (!weightText.trim()) return null;
    const raw = Number.parseFloat(weightText);
    if (!Number.isFinite(raw)) return undefined;
    const kg = weightUnit === "lb" ? raw * KG_PER_LB : raw;
    return sanitizeWeightKg(kg) ?? undefined;
  }, [weightText, weightUnit]);

  const weightIsValid = weightKg !== undefined;

  const canContinue = ageIsValid && heightIsValid && weightIsValid;

  const handleHeightUnitChange = (unit: HeightUnit) => {
    if (unit === heightUnit) return;
    // Carry the entered value across units so nothing is lost on toggle.
    if (unit === "ft" && heightCm != null) {
      const { ft, inch } = cmToFtIn(heightCm);
      setHeightFtText(ft);
      setHeightInText(inch);
    } else if (unit === "cm" && heightCm != null) {
      setHeightCmText(String(Math.round(heightCm * 10) / 10));
    }
    setHeightUnit(unit);
  };

  const handleWeightUnitChange = (unit: WeightUnit) => {
    if (unit === weightUnit) return;
    const raw = Number.parseFloat(weightText);
    if (Number.isFinite(raw) && weightText.trim()) {
      const converted = unit === "lb" ? raw / KG_PER_LB : raw * KG_PER_LB;
      setWeightText(String(Math.round(converted * 10) / 10));
    }
    setWeightUnitState(unit);
  };

  const handleContinue = async () => {
    if (!canContinue) return;
    await saveHealthProfile({
      chronologicalAge: age,
      biologicalSex,
      heightCm: heightCm ?? null,
      weightKg: weightKg ?? null,
    });
    if (params.from === "biology" || params.from === "settings") {
      handleBack();
    } else {
      // Tell ai-choice it is part of onboarding so Continue advances to the
      // goals step. Without this param it treats the flow as a chat/settings
      // entry and calls router.back(). Push so the back button returns here.
      router.push("/onboarding/ai-choice?from=onboarding");
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <GradientWash color={theme.colors.info} />
      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <TouchableOpacity onPress={handleBack} style={styles.backBtn} activeOpacity={0.7}>
          <MaterialCommunityIcons name="arrow-left" size={22} color={theme.colors.ink} />
        </TouchableOpacity>

        <View style={styles.header}>
          <View style={styles.eyebrowRow}>
            <View style={styles.eyebrowDot} />
            <Text style={styles.eyebrow}>PERSONALIZE</Text>
          </View>
          <Text style={styles.title}>A little about you</Text>
          <Text style={styles.subtitle}>
            Personalizes your calorie targets and sharpens your biological-age
            estimate — a wellness index, not a medical diagnosis.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.label}>Chronological age</Text>
          <View style={[styles.ageInputWrap, ageText.length > 0 && !ageIsValid && styles.inputInvalid]}>
            <TextInput
              value={ageText}
              onChangeText={(text) => setAgeText(text.replace(/[^0-9]/g, "").slice(0, 3))}
              keyboardType="number-pad"
              placeholder="Your age"
              placeholderTextColor={theme.colors.muted}
              style={styles.ageInput}
              maxLength={3}
              returnKeyType="done"
            />
            <Text style={styles.ageUnit}>years</Text>
          </View>
          <Text style={[styles.helper, ageText.length > 0 && !ageIsValid && styles.helperInvalid]}>
            {ageMessage}
          </Text>
        </View>

        <View style={styles.section}>
          <View style={styles.labelRow}>
            <Text style={styles.label}>Height</Text>
            <UnitSwitch options={["cm", "ft"]} value={heightUnit} onChange={handleHeightUnitChange} />
          </View>
          <Text style={styles.sectionHint}>Optional · personalizes calorie targets and BMI.</Text>
          {heightUnit === "cm" ? (
            <View style={[styles.ageInputWrap, !heightIsValid && styles.inputInvalid]}>
              <TextInput
                value={heightCmText}
                onChangeText={(text) =>
                  setHeightCmText(text.replace(/[^0-9.]/g, "").slice(0, 5))
                }
                keyboardType="decimal-pad"
                placeholder="Your height"
                placeholderTextColor={theme.colors.muted}
                style={styles.ageInput}
                returnKeyType="done"
              />
              <Text style={styles.ageUnit}>cm</Text>
            </View>
          ) : (
            <View style={styles.splitRow}>
              <View style={[styles.ageInputWrap, styles.splitInput, !heightIsValid && styles.inputInvalid]}>
                <TextInput
                  value={heightFtText}
                  onChangeText={(text) =>
                    setHeightFtText(text.replace(/[^0-9]/g, "").slice(0, 1))
                  }
                  keyboardType="number-pad"
                  placeholder="5"
                  placeholderTextColor={theme.colors.muted}
                  style={styles.ageInput}
                  returnKeyType="done"
                />
                <Text style={styles.ageUnit}>ft</Text>
              </View>
              <View style={[styles.ageInputWrap, styles.splitInput, !heightIsValid && styles.inputInvalid]}>
                <TextInput
                  value={heightInText}
                  onChangeText={(text) =>
                    setHeightInText(text.replace(/[^0-9]/g, "").slice(0, 2))
                  }
                  keyboardType="number-pad"
                  placeholder="9"
                  placeholderTextColor={theme.colors.muted}
                  style={styles.ageInput}
                  returnKeyType="done"
                />
                <Text style={styles.ageUnit}>in</Text>
              </View>
            </View>
          )}
          {!heightIsValid && (
            <Text style={[styles.helper, styles.helperInvalid]}>
              Enter a height between {HEIGHT_CM_MIN} and {HEIGHT_CM_MAX} cm.
            </Text>
          )}
        </View>

        <View style={styles.section}>
          <View style={styles.labelRow}>
            <Text style={styles.label}>Weight</Text>
            <UnitSwitch options={["kg", "lb"]} value={weightUnit} onChange={handleWeightUnitChange} />
          </View>
          <Text style={styles.sectionHint}>Optional · calorie and protein targets. Your tracker can update it.</Text>
          <View style={[styles.ageInputWrap, !weightIsValid && styles.inputInvalid]}>
            <TextInput
              value={weightText}
              onChangeText={(text) =>
                setWeightText(text.replace(/[^0-9.]/g, "").slice(0, 5))
              }
              keyboardType="decimal-pad"
              placeholder="Your weight"
              placeholderTextColor={theme.colors.muted}
              style={styles.ageInput}
              returnKeyType="done"
            />
            <Text style={styles.ageUnit}>{weightUnit === "kg" ? "kg" : "lbs"}</Text>
          </View>
          {!weightIsValid && (
            <Text style={[styles.helper, styles.helperInvalid]}>
              Enter a weight between {WEIGHT_KG_MIN} and {WEIGHT_KG_MAX} kg.
            </Text>
          )}
        </View>

        <View style={styles.section}>
          <Text style={styles.label}>Biological sex</Text>
          <Text style={styles.sectionHint}>Optional · helps us choose more appropriate reference ranges.</Text>
          <View style={styles.options}>
            {sexOptions.map((option) => {
              const selected = biologicalSex === option.value;
              return (
                <TouchableOpacity
                  key={option.value}
                  style={[styles.option, selected && styles.optionSelected]}
                  onPress={() => setBiologicalSex(option.value)}
                  activeOpacity={0.8}
                >
                  <View style={[styles.optionIcon, selected && styles.optionIconSelected]}>
                    <MaterialCommunityIcons
                      name={selected ? "check" : "circle-outline"}
                      size={18}
                      color={selected ? theme.colors["on-primary"] : theme.colors.muted}
                    />
                  </View>
                  <View style={styles.optionCopy}>
                    <Text style={styles.optionLabel}>{option.label}</Text>
                    <Text style={styles.optionDescription}>{option.description}</Text>
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        <View style={styles.note}>
          <MaterialCommunityIcons name="lock-outline" size={17} color={theme.colors.primary} />
          <Text style={styles.noteText}>
            Your profile stays on this device and can be changed later.
          </Text>
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <TouchableOpacity
          style={[styles.button, !canContinue && styles.buttonDisabled]}
          onPress={handleContinue}
          disabled={!canContinue}
          activeOpacity={0.85}
        >
          <Text style={styles.buttonText}>Continue</Text>
          <MaterialCommunityIcons name="arrow-right" size={19} color={theme.colors["on-primary"]} />
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.bg,
  },
  content: {
    paddingHorizontal: theme.spacing.xl,
    paddingTop: 84,
    paddingBottom: theme.spacing.xxl,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: theme.colors.card,
    borderWidth: 1,
    borderColor: theme.colors.border,
    marginBottom: theme.spacing.lg,
  },
  header: {
    marginBottom: theme.spacing.xxl,
  },
  eyebrowRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing.xs,
    marginBottom: theme.spacing.md,
  },
  eyebrowDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: theme.colors.primary,
  },
  eyebrow: {
    ...theme.typography.caption,
    color: theme.colors.primary,
    letterSpacing: 1.3,
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
  section: {
    marginBottom: theme.spacing.xxl,
  },
  label: {
    ...theme.typography.titleSm,
    color: theme.colors.ink,
    marginBottom: theme.spacing.xs,
  },
  labelRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: theme.spacing.xs,
  },
  unitSwitch: {
    flexDirection: "row",
    backgroundColor: theme.colors.surfaceElevated,
    borderRadius: theme.radii.pill,
    padding: 3,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  unitOption: {
    paddingHorizontal: theme.spacing.md,
    paddingVertical: 5,
    borderRadius: theme.radii.pill,
  },
  unitOptionActive: {
    backgroundColor: theme.colors.card,
    ...theme.shadows.cardSoft,
  },
  unitOptionText: {
    ...theme.typography.caption,
    color: theme.colors.muted,
  },
  unitOptionTextActive: {
    color: theme.colors.ink,
    fontFamily: "Nunito_700Bold",
    fontWeight: "700",
  },
  splitRow: {
    flexDirection: "row",
    gap: theme.spacing.sm,
  },
  splitInput: {
    flex: 1,
  },
  sectionHint: {
    ...theme.typography.caption,
    color: theme.colors.muted,
    marginBottom: theme.spacing.md,
  },
  ageInputWrap: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: theme.colors.card,
    borderRadius: theme.radii.lg,
    borderWidth: 1,
    borderColor: theme.colors.border,
    paddingHorizontal: theme.spacing.lg,
    ...theme.shadows.cardSoft,
  },
  inputInvalid: {
    borderColor: theme.colors.danger,
  },
  ageInput: {
    flex: 1,
    ...theme.typography.displayMd,
    color: theme.colors.ink,
    paddingVertical: theme.spacing.md,
  },
  ageUnit: {
    ...theme.typography.bodyMd,
    color: theme.colors.muted,
  },
  helper: {
    ...theme.typography.legal,
    color: theme.colors.muted,
    marginTop: theme.spacing.xs,
  },
  helperInvalid: {
    color: theme.colors.danger,
  },
  options: {
    gap: theme.spacing.sm,
  },
  option: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing.md,
    padding: theme.spacing.md,
    borderRadius: theme.radii.md,
    backgroundColor: theme.colors.card,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  optionSelected: {
    borderColor: theme.colors.primary,
    backgroundColor: `${theme.colors.primary}08`,
  },
  optionIcon: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: theme.colors.surfaceElevated,
  },
  optionIconSelected: {
    backgroundColor: theme.colors.primary,
  },
  optionCopy: {
    flex: 1,
  },
  optionLabel: {
    ...theme.typography.labelMd,
    color: theme.colors.ink,
  },
  optionDescription: {
    ...theme.typography.legal,
    color: theme.colors.muted,
    marginTop: 2,
  },
  note: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing.sm,
    padding: theme.spacing.md,
    borderRadius: theme.radii.md,
    backgroundColor: theme.colors.surfaceElevated,
  },
  noteText: {
    flex: 1,
    ...theme.typography.legal,
    color: theme.colors.body,
    lineHeight: 16,
  },
  footer: {
    paddingHorizontal: theme.spacing.xl,
    paddingBottom: 36,
    paddingTop: theme.spacing.sm,
    backgroundColor: theme.colors.bg,
  },
  button: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: theme.spacing.sm,
    backgroundColor: theme.colors.primary,
    borderRadius: theme.radii.lg,
    paddingVertical: theme.spacing.md,
    ...theme.shadows.elevated,
  },
  buttonDisabled: {
    opacity: 0.45,
    shadowOpacity: 0,
    elevation: 0,
  },
  buttonText: {
    ...theme.typography.labelMd,
    color: theme.colors["on-primary"],
  },
});

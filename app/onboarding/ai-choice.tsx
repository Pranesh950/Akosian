// Akosian
// Copyright (C) 2026 Pranesh Shivaraj
//
// This program is free software: you can redistribute it and/or modify
// it under the terms of the GNU General Public License as published by
// the Free Software Foundation, either version 3 of the License, or
// (at your option) any later version.

import { useState } from "react";
import {
  ActivityIndicator,
  ScrollView,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
} from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import { theme } from "../../src/theme";
import { GradientWash } from "../../src/components/GradientWash";
import { useGoBack } from "../../src/hooks/useGoBack";
import { setLLMChoice, type LLMChoice } from "../../src/services/localLLM";
import {
  checkLocalAIReadiness,
  type LocalAIReadiness,
} from "../../src/services/deviceCheck";
import { setSelectedModelId } from "../../src/services/providers/llamaProvider";

const choices: {
  id: LLMChoice;
  title: string;
  eyebrow: string;
  description: string;
  icon: keyof typeof MaterialCommunityIcons.glyphMap;
  badge: "recommended" | "warn" | "neutral";
  badgeLabel: string;
}[] = [
  {
    id: "byok",
    title: "Your own key",
    eyebrow: "OPENAI · ANTHROPIC · GEMINI · OPENROUTER",
    badge: "recommended",
    badgeLabel: "RECOMMENDED",
    description: "OpenAI, Anthropic, Gemini, or OpenRouter. You pick the model and pay the provider directly; your key stays in this device's secure storage. Tip: OpenRouter offers free models.",
    icon: "key-outline",
  },
  {
    id: "local",
    title: "Local",
    eyebrow: "ON-DEVICE",
    badge: "warn",
    badgeLabel: "NOT RECOMMENDED",
    description: "A small model runs on your phone, so prompts never leave the device. Less capable, slower, and needs a recent high-end phone with plenty of free storage.",
    icon: "cellphone-lock",
  },
  {
    id: "none",
    title: "No AI",
    eyebrow: "OFFLINE · PRIVACY MAX",
    badge: "neutral",
    badgeLabel: "PRIVATE",
    description: "Skip the assistant. Every health, journal, and food feature — including barcode scanning — still works on-device. Turn AI on anytime later.",
    icon: "robot-off-outline",
  },
];

export default function AIChoiceScreen() {
  const router = useRouter();
  const handleBack = useGoBack();
  const params = useLocalSearchParams<{ from?: string }>();
  const fromOnboarding = params.from === "onboarding";
  const [choice, setChoice] = useState<LLMChoice>("byok");
  const [saving, setSaving] = useState(false);
  // Local-AI device check: runs before the user can commit to "local".
  const [checking, setChecking] = useState(false);
  const [readiness, setReadiness] = useState<LocalAIReadiness | null>(null);

  const selectChoice = (id: LLMChoice) => {
    setChoice(id);
    // A stale verdict must never follow the user to a different option.
    if (id !== "local") setReadiness(null);
  };

  const finishLocal = async () => {
    await setLLMChoice("local");
    // Adopt the model this device was recommended now that the user has seen the
    // name and download size on the verdict card. Without this the app would
    // keep whatever the default rung is and ignore the device check entirely.
    const pick = readiness?.recommended.modelId;
    if (pick) await setSelectedModelId(pick);
    if (fromOnboarding) {
      router.push("/onboarding/goals");
    } else {
      // Reached from a chat screen ("Enable AI"): return to the chat.
      handleBack();
    }
  };

  const handleContinue = async () => {
    if (saving || checking) return;
    try {
      if (choice === "byok") {
        // The BYOK screen saves the key, sets the choice, and continues.
        setSaving(true);
        const url = `/onboarding/byok?from=${fromOnboarding ? "onboarding" : "chat"}`;
        if (fromOnboarding) {
          router.push(url);
        } else {
          router.replace(url);
        }
        return;
      }
      if (choice === "local") {
        // First tap measures the device; second tap (verdict shown) proceeds.
        if (!readiness) {
          setChecking(true);
          try {
            setReadiness(await checkLocalAIReadiness());
          } finally {
            setChecking(false);
          }
          return;
        }
        setSaving(true);
        await finishLocal();
        return;
      }
      setSaving(true);
      await setLLMChoice(choice);
      if (fromOnboarding) {
        router.push("/onboarding/goals");
      } else {
        // Reached from a chat screen ("Enable AI"): return to the chat.
        handleBack();
      }
    } finally {
      setSaving(false);
    }
  };

  const continueLabel = saving
    ? "Saving..."
    : checking
      ? "Checking your device…"
      : choice === "local" && !readiness
        ? "Check my device"
        : choice === "local" && readiness?.verdict === "poor"
          ? "Proceed anyway"
          : choice === "local"
            ? "Proceed with local AI"
            : "Continue";

  return (
    <View style={styles.container}>
      <GradientWash color={theme.colors.info} />
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <TouchableOpacity onPress={handleBack} style={styles.backBtn} activeOpacity={0.7}>
          <MaterialCommunityIcons name="arrow-left" size={22} color={theme.colors.ink} />
        </TouchableOpacity>

        <View style={styles.header}>
          <View style={styles.eyebrowRow}>
            <View style={styles.eyebrowDot} />
            <Text style={styles.eyebrow}>YOUR AI</Text>
          </View>
          <Text style={styles.title}>Choose how your assistant runs</Text>
          <Text style={styles.subtitle}>
            Bring your own key, run a model on-device, or skip it. Saved on
            this device — change anytime.
          </Text>
        </View>

        <View style={styles.choiceList}>
          {choices.map((item) => {
            const selected = choice === item.id;
            return (
              <TouchableOpacity
                key={item.id}
                style={[styles.choiceCard, selected && styles.choiceCardSelected]}
                onPress={() => selectChoice(item.id)}
                activeOpacity={0.85}
              >
                <View style={styles.choiceTop}>
                  <View style={[styles.choiceIcon, selected && styles.choiceIconSelected]}>
                    <MaterialCommunityIcons
                      name={item.icon}
                      size={24}
                      color={selected ? theme.colors["on-primary"] : theme.colors.ink}
                    />
                  </View>
                  <View style={styles.choiceHeading}>
                    <View style={styles.choiceTitleRow}>
                      <Text style={styles.choiceTitle}>{item.title}</Text>
                      {item.badge === "recommended" ? (
                        <View style={styles.recommendedBadge}>
                          <Text style={styles.recommendedText}>{item.badgeLabel}</Text>
                        </View>
                      ) : item.badge === "warn" ? (
                        <View style={styles.notRecommendedBadge}>
                          <Text style={styles.notRecommendedText}>{item.badgeLabel}</Text>
                        </View>
                      ) : (
                        <View style={styles.byokBadge}>
                          <Text style={styles.byokText}>{item.badgeLabel}</Text>
                        </View>
                      )}
                    </View>
                    <Text style={styles.choiceEyebrow}>{item.eyebrow}</Text>
                  </View>
                  <View style={[styles.radio, selected && styles.radioSelected]}>
                    {selected && <View style={styles.radioDot} />}
                  </View>
                </View>
                <Text style={styles.choiceDescription}>{item.description}</Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {choice === "byok" ? (
          <View style={styles.infoCard}>
            <View style={[styles.infoIcon, { backgroundColor: `${theme.colors.info}14` }]}>
              <MaterialCommunityIcons name="key-outline" size={20} color={theme.colors.info} />
            </View>
            <View style={styles.infoCopy}>
              <Text style={styles.infoTitle}>How your key is handled</Text>
              <Text style={styles.infoText}>
                Stored encrypted on this device and sent straight from your
                phone to the provider you pick — never through us. Billed at
                the provider's rates; remove the key anytime.
              </Text>
            </View>
          </View>
        ) : choice === "none" ? (
          <View style={styles.infoCard}>
            <View style={[styles.infoIcon, { backgroundColor: `${theme.colors.success}14` }]}>
              <MaterialCommunityIcons name="shield-check-outline" size={20} color={theme.colors.success} />
            </View>
            <View style={styles.infoCopy}>
              <Text style={styles.infoTitle}>What still works without AI</Text>
              <Text style={styles.infoText}>
                Readiness, strain, biological age, the morning brief,
                journaling, and the offline food database with barcode
                scanning all run on your phone. Turn AI on anytime from the
                chat screens.
              </Text>
            </View>
          </View>
        ) : (
          <View style={styles.infoCard}>
            <View style={[styles.infoIcon, { backgroundColor: `${theme.colors.success}14` }]}>
              <MaterialCommunityIcons name="shield-lock-outline" size={20} color={theme.colors.success} />
            </View>
            <View style={styles.infoCopy}>
              <Text style={styles.infoTitle}>Before choosing local</Text>
              <Text style={styles.infoText}>
                Prompts never reach a cloud service, but expect fewer features,
                slower replies, and a large download. “Check my device” reads
                this phone's memory and free storage to pick the largest model
                that fits — then measures real speed on the device once that
                model has downloaded.
              </Text>
            </View>
          </View>
        )}

        {choice === "local" && readiness ? (
          <DeviceVerdictCard
            readiness={readiness}
            onDismiss={() => setReadiness(null)}
          />
        ) : null}

        <View style={styles.infoCard}>
          <View style={[styles.infoIcon, { backgroundColor: `${theme.colors.primary}0F` }]}>
            <MaterialCommunityIcons name="hand-coin-outline" size={20} color={theme.colors.ink} />
          </View>
          <View style={styles.infoCopy}>
            <Text style={styles.infoTitle}>We don't earn money from any of them</Text>
            <Text style={styles.infoText}>
              All three options are free to set up, and we make nothing from
              your choice — no commission, referral fee, or provider payment.
              Any API usage you pay for goes straight to that provider, not us.
            </Text>
          </View>
        </View>

        <View style={styles.privacyCard}>
          <MaterialCommunityIcons name="fingerprint" size={19} color={theme.colors.primary} />
          <View style={styles.privacyCopy}>
            <Text style={styles.privacyTitle}>We scrub before cloud requests</Text>
            <Text style={styles.privacyText}>
              Before cloud requests we scrub common identifiers — emails,
              phone numbers, links, network addresses, government-ID patterns,
              and name or address phrases. Best-effort, not a guarantee: cloud
              AI still means text leaves your phone, so keep anything you need
              offline out of chat. BYOK keys stay on this device and go only to
              your provider.
            </Text>
          </View>
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <TouchableOpacity
          style={[styles.button, (saving || checking) && styles.buttonBusy]}
          onPress={handleContinue}
          disabled={saving || checking}
          activeOpacity={0.85}
        >
          {checking ? (
            <ActivityIndicator size="small" color={theme.colors["on-primary"]} />
          ) : (
            <Text style={styles.buttonText}>{continueLabel}</Text>
          )}
          {!saving && !checking && (
            <MaterialCommunityIcons name="arrow-right" size={19} color={theme.colors["on-primary"]} />
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
}

function DeviceVerdictCard({
  readiness,
  onDismiss,
}: {
  readiness: LocalAIReadiness;
  onDismiss: () => void;
}) {
  const accent =
    readiness.verdict === "great"
      ? theme.colors.success
      : readiness.verdict === "ok"
        ? theme.colors.warning
        : readiness.verdict === "poor"
          ? theme.colors.danger
          : theme.colors.muted;
  const icon =
    readiness.verdict === "great"
      ? "check-circle-outline"
      : readiness.verdict === "ok"
        ? "alert-circle-outline"
        : readiness.verdict === "poor"
          ? "close-circle-outline"
          : "help-circle-outline";
  const rec = readiness.recommended;
  return (
    <View style={styles.verdictCard}>
      <View style={styles.verdictHeader}>
        <View style={[styles.infoIcon, { backgroundColor: `${accent}14` }]}>
          <MaterialCommunityIcons name={icon} size={20} color={accent} />
        </View>
        <View style={styles.infoCopy}>
          <Text style={styles.infoTitle}>Your device check</Text>
          <Text style={styles.verdictHeadline}>{readiness.headline}</Text>
        </View>
      </View>
      <Text style={styles.infoText}>{readiness.detail}</Text>

      {rec.modelName ? (
        <View style={styles.pickBlock}>
          <View style={styles.pickRow}>
            <MaterialCommunityIcons
              name="download-outline"
              size={15}
              color={theme.colors.primary}
            />
            <Text style={styles.pickText}>
              Best for this phone: <Text style={styles.pickStrong}>{rec.modelName}</Text>
              {rec.downloadBytes
                ? ` · ${(rec.downloadBytes / (1024 * 1024 * 1024)).toFixed(2)} GB download`
                : " · already built in"}
            </Text>
          </View>
          <View style={styles.pickRow}>
            <MaterialCommunityIcons
              name={rec.basis === "measured" ? "speedometer" : "calculator-variant-outline"}
              size={15}
              color={theme.colors.muted}
            />
            <Text style={styles.pickMeta}>
              {rec.basis === "measured"
                ? rec.tokensPerSecond != null
                  ? `Measured on this device: ${rec.tokensPerSecond} tok/s`
                  : "Based on a measured result from this device"
                : "Based on your device's specs — not yet measured here"}
            </Text>
          </View>
        </View>
      ) : null}
      <View style={styles.specList}>
        {readiness.specs.map((spec) => (
          <View key={spec.label} style={styles.specRow}>
            <Text style={styles.specLabel}>{spec.label}</Text>
            <View style={styles.specValueWrap}>
              <Text style={styles.specValue}>{spec.value}</Text>
              {spec.ok === true ? (
                <MaterialCommunityIcons name="check" size={14} color={theme.colors.success} />
              ) : spec.ok === false ? (
                <MaterialCommunityIcons name="close" size={14} color={theme.colors.danger} />
              ) : null}
            </View>
          </View>
        ))}
      </View>
      <TouchableOpacity onPress={onDismiss} activeOpacity={0.7} style={styles.verdictDismiss}>
        <Text style={styles.verdictDismissText}>Re-check or pick a different option</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.bg,
  },
  content: {
    paddingHorizontal: theme.spacing.xl,
    paddingTop: 72,
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
  choiceList: {
    gap: theme.spacing.sm,
  },
  choiceCard: {
    backgroundColor: theme.colors.card,
    borderRadius: theme.radii.lg,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: theme.spacing.lg,
    ...theme.shadows.cardSoft,
  },
  choiceCardSelected: {
    borderColor: theme.colors.primary,
    backgroundColor: `${theme.colors.primary}06`,
  },
  choiceTop: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing.md,
  },
  choiceIcon: {
    width: 46,
    height: 46,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: theme.colors.surfaceElevated,
  },
  choiceIconSelected: {
    backgroundColor: theme.colors.primary,
  },
  choiceHeading: {
    flex: 1,
  },
  choiceTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    gap: theme.spacing.xs,
  },
  choiceTitle: {
    ...theme.typography.titleMd,
    color: theme.colors.ink,
  },
  choiceEyebrow: {
    ...theme.typography.legal,
    color: theme.colors.muted,
    marginTop: 3,
    letterSpacing: 0.5,
  },
  recommendedBadge: {
    backgroundColor: `${theme.colors.success}18`,
    borderRadius: theme.radii.pill,
    paddingHorizontal: 7,
    paddingVertical: 3,
  },
  recommendedText: {
    ...theme.typography.legal,
    color: theme.colors.success,
    fontSize: 9,
    letterSpacing: 0.3,
  },
  notRecommendedBadge: {
    backgroundColor: `${theme.colors.warning}18`,
    borderRadius: theme.radii.pill,
    paddingHorizontal: 7,
    paddingVertical: 3,
  },
  notRecommendedText: {
    ...theme.typography.legal,
    color: theme.colors.warning,
    fontSize: 9,
    letterSpacing: 0.3,
  },
  byokBadge: {
    backgroundColor: `${theme.colors.info}18`,
    borderRadius: theme.radii.pill,
    paddingHorizontal: 7,
    paddingVertical: 3,
  },
  byokText: {
    ...theme.typography.legal,
    color: theme.colors.info,
    fontSize: 9,
    letterSpacing: 0.3,
  },
  radio: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 1.5,
    borderColor: theme.colors.border,
    alignItems: "center",
    justifyContent: "center",
  },
  radioSelected: {
    borderColor: theme.colors.primary,
  },
  radioDot: {
    width: 11,
    height: 11,
    borderRadius: 6,
    backgroundColor: theme.colors.primary,
  },
  choiceDescription: {
    ...theme.typography.bodyMd,
    color: theme.colors.body,
    lineHeight: 20,
    marginTop: theme.spacing.md,
    paddingLeft: 46 + theme.spacing.md,
  },
  infoCard: {
    flexDirection: "row",
    gap: theme.spacing.sm,
    marginTop: theme.spacing.lg,
    padding: theme.spacing.md,
    borderRadius: theme.radii.md,
    backgroundColor: theme.colors.surfaceElevated,
  },
  infoIcon: {
    width: 36,
    height: 36,
    borderRadius: 13,
    alignItems: "center",
    justifyContent: "center",
  },
  infoCopy: {
    flex: 1,
  },
  infoTitle: {
    ...theme.typography.labelMd,
    color: theme.colors.ink,
    marginBottom: 4,
  },
  infoText: {
    ...theme.typography.legal,
    color: theme.colors.body,
    lineHeight: 17,
    marginBottom: 7,
  },
  privacyCard: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: theme.spacing.sm,
    marginTop: theme.spacing.md,
    padding: theme.spacing.md,
    borderRadius: theme.radii.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.card,
  },
  privacyCopy: {
    flex: 1,
  },
  privacyTitle: {
    ...theme.typography.labelMd,
    color: theme.colors.ink,
    marginBottom: 4,
  },
  privacyText: {
    ...theme.typography.legal,
    color: theme.colors.muted,
    lineHeight: 17,
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
  buttonText: {
    ...theme.typography.labelMd,
    color: theme.colors["on-primary"],
  },
  buttonBusy: {
    opacity: 0.7,
  },
  verdictCard: {
    marginTop: theme.spacing.lg,
    padding: theme.spacing.md,
    borderRadius: theme.radii.md,
    backgroundColor: theme.colors.card,
    borderWidth: 1,
    borderColor: theme.colors.border,
    ...theme.shadows.cardSoft,
  },
  verdictHeader: {
    flexDirection: "row",
    gap: theme.spacing.sm,
    marginBottom: theme.spacing.sm,
  },
  verdictHeadline: {
    ...theme.typography.labelMd,
    color: theme.colors.ink,
    lineHeight: 18,
    marginTop: 2,
  },
  specList: {
    marginTop: theme.spacing.sm,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
    paddingTop: theme.spacing.sm,
    gap: theme.spacing.xs,
  },
  specRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  specLabel: {
    ...theme.typography.legal,
    color: theme.colors.muted,
  },
  specValueWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  specValue: {
    ...theme.typography.legal,
    color: theme.colors.ink,
    fontFamily: "Nunito_600SemiBold",
    fontWeight: "600",
  },
  pickBlock: {
    marginTop: theme.spacing.sm,
    paddingTop: theme.spacing.sm,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
    gap: 6,
  },
  pickRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 6,
  },
  pickText: {
    flex: 1,
    ...theme.typography.legal,
    color: theme.colors.body,
    lineHeight: 17,
  },
  pickStrong: {
    color: theme.colors.ink,
    fontFamily: "Nunito_600SemiBold",
    fontWeight: "600",
  },
  pickMeta: {
    flex: 1,
    ...theme.typography.legal,
    color: theme.colors.muted,
    lineHeight: 17,
  },
  verdictDismiss: {
    marginTop: theme.spacing.sm,
    alignSelf: "center",
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  verdictDismissText: {
    ...theme.typography.legal,
    color: theme.colors.info,
    fontFamily: "Nunito_600SemiBold",
    fontWeight: "600",
  },
});

// Akosian
// Copyright (C) 2026 Pranesh Shivaraj
//
// This program is free software: you can redistribute it and/or modify
// it under the terms of the GNU General Public License as published by
// the Free Software Foundation, either version 3 of the License, or
// (at your option) any later version.

import { useState, useRef, useEffect, useCallback } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Alert,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter, useFocusEffect } from "expo-router";
import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import { theme, formatSleepDuration } from "../src/theme";
import { useGoBack } from "../src/hooks/useGoBack";
import { ChatBubble } from "../src/components/ChatBubble";
import { ThinkingBubble } from "../src/components/ThinkingBubble";
import { BetaBadge, BetaChip } from "../src/components/BetaBadge";
import {
  initializeLLM,
  getStatus,
  extractMessages,
  getQwenDownloadProgress,
  getModelDownloadProgress,
  getLlamaModelId,
  getAvailableLlamaModels,
  switchLlamaModel,
  checkModelDownloaded,
  createChatSession,
  isAIEnabled,
  type ChatSession,
  type ToolHandler,
  type DisplayMessage,
} from "../src/services/localLLM";
import {
  createAgentChatSession,
  type AgentChatSession,
} from "../src/services/ai/chatSession";
import { HEALTH_AGENT_ENABLED, HEALTH_AGENT_INSTRUCTIONS } from "../src/services/ai/healthTools";
import { getBodySummary } from "../src/services/bodySummary";
import { toolActivity, sourcesForTools } from "../src/services/ai/toolLabels";
import { HealthService, computeStrainScore, computeSleepScore, type HealthConnectionStatus } from "../src/services/health";
import { getHabitLog, formatDateKey } from "../src/services/journal";
import {
  searchFood,
  getFoodByFdcId,
  logMeal,
  estimateServing,
  getMeals,
  getFoodDatabaseAttribution,
  type FoodItem,
  type MealEntry,
} from "../src/services/foodDatabase";
import { calculateReadiness } from "../src/services/readiness";
import { getReadinessHistory } from "../src/services/insights";
import { buildCoachChatToolHandlers } from "../src/services/coachPlan";
import type { LlamaModel } from "../src/services/providers/llamaProvider";
import {
  FAST_ENOUGH_TPS,
  getModelPickerRows,
  markManualModelChoice,
  measureModelSpeed,
  type ModelPickerRow,
} from "../src/services/localModel";

const HEALTH_SYSTEM_PROMPT = `You are a health coach AI. You have access to the user's health data through tools. ALWAYS call the right tool before answering — never make up numbers.

Available tools (one per response, JSON format):

ACTIVITY:
  get_steps     — {"action":"get_steps", "period":"today"|"week"|"month"}  → steps, distance, active calories
  get_heart     — {"action":"get_heart", "period":"today"|"week"}             → heart rate, resting HR, HRV
  get_workouts  — {"action":"get_workouts", "period":"week"|"month"}          → recent workout sessions
  get_activity_trends — {"action":"get_activity_trends", "period":"week"|"month"} → daily activity over time

BODY & VITALS:
  get_vitals    — {"action":"get_vitals"}                  → blood oxygen, respiratory rate, body temp, blood pressure
  get_body      — {"action":"get_body"}                    → weight, height, BMI, body fat, lean mass, VO2 max (with sources; use weightKg for per-kg protein guidance)

RECOVERY:
  get_sleep     — {"action":"get_sleep", "period":"today"|"week"}  → sleep duration (quote sleepDuration/duration verbatim, e.g. 7h 24m), sleep score
  get_recovery  — {"action":"get_recovery"}                          → strain score, sleep score, readiness score, 7-day readiness trend

LIFESTYLE:
  get_journal   — {"action":"get_journal", "date":"today"|"yesterday"|"YYYY-MM-DD"}  → habits completed, caffeine, hydrationCups, alcohol, mood
  get_meals     — {"action":"get_meals", "date":"today"|"yesterday"|"YYYY-MM-DD"}     → meals with nutrition breakdown

FOOD LOGGING:
  search_food   — {"action":"search_food", "query":"food name"}  → up to 8 catalog matches with per-100g nutrition
  log_meal      — {"action":"log", "fdcId": string, "foodName": string, "servingG": number}  → logs one food to today's log
    - Instead of servingG you can use "calorieTarget": number to specify desired calories
    - ALWAYS search first and pass the fdcId from the results. For multi-food meals, search and log every ingredient.
    - If the amount is vague, do NOT silently log an estimate — ask one brief clarifying question with your best guess as options, and log once confirmed. If search returns several plausible matches, ask which one.
    - When you log with an estimated serving, state the assumption ("Logged as ~150g — tell me if it was more or less").
    - After logging, confirm briefly what was added. Never invent nutrition numbers.

COACH PLANNING:
  get_goal_guidance — {"action":"get_goal_guidance", "goalId":"weight_loss"|"muscle_gain"|... , "topic":"targets"|"nutrition"|...} → knowledge chunk from the goal library
  get_plan          — {"action":"get_plan"}                                              → the user's current saved plan
  update_plan       — {"action":"update_plan","habitIds":[...],"nutrition":{"calories":..,"proteinG":..,"carbsG":..,"fatG":..},"sleepHours":..,"stepsPerDay":..,"trainingDays":..,"focusNote":"..."} → saves a new/updated plan and applies habits to the journal

  When the user asks to make, change, or personalise a plan: call get_goal_guidance (at least the "targets" chunk) for their goal(s), then update_plan with concrete numbers, then reply. Habit ids must be real ids from the goal guidance's habits list. Only change what the user asked to change.

reply — {"action":"reply", "message":"<your reply>"}

RULES:
- NEVER guess data. If the user asks about sleep, call get_sleep first. Steps? get_steps. Recovery? get_recovery.
- Every device-data tool result (steps, heart, workouts, trends, vitals, body, sleep, recovery) includes "healthStatus".
  "connected" = the numbers are real. "connected_no_data" or "access_requested" = permission exists but nothing has synced — say the connection is on but empty, and suggest checking the wearable sync. Any other value (needs_permission, not_connected, unavailable, error) = you do NOT have the user's health data: say so plainly, NEVER quote the zero/empty values as real measurements, and NEVER claim access you don't have. Tell the user to connect from Overview → Connect.
- get_journal "hasData": false means no entry that day. get_meals with count 0 means nothing logged — say so, don't claim otherwise.
- For body metrics, weightSource/heightSource say where each value came from (wearable, manual log, or profile) — cite the source when it matters.
- Pick the most specific tool. Don't call get_recovery if the user only asked about steps.
- Call ONE tool at a time. The result comes back, then you can call another or reply.
- For questions about trends or history, use period "week" or "month".
- For today's data use period "today" (or omit period).
- Connect dots between sleep, activity, nutrition, and vitals in your reply.
- Be warm, encouraging, concise (2-4 sentences). Mention actual numbers.
- Always state sleep durations in hours and minutes (e.g. 7h 24m, 8h) — never decimals like 7.4 hours. Quote the sleepDuration/duration fields verbatim.
- If data is missing, acknowledge it and suggest how to get it.`;

export default function HealthChatScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const handleBack = useGoBack();
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<DisplayMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const [activity, setActivity] = useState<string | null>(null);
  const [streamingText, setStreamingText] = useState<string | null>(null);
  const [pendingQueue, setPendingQueue] = useState<string[]>([]);
  const [initState, setInitState] = useState<"init" | "downloading" | "ready" | "error">("init");
  const [downloadProgress, setDownloadProgress] = useState(0);
  const [aiDisabled, setAiDisabled] = useState(false);
  const flatRef = useRef<FlatList>(null);
  const sessionRef = useRef<ChatSession | AgentChatSession | null>(null);

  // Model picker
  const [showModelPicker, setShowModelPicker] = useState(false);
  const [availableModels, setAvailableModels] = useState<LlamaModel[]>([]);
  const [currentModelId, setCurrentModelId] = useState<string | null>(null);
  const [modelDownloadStates, setModelDownloadStates] = useState<Record<string, "not_downloaded" | "downloading" | "ready">>({});
  // Device-fit + measured-speed annotations for the model picker.
  const [pickerRows, setPickerRows] = useState<ModelPickerRow[]>([]);
  const [recommendedModelId, setRecommendedModelId] = useState<string | null>(null);
  const [speedTestId, setSpeedTestId] = useState<string | null>(null);
  const [switchProgress, setSwitchProgress] = useState(-1);
  useEffect(() => {
    (async () => {
      try {
        // "No AI" is a first-class choice — skip the setup overlay entirely.
        if (!(await isAIEnabled())) {
          setAiDisabled(true);
          setInitState("error");
          return;
        }
        setInitState("downloading");
        await initializeLLM();

        const session: ChatSession | AgentChatSession = HEALTH_AGENT_ENABLED
          ? createAgentChatSession({ systemPrompt: HEALTH_AGENT_INSTRUCTIONS, kind: "health" })
          : createChatSession({
              systemPrompt: HEALTH_SYSTEM_PROMPT,
              toolHandlers: buildHealthToolHandlers(),
            });
        sessionRef.current = session;

        setInitState("ready");
        setMessages([]);

        const provider = getStatus();
        if (provider.name.includes("Llama")) {
          const models = getAvailableLlamaModels();
          setAvailableModels(models);
          setCurrentModelId(getLlamaModelId());
          const states: Record<string, "not_downloaded" | "downloading" | "ready"> = {};
          for (const m of models) {
            states[m.id] = (await checkModelDownloaded(m.id)) ? "ready" : "not_downloaded";
          }
          setModelDownloadStates(states);
          // Fit + measured speed for the picker. Never blocks chat: any failure
          // just leaves the rows unannotated.
          try {
            const picker = await getModelPickerRows();
            setPickerRows(picker.rows);
            setRecommendedModelId(picker.recommendation.modelId);
          } catch {}
        }
      } catch (e) {
        console.warn("[HealthChat] Init failed:", e);
        setAiDisabled(!(await isAIEnabled()));
        setInitState("error");
      }
    })();
  }, []);

  useEffect(() => {
    if (initState === "downloading") {
      const interval = setInterval(() => setDownloadProgress(getQwenDownloadProgress()), 500);
      return () => clearInterval(interval);
    }
  }, [initState]);

  // Re-init if the provider was reset while away (e.g. BYOK set up from
  // Settings), so the header name and next send use the new choice.
  useFocusEffect(
    useCallback(() => {
      const status = getStatus();
      if (status.status === "unavailable") {
        initializeLLM()
          .then(() => {
            // Rebuild the session if it was never created (e.g. AI was off and
            // the user just enabled it), so handleSend never drops a message
            // against a null sessionRef.
            if (!sessionRef.current) {
              sessionRef.current = HEALTH_AGENT_ENABLED
                ? createAgentChatSession({ systemPrompt: HEALTH_AGENT_INSTRUCTIONS, kind: "health" })
                : createChatSession({
                    systemPrompt: HEALTH_SYSTEM_PROMPT,
                    toolHandlers: buildHealthToolHandlers(),
                  });
            }
            setAiDisabled(false);
            setInitState("ready");
          })
          .catch(async () => {
            // AI may have been switched off while this screen was away.
            if (!(await isAIEnabled())) {
              setAiDisabled(true);
              setInitState("error");
            }
          });
      }
    }, [])
  );

  useEffect(() => {
    if (messages.length > 0) setTimeout(() => flatRef.current?.scrollToEnd({ animated: true }), 100);
  }, [messages]);

  const sendMessage = useCallback(async (text: string) => {
    if (!sessionRef.current) return;
    setLoading(true);
    setStreamingText("");
    resetTodaySnapshot();
    resetHealthAccess();
    try {
      if (HEALTH_AGENT_ENABLED) {
        const turns = await (sessionRef.current as AgentChatSession).sendMessage(
          text,
          (partial) => setStreamingText(partial),
          (a) => setActivity(a.kind === "tool" ? toolActivity(a.label) : "Thinking…"),
        );
        setMessages(
          turns.map((t) => ({
            sender: t.role,
            text: t.text,
            sources: sourcesForTools(t.tools),
            reasoning: t.reasoning,
          })),
        );
      } else {
        const history = await (sessionRef.current as ChatSession).sendMessage(
          text,
          (partial) => {
            setStreamingText(partial);
          },
        );
        setMessages(extractMessages(history));
      }
    } catch (e) {
      console.warn("[HealthChat] Send failed:", e);
      setMessages((prev) => [
        ...prev,
        {
          sender: "assistant",
          text: "Sorry, something went wrong. Check your AI provider in Settings and try again.",
        },
      ]);
    } finally {
      setLoading(false);
      setStreamingText(null);
      setActivity(null);
    }
  }, []);

  const handleSend = useCallback(() => {
    const text = input.trim();
    if (!text || !sessionRef.current) return;

    setInput("");
    setMessages((prev) => [...prev, { sender: "user", text }]);

    if (loading) {
      setPendingQueue((prev) => [...prev, text]);
      return;
    }

    sendMessage(text);
  }, [input, loading, sendMessage]);

  // Process any messages queued while the LLM was generating
  useEffect(() => {
    if (!loading && pendingQueue.length > 0) {
      const [next, ...rest] = pendingQueue;
      setPendingQueue(rest);
      sendMessage(next);
    }
  }, [loading, pendingQueue, sendMessage]);

  const handleStop = () => sessionRef.current?.cancelGeneration();
  const handleReset = useCallback(async () => { await sessionRef.current?.resetChat(); setMessages([]); setPendingQueue([]); }, []);

  const handleSwitchModel = async (modelId: string) => {
    if (modelId === currentModelId) return;
    if (loading) {
      Alert.alert("Reply in progress", "Stop the current reply before switching models.");
      return;
    }
    const row = pickerRows.find((r) => r.model.id === modelId);
    if (row && !row.fits) {
      Alert.alert(
        "Not enough memory",
        "This model is larger than this device can safely load. Pick a smaller one."
      );
      return;
    }

    const timer = setInterval(() => {
      setSwitchProgress(getModelDownloadProgress(modelId));
    }, 400);
    setSwitchProgress(0);
    try {
      setModelDownloadStates((prev) => ({ ...prev, [modelId]: "downloading" }));
      await switchLlamaModel(modelId);
      setCurrentModelId(modelId);
      setModelDownloadStates((prev) => ({ ...prev, [modelId]: "ready" }));
      // The cached agent holds the previous model; drop it so the next turn
      // actually runs on the model the user just picked.
      (sessionRef.current as AgentChatSession | null)?.refreshModel?.();
      // A deliberate pick must survive the device recommender, otherwise the
      // app would quietly move the user off the model they chose.
      await markManualModelChoice();
    } catch (e) {
      console.warn("[HealthChat] Model switch failed:", e);
      setModelDownloadStates((prev) => ({ ...prev, [modelId]: "not_downloaded" }));
      Alert.alert(
        "Couldn't switch models",
        e instanceof Error ? e.message : "This model could not be loaded on this device."
      );
    } finally {
      clearInterval(timer);
      setSwitchProgress(-1);
    }
  };

  /** Runs a real generation to measure this model's speed on this device. */
  const handleTestSpeed = async (modelId: string) => {
    if (speedTestId) return;
    setSpeedTestId(modelId);
    try {
      const speed = await measureModelSpeed(modelId);
      if (speed) {
        setPickerRows((prev) =>
          prev.map((row) => (row.model.id === modelId ? { ...row, speed } : row))
        );
      }
    } finally {
      setSpeedTestId(null);
    }
  };

  const providerName = getStatus().name;
  const isLlama = providerName.includes("Llama");

  // ── Download overlay ─────────────────────────────────────────
  if (initState === "init" || initState === "downloading") {
    const isLlamaDownload = getStatus().name.includes("Llama");
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <View style={styles.statusOverlay}>
          <View style={styles.statusIconWrap}>
            <MaterialCommunityIcons name="download" size={32} color={theme.colors.primary} />
          </View>
          <Text style={styles.statusTitle}>Setting up {getStatus().name}</Text>
          <Text style={styles.statusSub}>
            {initState === "downloading" && isLlamaDownload ? `Downloading model (${Math.round(downloadProgress * 100)}%)...` : "This should only take a moment..."}
          </Text>
          {isLlamaDownload && initState === "downloading" && (
            <View style={styles.progressTrack}><View style={[styles.progressFill, { width: `${Math.max(2, downloadProgress * 100)}%` }]} /></View>
          )}
          <ActivityIndicator size="small" color={theme.colors.muted} style={{ marginTop: 20 }} />
        </View>
      </View>
    );
  }

  // ── Error overlay ────────────────────────────────────────────
  if (initState === "error") {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <View style={styles.statusOverlay}>
          <View style={[styles.statusIconWrap, aiDisabled ? { backgroundColor: `${theme.colors.success}15` } : { backgroundColor: "#FDF0ED" }]}>
            <MaterialCommunityIcons
              name={aiDisabled ? "robot-off-outline" : "alert-circle-outline"}
              size={32}
              color={aiDisabled ? theme.colors.success : theme.colors.danger}
            />
          </View>
          <Text style={styles.statusTitle}>{aiDisabled ? "AI is off" : "Setup Failed"}</Text>
          <Text style={styles.statusSub}>
            {aiDisabled
              ? "You chose to skip the AI assistant. Everything else — health, journal, food, barcode scanning — works fine. Turn AI on anytime."
              : "Could not initialize the AI model. Please try again later."}
          </Text>
          <TouchableOpacity
            style={styles.primaryBtn}
            onPress={() => {
              if (aiDisabled) {
                router.push("/onboarding/ai-choice?from=chat");
                return;
              }
              setInitState("init");
              initializeLLM().then(() => setInitState("ready")).catch(() => setInitState("error"));
            }}
          >
            <Text style={styles.primaryBtnText}>{aiDisabled ? "Enable AI" : "Retry"}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.outlineBtn} onPress={handleBack}>
            <MaterialCommunityIcons name="arrow-left" size={16} color={theme.colors.ink} style={{ marginRight: 6 }} />
            <Text style={styles.outlineBtnText}>Go back</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // ── Main chat ────────────────────────────────────────────────
  // Keyboard handling: iOS always needs KAV padding. On Android, API 35+
  // ignores adjustResize under enforced edge-to-edge, so KAV padding does the
  // lifting; below 35 the window still resizes itself and any KAV adjustment
  // would double-lift the input bar, so KAV stays disabled there.
  // (behavior="height" is avoided everywhere: its frame-relative math fights
  // the window resize and leaves the bar behind the keyboard.)
  const kavEnabled = Platform.OS === "ios" || Number(Platform.Version) >= 35;
  return (
    <KeyboardAvoidingView
      style={[styles.container, { paddingTop: insets.top }]}
      behavior="padding"
      enabled={kavEnabled}
    >
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <TouchableOpacity onPress={handleBack} style={styles.headerIconBtn} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <MaterialCommunityIcons name="arrow-left" size={22} color={theme.colors.ink} />
          </TouchableOpacity>            <View style={styles.headerIconCircle}>
            <MaterialCommunityIcons name="robot-outline" size={18} color={theme.colors.info} />
          </View>
          <View>
            <View style={styles.headerTitleRow}>
              <Text style={styles.headerTitle}>Ask AI</Text>
              <BetaBadge />
            </View>
            <TouchableOpacity onPress={() => isLlama && setShowModelPicker(true)} disabled={!isLlama} activeOpacity={isLlama ? 0.7 : 1} style={isLlama ? styles.headerModelRow : undefined}>
              <Text style={styles.headerSubtitle}>{providerName}</Text>
              {isLlama && <MaterialCommunityIcons name="chevron-down" size={12} color={theme.colors.muted} />}
            </TouchableOpacity>
          </View>
        </View>
        <View style={styles.headerRight}>
          <TouchableOpacity onPress={handleReset} style={styles.headerIconBtn} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <MaterialCommunityIcons name="delete-sweep-outline" size={19} color={theme.colors.muted} />
          </TouchableOpacity>
        </View>
      </View>

      <FlatList ref={flatRef} data={messages} keyExtractor={(_, i) => String(i)} style={styles.list} contentContainerStyle={[styles.messageList, messages.length === 0 && !streamingText && styles.messageListEmpty]} keyboardShouldPersistTaps="handled"
        ListEmptyComponent={
          <View style={styles.welcomeWrap}><Text style={styles.welcomeEmoji}>🧠</Text><Text style={styles.welcomeTitle}>Health AI</Text><Text style={styles.welcomeBody}>Ask me anything about your health.{"\n\n"}Try "How did I sleep last night?" or{"\n"}"Build me a plan" or{"\n"}"Analyze my recovery."</Text><BetaChip text="AI answers are in beta — not medical advice. Consult a clinician before making health decisions." /></View>
        }
        ListFooterComponent={
          loading && !streamingText ? (
            <ThinkingBubble label={activity ?? "Thinking"} />
          ) : streamingText != null ? (
            <View style={styles.streamingRow}>
              <View style={styles.streamingAvatar}>
                <MaterialCommunityIcons name="robot-outline" size={15} color={theme.colors.primary} />
              </View>
              <View style={styles.streamingBubble}>
                <Text style={styles.streamingText}>
                  {streamingText}
                  <Text style={styles.streamingCursor}> ▌</Text>
                </Text>
              </View>
            </View>
          ) : null
        }
        renderItem={({ item }) => (
          <ChatBubble sender={item.sender} text={item.text} mealInfo={null} isAction={item.isAction} sources={item.sources} reasoning={item.reasoning} />
        )}
        onContentSizeChange={() => flatRef.current?.scrollToEnd({ animated: true })} onLayout={() => flatRef.current?.scrollToEnd({ animated: false })}
      />

      <View style={[styles.inputBar, { paddingBottom: Math.max(insets.bottom, theme.spacing.sm) }]}>
        <View style={styles.inputRow}>
          <View style={styles.inputWrap}>
            <TextInput style={styles.input} placeholder="Ask about your health..." placeholderTextColor={theme.colors.muted} value={input} onChangeText={setInput} multiline maxLength={500} returnKeyType="send" onSubmitEditing={handleSend} editable={initState === "ready"} />
          </View>
          <TouchableOpacity style={[styles.sendBtn, !input.trim() && !loading && styles.sendBtnDisabled, loading && styles.sendBtnStop]} onPress={loading ? handleStop : handleSend} disabled={!loading && !input.trim()} activeOpacity={0.8}>
            {loading ? <MaterialCommunityIcons name="stop" size={20} color="#FFFFFF" /> : <MaterialCommunityIcons name="arrow-up" size={20} color="#FFFFFF" />}
          </TouchableOpacity>
        </View>
      </View>

      {/* Model picker modal */}
      {showModelPicker && (
        <TouchableOpacity style={styles.modelOverlay} activeOpacity={1} onPress={() => setShowModelPicker(false)}>
          <TouchableOpacity activeOpacity={1} onPress={() => {}} style={styles.modelSheet}>
            <View style={styles.modelSheetHeader}>
              <Text style={styles.modelSheetTitle}>Choose Model</Text>
              <TouchableOpacity onPress={() => setShowModelPicker(false)} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
                <MaterialCommunityIcons name="close" size={22} color={theme.colors.ink} />
              </TouchableOpacity>
            </View>
            <Text style={styles.modelSheetSub}>Models run locally on your device. Larger models are smarter but slower — speed is measured here, not estimated.</Text>
            {availableModels.map((m) => {
              const isCurrent = m.id === currentModelId;
              const dlState = modelDownloadStates[m.id] ?? "not_downloaded";
              const row = pickerRows.find((r) => r.model.id === m.id);
              const speed = row?.speed ?? null;
              const isRecommended = m.id === recommendedModelId;
              const tooLarge = row != null && !row.fits;
              const busy = dlState === "downloading";
              return (
                <TouchableOpacity
                  key={m.id}
                  style={[styles.modelRow, isCurrent && styles.modelRowActive, tooLarge && styles.modelRowDisabled]}
                  onPress={() => handleSwitchModel(m.id)}
                  disabled={busy || loading || tooLarge}
                  activeOpacity={0.7}
                >
                  <View style={styles.modelRowInfo}>
                    <View style={styles.modelRowTitleRow}>
                      <Text style={styles.modelRowName}>{m.name}</Text>
                      {isRecommended ? (
                        <View style={styles.modelRecommendedBadge}>
                          <Text style={styles.modelRecommendedText}>FOR THIS DEVICE</Text>
                        </View>
                      ) : null}
                    </View>
                    <Text style={styles.modelRowSize}>
                      {m.size}
                      {tooLarge ? " · too large for this device" : ""}
                    </Text>
                    {busy ? (
                      <Text style={styles.modelRowSize}>
                        {switchProgress > 0 && switchProgress < 1
                          ? `Downloading… ${Math.round(switchProgress * 100)}%`
                          : "Preparing model…"}
                      </Text>
                    ) : null}
                    {speed ? (
                      <Text
                        style={[
                          styles.modelRowSize,
                          speed.tokensPerSecond >= FAST_ENOUGH_TPS ? styles.modelRowSpeedGood : null,
                        ]}
                      >
                        Measured on this device: {speed.tokensPerSecond} tok/s
                      </Text>
                    ) : null}
                    {!speed && row?.fits && dlState === "ready" && !isCurrent ? (
                      <TouchableOpacity
                        onPress={() => handleTestSpeed(m.id)}
                        disabled={!!speedTestId || busy || loading}
                        activeOpacity={0.7}
                        style={styles.modelTestBtn}
                      >
                        {speedTestId === m.id ? (
                          <ActivityIndicator size="small" color={theme.colors.info} />
                        ) : (
                          <Text style={styles.modelTestText}>Test speed on this device</Text>
                        )}
                      </TouchableOpacity>
                    ) : null}
                  </View>
                  {busy ? (
                    <View style={styles.modelActiveBadge}><ActivityIndicator size="small" color={theme.colors.primary} /></View>
                  ) : isCurrent ? (
                    <View style={styles.modelActiveBadge}><MaterialCommunityIcons name="check-circle" size={16} color={theme.colors.success} /></View>
                  ) : dlState === "ready" ? (
                    <MaterialCommunityIcons name="swap-horizontal" size={18} color={theme.colors.muted} />
                  ) : (
                    <View style={styles.modelDownloadBtn}><MaterialCommunityIcons name="download" size={16} color={theme.colors.primary} /></View>
                  )}
                </TouchableOpacity>
              );
            })}
          </TouchableOpacity>
        </TouchableOpacity>
      )}
    </KeyboardAvoidingView>
  );
}

// ── Helpers ────────────────────────────────────────────────────

function resolvePeriod(raw?: unknown): { days: number; label: string; dateOffset: number } {
  const p = String(raw ?? "today").toLowerCase();
  if (p === "today") return { days: 1, label: "today", dateOffset: 0 };
  if (p === "yesterday") return { days: 1, label: "yesterday", dateOffset: -1 };
  if (p === "week") return { days: 7, label: "last 7 days", dateOffset: 0 };
  if (p === "month") return { days: 30, label: "last 30 days", dateOffset: 0 };
  const n = Number(raw);
  if (Number.isFinite(n) && n > 0) return { days: n, label: `last ${n} days`, dateOffset: 0 };
  return { days: 1, label: "today", dateOffset: 0 };
}

function resolveDate(raw?: unknown): string {
  const p = String(raw ?? "today").toLowerCase();
  if (p === "today") return formatDateKey(new Date());
  if (p === "yesterday") {
    const d = new Date(); d.setDate(d.getDate() - 1);
    return formatDateKey(d);
  }
  // Accept YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}$/.test(p)) return p;
  return formatDateKey(new Date());
}

// ── Health tool handlers ──────────────────────────────────────

// One `sendMessage` can issue several health tool calls back-to-back, and each used to
// re-run `HealthService.initialize(false)` + `getTodayData()` (16 native queries). We
// memoise the snapshot for the duration of a single user message and clear it when the
// next message starts, so reads within one turn are O(1) but never cross-message stale.
let todaySnapshotCache: ReturnType<typeof HealthService.getTodayData> | null = null;

function resetTodaySnapshot(): void {
  todaySnapshotCache = null;
}

function getTodaySnapshot(): ReturnType<typeof HealthService.getTodayData> {
  if (!todaySnapshotCache) {
    todaySnapshotCache = (async () => {
      await HealthService.initialize(false);
      return HealthService.getTodayData();
    })().catch((e) => {
      // Never cache a rejected promise — a later tool in the same turn must be able to retry.
      todaySnapshotCache = null;
      throw e;
    });
  }
  return todaySnapshotCache;
}

let healthAccessCache: Promise<HealthConnectionStatus> | null = null;

/**
 * Connection state for this turn, memoized like the snapshot. Without this the
 * model cannot tell "0 steps measured" from "never granted access" — an
 * unconnected device yields all-zero snapshots that read as real data.
 */
function getHealthAccess(): Promise<HealthConnectionStatus> {
  if (!healthAccessCache) {
    healthAccessCache = HealthService.getConnectionStatus().catch(() => {
      healthAccessCache = null;
      return "error" as HealthConnectionStatus;
    });
  }
  return healthAccessCache;
}

function resetHealthAccess(): void {
  healthAccessCache = null;
}

function buildHealthToolHandlers(): Record<string, ToolHandler> {
  return {
    // ── Coach planning ────────────────────────────────────
    ...buildCoachChatToolHandlers(),

    // ── Activity ──────────────────────────────────────────
    get_steps: async (args) => {
      const { days, label, dateOffset } = resolvePeriod(args.period as string);
      try {
        const healthStatus = await getHealthAccess();
        await HealthService.initialize(false);

        if (days === 1 && dateOffset < 0) {
          // "yesterday": read the seeded daily row for that date instead of ignoring the
          // offset and answering with today's snapshot. Distance is only available for
          // the live snapshot, so it is omitted rather than reported from the wrong day.
          const date = resolveDate("yesterday");
          const daily = await HealthService.getDailyActivity(2);
          const row = daily.find((d) => d.date === date);
          return {
            toolResult: JSON.stringify({
              tool: "get_steps", period: label, date, healthStatus,
              steps: row?.steps ?? 0,
              activeCalories: Math.round(row?.activeCalories ?? 0),
              hasData: row?.hasData ?? false,
            }),
          };
        }

        if (days === 1) {
          const data = await getTodaySnapshot();
          const steps = data.steps ?? 0;
          return {
            toolResult: JSON.stringify({
              tool: "get_steps", period: label, healthStatus,
              steps,
              distanceMeters: Math.round(data.distance),
              activeCalories: Math.round(data.activeCalories),
            }),
          };
        }

        const daily = await HealthService.getDailyActivity(days);
        const totalSteps = daily.reduce((s, d) => s + d.steps, 0);
        const avgSteps = daily.length ? Math.round(totalSteps / daily.length) : 0;
        return {
          toolResult: JSON.stringify({
            tool: "get_steps", period: label, days: daily.length, healthStatus,
            totalSteps, avgSteps,
            daily: daily.slice(-7).map((d) => ({ date: d.date, steps: d.steps })),
          }),
        };
      } catch {
        return { toolResult: JSON.stringify({ tool: "get_steps", error: "Could not access step data" }) };
      }
    },

    get_heart: async (args) => {
      const { days, label } = resolvePeriod(args.period as string);
      try {
        const healthStatus = await getHealthAccess();
        const data = await getTodaySnapshot();
        const hr = data.heartRate?.length
          ? { avg: Math.round(data.heartRate.reduce((a, b) => a + b, 0) / data.heartRate.length), max: Math.max(...data.heartRate), min: Math.min(...data.heartRate), readings: data.heartRate.length }
          : null;

        const result: any = {
          tool: "get_heart", period: label, healthStatus,
          heartRate: hr,
          restingHeartRate: data.restingHeartRate,
          heartRateVariability: data.heartRateVariability,
        };

        if (days > 1) {
          const [rhrHistory, hrvHistory] = await Promise.all([
            HealthService.getMetricHistory("restingHeartRate", days),
            HealthService.getMetricHistory("heartRateVariability", days),
          ]);
          if (rhrHistory.length) result.rhrHistory = rhrHistory.slice(-7);
          if (hrvHistory.length) result.hrvHistory = hrvHistory.slice(-7);
        }

        return { toolResult: JSON.stringify(result) };
      } catch {
        return { toolResult: JSON.stringify({ tool: "get_heart", error: "Could not access heart data" }) };
      }
    },

    get_workouts: async (args) => {
      const { days, label } = resolvePeriod(args.period || "week");
      try {
        const healthStatus = await getHealthAccess();
        await HealthService.initialize(false);
        const workouts = await HealthService.getWorkouts(days);
        const totalMin = workouts.reduce((s, w) => s + w.durationMin, 0);
        return {
          toolResult: JSON.stringify({
            tool: "get_workouts", period: label, count: workouts.length, totalMinutes: Math.round(totalMin), healthStatus,
            workouts: workouts.slice(0, 10).map((w) => ({
              name: w.name, type: w.type, durationMin: Math.round(w.durationMin),
              calories: w.calories ? Math.round(w.calories) : null,
              date: w.startTime.toISOString().split("T")[0],
            })),
          }),
        };
      } catch {
        return { toolResult: JSON.stringify({ tool: "get_workouts", error: "Could not access workouts" }) };
      }
    },

    get_activity_trends: async (args) => {
      const { days, label } = resolvePeriod(args.period || "week");
      try {
        const healthStatus = await getHealthAccess();
        await HealthService.initialize(false);
        const daily = await HealthService.getDailyActivity(days);
        const totalSteps = daily.reduce((s, d) => s + d.steps, 0);
        const totalCals = daily.reduce((s, d) => s + d.activeCalories, 0);
        return {
          toolResult: JSON.stringify({
            tool: "get_activity_trends", period: label, days: daily.length, healthStatus,
            totalSteps, totalActiveCalories: Math.round(totalCals),
            avgSteps: daily.length ? Math.round(totalSteps / daily.length) : 0,
            daily: daily.map((d) => ({ date: d.date, steps: d.steps, activeCalories: Math.round(d.activeCalories), workouts: d.workoutCount })),
          }),
        };
      } catch {
        return { toolResult: JSON.stringify({ tool: "get_activity_trends", error: "Could not access activity trends" }) };
      }
    },

    // ── Body & Vitals ─────────────────────────────────────
    get_vitals: async () => {
      try {
        const healthStatus = await getHealthAccess();
        const data = await getTodaySnapshot();
        return {
          toolResult: JSON.stringify({
            tool: "get_vitals", healthStatus,
            bloodOxygen: data.bloodOxygen != null ? Math.round(data.bloodOxygen) : null,
            respiratoryRate: data.respiratoryRate,
            bodyTemperature: data.bodyTemperature,
            bloodPressure: data.bloodPressure,
          }),
        };
      } catch {
        return { toolResult: JSON.stringify({ tool: "get_vitals", error: "Could not access vitals" }) };
      }
    },

    get_body: async () => {
      try {
        const healthStatus = await getHealthAccess();
        const body = await getBodySummary();
        return {
          toolResult: JSON.stringify({
            tool: "get_body", healthStatus,
            weightKg: body.weightKg,
            weightSource: body.weightSource,
            ...(body.weightDate ? { weightDate: body.weightDate } : {}),
            heightCm: body.heightCm,
            heightSource: body.heightSource,
            bmi: body.bmi,
            bodyFatPercent: body.bodyFatPercent,
            leanBodyMassKg: body.leanBodyMassKg,
            vo2Max: body.vo2Max,
          }),
        };
      } catch {
        return { toolResult: JSON.stringify({ tool: "get_body", error: "Could not access body metrics" }) };
      }
    },

    // ── Recovery ──────────────────────────────────────────
    get_sleep: async (args) => {
      try {
        const healthStatus = await getHealthAccess();
        const data = await getTodaySnapshot();
        const sleepHours = data.sleepHours ?? 0;
        const sleepScore = computeSleepScore(data);

        const result: any = {
          tool: "get_sleep", period: "today", healthStatus,
          sleepHours: sleepHours ? +sleepHours.toFixed(1) : 0,
          sleepDuration: formatSleepDuration(sleepHours),
          sleepScore,
          // Explicit stage availability so the model answers honestly about
          // REM/deep when the device/wearable doesn't provide stage data,
          // instead of guessing or going quiet.
          hasSleepStages: !!data.sleepHasStages,
        };
        if (data.sleepHasStages) {
          result.sleepStages = {
            deepHours: +(data.sleepDeepHours ?? 0).toFixed(1),
            deepDuration: formatSleepDuration(data.sleepDeepHours ?? 0),
            remHours: +(data.sleepRemHours ?? 0).toFixed(1),
            remDuration: formatSleepDuration(data.sleepRemHours ?? 0),
            awakeMinutes: Math.round((data.sleepAwakeHours ?? 0) * 60),
          };
        }

        const { days, dateOffset, label } = resolvePeriod(args.period as string);
        if (days > 1) {
          // The device exposes per-night sleep history; use it instead of answering a
          // multi-day question with only today's numbers plus an apologetic note.
          const history = await HealthService.getSleepHistory(days);
          const nights = history
            .slice(-Math.min(days, 7))
            .map((h) => ({
              date: h.date,
              hours: +h.value.toFixed(1),
              duration: formatSleepDuration(h.value),
            }));
          result.period = label;
          result.nights = nights;
          const avg = nights.length
            ? nights.reduce((s, n) => s + n.hours, 0) / nights.length
            : 0;
          result.averageHours = +avg.toFixed(1);
          result.averageDuration = formatSleepDuration(avg);
        } else if (dateOffset < 0) {
          // "yesterday" — read that night's total from history rather than today's.
          const date = resolveDate("yesterday");
          const history = await HealthService.getSleepHistory(2);
          const night = history.find((h) => h.date === date);
          result.period = label;
          result.sleepHours = night ? +night.value.toFixed(1) : 0;
          result.sleepDuration = formatSleepDuration(night?.value ?? 0);
          delete result.sleepScore;
          delete result.hasSleepStages;
          delete result.sleepStages;
        }

        return { toolResult: JSON.stringify(result) };
      } catch {
        return { toolResult: JSON.stringify({ tool: "get_sleep", error: "Could not access sleep data" }) };
      }
    },

    get_recovery: async () => {
      try {
        const healthStatus = await getHealthAccess();
        const data = await getTodaySnapshot();
        const strainScore = computeStrainScore(data);
        const sleepScore = computeSleepScore(data);
        const readiness = await calculateReadiness(data.heartRateVariability, data.restingHeartRate, data.sleepHours);
        const history = await getReadinessHistory(7);

        return {
          toolResult: JSON.stringify({
            tool: "get_recovery", healthStatus,
            strainScore,
            sleepScore,
            readinessScore: readiness.score,
            readinessSummary: readiness.summary,
            hrvDeviation: readiness.hrvDeviation,
            rhrDeviation: readiness.rhrDeviation,
            recentReadiness: history.slice(-7).map((h) => ({ date: h.date, score: h.score })),
          }),
        };
      } catch {
        return { toolResult: JSON.stringify({ tool: "get_recovery", error: "Could not access recovery data" }) };
      }
    },

    // ── Lifestyle ─────────────────────────────────────────
    get_journal: async (args) => {
      const date = resolveDate(args.date as string);
      try {
        const log = await getHabitLog(date);
        const completed = Object.entries(log.completed || {})
          .filter(([, v]) => v === true)
          .map(([k]) => k);
        return {
          toolResult: JSON.stringify({
            tool: "get_journal", date,
            habitsCompleted: completed,
            habitsTotal: Object.keys(log.completed || {}).length,
            caffeine: log.caffeine,
            hydrationCups: log.hydration,
            alcohol: log.alcohol,
            mood: log.mood,
            hasData: completed.length > 0 || log.caffeine > 0 || log.hydration > 0 || log.alcohol > 0,
          }),
        };
      } catch {
        return { toolResult: JSON.stringify({ tool: "get_journal", error: "Could not access journal" }) };
      }
    },

    get_meals: async (args) => {
      const date = resolveDate(args.date as string);
      try {
        const meals = await getMeals(date);
        return {
          toolResult: JSON.stringify({
            tool: "get_meals", date, count: meals.length,
            totalCalories: meals.reduce((s, m) => s + m.calories, 0),
            totalProtein: +meals.reduce((s, m) => s + m.protein, 0).toFixed(1),
            totalCarbs: +meals.reduce((s, m) => s + m.carbs, 0).toFixed(1),
            totalFat: +meals.reduce((s, m) => s + m.fat, 0).toFixed(1),
            meals: meals.map((m) => ({ mealId: m.id, foodName: m.foodName, servingGrams: m.servingGrams, calories: m.calories, protein: m.protein, carbs: m.carbs, fat: m.fat })),
            nutritionSource: getFoodDatabaseAttribution(),
          }),
        };
      } catch {
        return { toolResult: JSON.stringify({ tool: "get_meals", error: "Could not access meals" }) };
      }
    },

    // ── Food logging (write path — same semantics as the food chat) ──
    search_food: async (args) => {
      const query = String((args.query as string) || "");
      const results = await searchFood(query);
      return {
        toolResult: JSON.stringify({
          tool: "search_food", query, found: results.length,
          results: results.map((f) => ({ fdcId: f.fdcId, description: f.description, calories: f.calories, protein: f.protein, carbs: f.carbs, fat: f.fat, fiber: f.fiber })),
        }),
      };
    },

    log_meal: async (args) => {
      const fdcId = String((args.fdcId as string) || "");
      const foodName = String((args.foodName as string) || "");
      let servingG = Number(args.servingG || args.serving_grams || 0);

      let food: FoodItem | null = null;
      let matchedBy = "none";
      if (fdcId) {
        food = await getFoodByFdcId(fdcId);
        if (food) matchedBy = "fdcId";
      }
      if (!food && foodName) {
        const results = await searchFood(foodName);
        if (results.length > 0) {
          food = results[0];
          matchedBy = "foodName";
        }
      }
      if (!food && fdcId) {
        const results = await searchFood(fdcId);
        if (results.length > 0) {
          food = results[0];
          matchedBy = "fdcIdAsText";
        }
      }

      if (food) {
        if (servingG <= 0) {
          const calorieTarget = Number(args.calorieTarget || args.calories_target || 0);
          if (calorieTarget > 0 && food.calories > 0) servingG = Math.round((calorieTarget / food.calories) * 100);
          else servingG = estimateServing(food.description);
        }
        const multiplier = servingG / 100;
        const now = new Date();
        const entry: MealEntry = {
          id: `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
          date: formatDateKey(now), timestamp: now.toISOString(),
          fdcId: food.fdcId, foodName: food.description, servingGrams: servingG,
          calories: Math.round(food.calories * multiplier),
          protein: Math.round(food.protein * multiplier * 10) / 10,
          carbs: Math.round(food.carbs * multiplier * 10) / 10,
          fat: Math.round(food.fat * multiplier * 10) / 10,
          fiber: Math.round(food.fiber * multiplier * 10) / 10,
        };
        await logMeal(entry);
        return { toolResult: JSON.stringify({ tool: "log_meal", success: true, matchedBy, substituted: matchedBy !== "fdcId", fdcId: food.fdcId, foodName: food.description, servingGrams: servingG, calories: entry.calories, protein: entry.protein, carbs: entry.carbs, fat: entry.fat }) };
      }
      return { toolResult: JSON.stringify({ tool: "log_meal", success: false, error: `Food not found: ${foodName || fdcId}` }) };
    },
  };
}

// ── Styles ─────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.bg },
  statusOverlay: { flex: 1, alignItems: "center", justifyContent: "center", padding: theme.spacing.xxl },
  statusIconWrap: { width: 64, height: 64, borderRadius: 32, backgroundColor: theme.colors.surfaceElevated, alignItems: "center", justifyContent: "center", marginBottom: theme.spacing.lg },
  statusTitle: { ...theme.typography.titleLg, color: theme.colors.ink, marginBottom: theme.spacing.xs },
  statusSub: { ...theme.typography.bodyMd, color: theme.colors.muted, textAlign: "center", lineHeight: 20 },
  progressTrack: { width: 220, height: 6, backgroundColor: theme.colors.border, borderRadius: 3, marginTop: theme.spacing.lg, overflow: "hidden" },
  progressFill: { height: "100%", backgroundColor: theme.colors.primary, borderRadius: 3 },
  primaryBtn: { marginTop: theme.spacing.xl, paddingHorizontal: 32, paddingVertical: 12, backgroundColor: theme.colors.primary, borderRadius: theme.radii.md },
  primaryBtnText: { color: "#FFFFFF", fontSize: 15, fontFamily: "Nunito_600SemiBold", fontWeight: "600" },
  outlineBtn: { marginTop: theme.spacing.md, flexDirection: "row", alignItems: "center", paddingHorizontal: 24, paddingVertical: 12, backgroundColor: theme.colors.card, borderWidth: 1, borderColor: theme.colors.border, borderRadius: theme.radii.md },
  outlineBtnText: { color: theme.colors.ink, fontSize: 14, fontFamily: "Nunito_600SemiBold", fontWeight: "600" },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: theme.spacing.lg, paddingVertical: 14, backgroundColor: theme.colors.card, borderBottomWidth: 1, borderBottomColor: theme.colors.border, ...theme.shadows.header },
  headerLeft: { flexDirection: "row", alignItems: "center", gap: 12 },
  headerIconCircle: { width: 38, height: 38, borderRadius: 19, backgroundColor: theme.colors.surfaceElevated, alignItems: "center", justifyContent: "center" },
  headerTitleRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  headerTitle: { ...theme.typography.titleSm, color: theme.colors.ink },
  headerSubtitle: { fontSize: 11, color: theme.colors.muted, fontFamily: "Nunito_500Medium", fontWeight: "500", marginTop: 2 },
  headerRight: { flexDirection: "row", alignItems: "center", gap: 4 },
  headerIconBtn: { width: 36, height: 36, borderRadius: 18, alignItems: "center", justifyContent: "center", backgroundColor: theme.colors.surfaceElevated },
  messageList: { padding: theme.spacing.lg, flexGrow: 1, justifyContent: "flex-end" },
  list: { flex: 1 },
  messageListEmpty: { justifyContent: "center" },
  welcomeWrap: { alignItems: "center", paddingHorizontal: theme.spacing.xl },
  welcomeEmoji: { fontSize: 48, marginBottom: theme.spacing.lg },
  welcomeTitle: { ...theme.typography.titleLg, color: theme.colors.ink, marginBottom: theme.spacing.sm },
  welcomeBody: { ...theme.typography.bodyMd, color: theme.colors.muted, textAlign: "center", lineHeight: 22 },
  inputBar: { paddingHorizontal: theme.spacing.md, paddingTop: theme.spacing.sm, backgroundColor: theme.colors.bg },
  inputRow: { flexDirection: "row", alignItems: "flex-end", gap: 10, backgroundColor: theme.colors.card, borderRadius: 28, borderWidth: 1, borderColor: theme.colors.border, padding: 6, ...theme.shadows.card },
  inputWrap: { flex: 1, paddingLeft: 12 },
  input: { fontSize: 15, lineHeight: 20, color: theme.colors.ink, maxHeight: 100, paddingVertical: 8, fontFamily: "Nunito_400Regular", fontWeight: "400" },
  sendBtn: { width: 42, height: 42, borderRadius: 21, backgroundColor: theme.colors.lime, alignItems: "center", justifyContent: "center", ...theme.shadows.elevated },
  sendBtnDisabled: { opacity: 0.4, elevation: 0, shadowOpacity: 0 },
  sendBtnStop: { backgroundColor: theme.colors.danger },
  headerModelRow: { flexDirection: "row", alignItems: "center", gap: 4 },
  modelOverlay: { position: "absolute", top: 0, left: 0, right: 0, bottom: 0, backgroundColor: "rgba(0,0,0,0.35)", justifyContent: "flex-end", zIndex: 999 },
  modelSheet: { backgroundColor: theme.colors.card, borderTopLeftRadius: 20, borderTopRightRadius: 20, paddingHorizontal: theme.spacing.xl, paddingBottom: theme.spacing.xxxl, paddingTop: theme.spacing.lg, maxHeight: "75%" },
  modelSheetHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: theme.spacing.xs },
  modelSheetTitle: { ...theme.typography.titleLg, color: theme.colors.ink },
  modelSheetSub: { ...theme.typography.caption, color: theme.colors.muted, marginBottom: theme.spacing.lg, lineHeight: 18 },
  modelRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingVertical: theme.spacing.md, paddingHorizontal: theme.spacing.md, borderRadius: theme.radii.md, backgroundColor: theme.colors.bg, marginBottom: theme.spacing.sm },
  modelRowActive: { borderWidth: 1.5, borderColor: theme.colors.primary, backgroundColor: `${theme.colors.primary}08` },
  modelRowDisabled: { opacity: 0.45 },
  modelRowInfo: { flex: 1 },
  modelRowName: { ...theme.typography.bodyMd, color: theme.colors.ink, fontFamily: "Nunito_600SemiBold", fontWeight: "600" },
  modelRowTitleRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  modelRecommendedBadge: { backgroundColor: `${theme.colors.success}18`, borderRadius: theme.radii.pill, paddingHorizontal: 6, paddingVertical: 2 },
  modelRecommendedText: { ...theme.typography.legal, color: theme.colors.success, fontSize: 9, letterSpacing: 0.3 },
  modelRowSize: { ...theme.typography.legal, color: theme.colors.muted, marginTop: 2 },
  modelRowSpeedGood: { color: theme.colors.success },
  modelTestBtn: { marginTop: 6, alignSelf: "flex-start" },
  modelTestText: { ...theme.typography.legal, color: theme.colors.info, fontFamily: "Nunito_600SemiBold", fontWeight: "600" },
  modelActiveBadge: { width: 32, height: 32, borderRadius: 16, backgroundColor: `${theme.colors.success}15`, alignItems: "center", justifyContent: "center" },
  modelDownloadBtn: { width: 32, height: 32, borderRadius: 16, backgroundColor: `${theme.colors.primary}10`, alignItems: "center", justifyContent: "center" },
  // ── Streaming bubble ─────────────────────────────────────────
  streamingRow: { flexDirection: "row", gap: 10, marginBottom: 12 },
  streamingAvatar: { width: 32, height: 32, borderRadius: 16, backgroundColor: theme.colors.surfaceElevated, borderWidth: 1, borderColor: theme.colors.border, alignItems: "center", justifyContent: "center", alignSelf: "flex-end" },
  streamingBubble: { maxWidth: "78%", backgroundColor: theme.colors.card, borderRadius: 22, borderBottomLeftRadius: 6, borderWidth: 1, borderColor: theme.colors.border, paddingHorizontal: 16, paddingVertical: 12, ...theme.shadows.cardSoft },
  streamingText: { fontSize: 15, lineHeight: 22, color: theme.colors.ink, fontFamily: "Nunito_400Regular", fontWeight: "400" },
  streamingCursor: { color: theme.colors.danger, fontFamily: "Nunito_700Bold", fontWeight: "700" },
});

// Akosian
// Copyright (C) 2026 Pranesh Shivaraj
//
// This program is free software: you can redistribute it and/or modify
// it under the terms of the GNU General Public License as published by
// the Free Software Foundation, either version 3 of the License, or
// (at your option) any later version.

/**
 * Picks the best local model a device can actually run at a usable speed, and
 * applies it when doing so is unambiguous.
 *
 * Two-stage on purpose, because neither stage is trustworthy alone:
 *
 * 1. **Specs prior** — total RAM and free storage. Cheap, needs no download, and
 *    reliably rules hardware out ("this phone cannot hold a 7B model"). It
 *    cannot rule hardware *in*: llama.cpp throughput is dominated by Metal/
 *    OpenCL offload and by thermal/memory throttling, none of which any Expo API
 *    exposes (there is no core count, clock, GPU or NPU reading available to
 *    JavaScript here). Treating RAM as a speed prediction would be a guess with
 *    roughly 2x error.
 *
 * 2. **Real measurement** — `benchmarkModel()` runs an actual generation on the
 *    device and reads llama.cpp's own tok/s back. That is ground truth, and it
 *    accounts for offload and throttling for free. It needs the model already
 *    downloaded, so it refines the prior rather than replacing it.
 *
 * A phone whose OS ships an NPU-backed system model (Apple Foundation Model,
 * Gemini Nano) skips both stages: the fastest engine is already there and
 * nothing is downloaded.
 *
 * The decision table itself is pure and lives in `./localModelPolicy.ts`.
 * Measurements are cached per device signature, so a hardware or OS change
 * invalidates them instead of carrying a stale number forward.
 */

import { Platform } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Device from "expo-device";
import * as FileSystem from "expo-file-system/legacy";
import { appleBuiltinProvider } from "./providers/appleBuiltin";
import { geminiNanoProvider } from "./providers/geminiNano";
import {
  AVAILABLE_MODELS,
  benchmarkModel,
  getSelectedModelId,
  hasStoredModelSelection,
  isModelDownloaded,
  setSelectedModelId,
  type LlamaModel,
  type ModelSpeed,
} from "./providers/llamaProvider";
import {
  FAST_ENOUGH_TPS,
  TOO_SLOW_TPS,
  modelFitsDevice as modelFitsCapabilities,
  recommendFromDevice,
  type DeviceCapabilities,
  type ModelSpec,
  type RecommendationBasis,
} from "./localModelPolicy";

export { FAST_ENOUGH_TPS, TOO_SLOW_TPS };
export type { RecommendationBasis };

const SPEED_CACHE_KEY = "llama_model_speed_v1";
const MANUAL_OVERRIDE_KEY = "llama_model_manual_override";

export interface DeviceProfile extends DeviceCapabilities {
  platform: "ios" | "android";
  /**
   * CPU ABIs the OS reports. Included for transparency only — it is an
   * architecture string, not a performance measurement, so nothing here is
   * decided from it.
   */
  cpuArchitectures: string[];
  /** Changes when the hardware/OS does, invalidating cached measurements. */
  signature: string;
}

export interface LocalModelRecommendation {
  basis: RecommendationBasis;
  /** null when the system model is the answer — nothing to download. */
  modelId: string | null;
  modelName: string | null;
  /** Download size for `modelId`, or null when nothing needs downloading. */
  downloadBytes: number | null;
  /** Measured decode speed for the recommended model, when one exists. */
  tokensPerSecond: number | null;
  /** Models that fit this device, ascending by capability. */
  candidates: LlamaModel[];
  /** User-facing, and explicit about whether a number was measured. */
  reason: string;
}

interface SpeedEntry extends ModelSpeed {
  signature: string;
  measuredAt: number;
}

async function getFreeDiskBytes(): Promise<number | null> {
  try {
    const free = await (FileSystem as any).getFreeDiskStorageAsync?.();
    return typeof free === "number" && Number.isFinite(free) && free > 0 ? free : null;
  } catch {
    return null;
  }
}

function getTotalRamBytes(): number | null {
  try {
    const mem = (Device as any).totalMemory;
    return typeof mem === "number" && Number.isFinite(mem) && mem > 0 ? mem : null;
  } catch {
    return null;
  }
}

export async function getDeviceProfile(): Promise<DeviceProfile> {
  const platform: "ios" | "android" = Platform.OS === "ios" ? "ios" : "android";
  const totalRamBytes = getTotalRamBytes();
  const freeDiskBytes = await getFreeDiskBytes();
  const isRealDevice = Device.isDevice !== false;
  const osLabel =
    Device.osName && Device.osVersion
      ? `${Device.osName} ${Device.osVersion}`
      : platform === "ios"
        ? "iOS"
        : "Android";
  const cpuArchitectures = Array.isArray((Device as any).supportedCpuArchitectures)
    ? ((Device as any).supportedCpuArchitectures as string[])
    : [];

  return {
    platform,
    deviceName: Device.modelName ?? (isRealDevice ? "This device" : "Simulator"),
    osLabel,
    isRealDevice,
    totalRamBytes,
    freeDiskBytes,
    cpuArchitectures,
    // Hardware identity, not the install: a restored backup on a different phone
    // must not inherit the old phone's measured speed.
    signature: [
      platform,
      Device.modelName ?? "unknown",
      Device.osVersion ?? "?",
      totalRamBytes ?? 0,
    ].join("|"),
  };
}

/** True when this model fits the device's memory and free storage. */
export function modelFitsDevice(model: LlamaModel, profile: DeviceProfile): boolean {
  return modelFitsCapabilities(model as ModelSpec, profile);
}

// ── Measured-speed cache ────────────────────────────────────────────────────

async function readSpeedCache(): Promise<Record<string, SpeedEntry>> {
  try {
    const raw = await AsyncStorage.getItem(SPEED_CACHE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

/** Every measurement taken on this exact hardware, for display in the picker. */
export async function getCachedSpeeds(
  profile?: DeviceProfile
): Promise<Record<string, ModelSpeed>> {
  const p = profile ?? (await getDeviceProfile());
  const cache = await readSpeedCache();
  const out: Record<string, ModelSpeed> = {};
  for (const [modelId, entry] of Object.entries(cache)) {
    if (entry?.signature !== p.signature) continue;
    out[modelId] = {
      modelId,
      tokensPerSecond: entry.tokensPerSecond,
      promptTokensPerSecond: entry.promptTokensPerSecond,
      sampledTokens: entry.sampledTokens,
    };
  }
  return out;
}

export async function getCachedSpeed(
  modelId: string,
  profile?: DeviceProfile
): Promise<ModelSpeed | null> {
  return (await getCachedSpeeds(profile))[modelId] ?? null;
}

/**
 * Runs a real benchmark and stores it. Returns null when the model isn't
 * downloaded or the run was inconclusive — never a fabricated number.
 */
export async function measureModelSpeed(
  modelId: string,
  profile?: DeviceProfile
): Promise<ModelSpeed | null> {
  const p = profile ?? (await getDeviceProfile());
  const speed = await benchmarkModel(modelId);
  if (!speed) return null;
  try {
    const cache = await readSpeedCache();
    cache[modelId] = { ...speed, signature: p.signature, measuredAt: Date.now() };
    await AsyncStorage.setItem(SPEED_CACHE_KEY, JSON.stringify(cache));
  } catch {
    // A phone that can't persist the result can still use it this session.
  }
  return speed;
}

// ── Manual override bookkeeping ─────────────────────────────────────────────

/** Called when the user picks a model themselves, so nothing silently moves it. */
export async function markManualModelChoice(): Promise<void> {
  try {
    await AsyncStorage.setItem(MANUAL_OVERRIDE_KEY, "true");
  } catch {}
}

export async function hasManualModelChoice(): Promise<boolean> {
  try {
    return (await AsyncStorage.getItem(MANUAL_OVERRIDE_KEY)) === "true";
  } catch {
    return false;
  }
}

async function clearManualModelChoice(): Promise<void> {
  try {
    await AsyncStorage.removeItem(MANUAL_OVERRIDE_KEY);
  } catch {}
}

// ── Recommendation ──────────────────────────────────────────────────────────

async function getSystemModel(): Promise<{ available: boolean; name: string | null }> {
  try {
    if (await appleBuiltinProvider.isAvailable()) {
      return { available: true, name: "Apple Foundation Model" };
    }
  } catch {}
  try {
    if (await geminiNanoProvider.isAvailable()) {
      return { available: true, name: "Gemini Nano" };
    }
  } catch {}
  return { available: false, name: null };
}

/**
 * The device's best model for the speed it can sustain. Specs set the ceiling;
 * a cached measurement decides whether the device can actually hold that rung.
 */
export async function recommendLocalModel(
  profileArg?: DeviceProfile
): Promise<LocalModelRecommendation> {
  const profile = profileArg ?? (await getDeviceProfile());
  const [systemModel, speeds] = await Promise.all([
    getSystemModel(),
    getCachedSpeeds(profile),
  ]);

  const policy = recommendFromDevice({
    caps: profile,
    models: AVAILABLE_MODELS as ModelSpec[],
    systemModel,
    speeds: Object.fromEntries(
      Object.entries(speeds).map(([id, speed]) => [id, speed.tokensPerSecond])
    ),
  });

  const candidates = policy.candidateIds
    .map((id) => AVAILABLE_MODELS.find((m) => m.id === id))
    .filter((m): m is LlamaModel => !!m);

  return {
    basis: policy.basis,
    modelId: policy.modelId,
    modelName: policy.modelName,
    downloadBytes: policy.downloadBytes,
    tokensPerSecond: policy.tokensPerSecond,
    candidates,
    reason: policy.reason,
  };
}

// ── Applying a recommendation ───────────────────────────────────────────────

export interface ApplyResult {
  applied: boolean;
  modelId: string;
  /** True when applying it will require a download before it can run. */
  needsDownload: boolean;
}

/**
 * Moves the selected model to the recommendation, but only when that is
 * unambiguous:
 *
 * - never over a manual choice the user made themselves;
 * - on a first run (no stored selection), start on the recommended rung even
 *   when that means downloading it;
 * - after a selection exists, never trigger a surprise multi-GB download;
 * - always when the current selection cannot physically run here, because
 *   leaving that in place would fail on first use.
 *
 * Everything else is surfaced in the UI with a one-tap apply instead of being
 * decided silently.
 */
export async function applyRecommendationAutomatically(
  recommendation?: LocalModelRecommendation
): Promise<ApplyResult | null> {
  const profile = await getDeviceProfile();
  if (!profile.isRealDevice) return null;
  if (await hasManualModelChoice()) return null;

  const rec = recommendation ?? (await recommendLocalModel(profile));
  if (!rec.modelId) return null;

  const currentId = await getSelectedModelId();
  if (currentId === rec.modelId) return null;

  const currentModel = AVAILABLE_MODELS.find((m) => m.id === currentId) ?? null;
  const currentUnusable = currentModel != null && !modelFitsDevice(currentModel, profile);
  const recommendedDownloaded = await isModelDownloaded(rec.modelId);
  // A first run has no stored pick at all. Existing installs that never moved
  // off the safe-default smallest rung are treated the same way, so a phone
  // that has always been on 0.5B gets the model its hardware actually supports
  // instead of staying there forever.
  const firstRun =
    !(await hasStoredModelSelection()) || currentId === AVAILABLE_MODELS[0].id;

  if (!currentUnusable && !recommendedDownloaded && !firstRun) return null;

  await setSelectedModelId(rec.modelId);
  // An automatic correction must not latch as if the user chose it.
  await clearManualModelChoice();
  return { applied: true, modelId: rec.modelId, needsDownload: !recommendedDownloaded };
}

// ── Picker view-model ───────────────────────────────────────────────────────

export interface ModelPickerRow {
  model: LlamaModel;
  recommended: boolean;
  /** False when this model exceeds the device's memory or free storage. */
  fits: boolean;
  /** Measured on this device, or null when never measured here. */
  speed: ModelSpeed | null;
}

/**
 * Everything the model pickers need in one read: the ladder annotated with
 * fitness, measured speed, and which rung is recommended.
 */
export async function getModelPickerRows(): Promise<{
  profile: DeviceProfile;
  recommendation: LocalModelRecommendation;
  manual: boolean;
  rows: ModelPickerRow[];
}> {
  const profile = await getDeviceProfile();
  const [recommendation, speeds, manual] = await Promise.all([
    recommendLocalModel(profile),
    getCachedSpeeds(profile),
    hasManualModelChoice(),
  ]);

  return {
    profile,
    recommendation,
    manual,
    rows: AVAILABLE_MODELS.map((model) => ({
      model,
      recommended: model.id === recommendation.modelId,
      fits: modelFitsDevice(model, profile),
      speed: speeds[model.id] ?? null,
    })),
  };
}

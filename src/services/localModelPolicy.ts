// Akosian
// Copyright (C) 2026 Pranesh Shivaraj
//
// This program is free software: you can redistribute it and/or modify
// it under the terms of the GNU General Public License as published by
// the Free Software Foundation, either version 3 of the License, or
// (at your option) any later version.

/**
 * The recommendation policy, with no imports.
 *
 * Everything here is a pure function of explicit inputs, deliberately separated
 * from `./localModel.ts` (which owns the device-reading, benchmarking and
 * caching). Keeping the decision this side of the boundary is what makes the
 * branch table — specs prior, measured step-down, measured step-up — checkable
 * without a phone.
 *
 * Thresholds and the reasoning behind the two-stage approach are documented in
 * `./localModel.ts`.
 */

/** Decode speed at or above which a reply feels like a reply, not a wait. */
export const FAST_ENOUGH_TPS = 8;
/** Below this, a different option is kinder than waiting. */
export const TOO_SLOW_TPS = 4;

/** Free storage kept for everything that isn't the model file. */
export const DISK_RESERVE_BYTES = 512 * 1024 * 1024;

/** Structural shape of a model rung — satisfied by `LlamaModel`. */
export interface ModelSpec {
  id: string;
  name: string;
  size: string;
  bytes: number;
  minRamBytes: number;
  quality: number;
}

/** What the policy needs to know about the device. */
export interface DeviceCapabilities {
  deviceName: string;
  osLabel: string;
  /** False on simulators/emulators, where nothing here can be trusted. */
  isRealDevice: boolean;
  totalRamBytes: number | null;
  freeDiskBytes: number | null;
}

export type RecommendationBasis = "system-model" | "specs" | "measured";

export interface PolicyRecommendation {
  basis: RecommendationBasis;
  /** null when the system model is the answer, or when nothing fits. */
  modelId: string | null;
  modelName: string | null;
  downloadBytes: number | null;
  /** Measured decode speed for the recommendation, when one exists. */
  tokensPerSecond: number | null;
  /** Ids of the models that fit, ascending by capability. */
  candidateIds: string[];
  reason: string;
}

const GB = 1024 * 1024 * 1024;

/**
 * Fits = the device has the memory the rung needs and the storage to hold it
 * with room to spare. Unknown readings never exclude a rung: refusing to
 * recommend anything because a value couldn't be read is worse than trying.
 */
export function modelFitsDevice(model: ModelSpec, caps: DeviceCapabilities): boolean {
  if (caps.totalRamBytes != null && model.minRamBytes > caps.totalRamBytes) {
    return false;
  }
  if (caps.freeDiskBytes != null && model.bytes + DISK_RESERVE_BYTES > caps.freeDiskBytes) {
    return false;
  }
  return true;
}

function formatGB(bytes: number): string {
  return `${(bytes / GB).toFixed(1)} GB`;
}

/**
 * The branch table, in order:
 *
 * 1. an NPU-backed system model exists → use it, download nothing;
 * 2. nothing fits → say so, and point at BYOK rather than a broken download;
 * 3. the top fitting rung was measured fast → keep it;
 * 4. it was measured but is too slow → step down to a proven rung, or the
 *    smallest fitting rung when nothing else is proven;
 * 5. another fitting rung is proven fast → prefer proven over unproven;
 * 6. nothing measured → recommend the largest that fits, labelled a specs
 *    prediction so the UI never presents a guess as a result.
 *
 * Memory is the exception to (6): with no RAM reading nothing can be shown to
 * fit, so the smallest rung is the recommendation — never the largest.
 */
export function recommendFromDevice(input: {
  caps: DeviceCapabilities;
  models: ModelSpec[];
  systemModel: { available: boolean; name: string | null };
  /** Measured tok/s by model id, for this exact hardware. */
  speeds: Record<string, number>;
}): PolicyRecommendation {
  const { caps, models, systemModel, speeds } = input;

  if (systemModel.available) {
    const name = systemModel.name ?? "the system model";
    return {
      basis: "system-model",
      modelId: null,
      modelName: name,
      downloadBytes: null,
      tokensPerSecond: null,
      candidateIds: [],
      reason: `${name} is built into this device, so local AI runs on the system's own small model with nothing to download.`,
    };
  }

  // Ascending by capability, so the last entry is the ceiling.
  const candidates = models
    .filter((m) => modelFitsDevice(m, caps))
    .slice()
    .sort((a, b) => a.quality - b.quality);
  const candidateIds = candidates.map((m) => m.id);

  if (!candidates.length) {
    return {
      basis: "specs",
      modelId: null,
      modelName: null,
      downloadBytes: null,
      tokensPerSecond: null,
      candidateIds,
      reason:
        caps.totalRamBytes == null && caps.freeDiskBytes == null
          ? "We couldn't read this device's memory or free storage, so there is no model we can recommend downloading. Bring your own key for a dependable setup on this phone."
          : "No local model fits this device's memory and free storage. Free up space, or bring your own key instead.",
    };
  }

  const proven = candidates.filter((m) => (speeds[m.id] ?? 0) >= FAST_ENOUGH_TPS);
  const provenBest = proven.length ? proven[proven.length - 1] : null;

  if (caps.totalRamBytes == null) {
    // No memory reading, so `modelFitsDevice` excluded nothing and every rung
    // "fits". Recommending the largest would be the worst possible answer — it
    // would hand the heaviest model to the device we know least about. The
    // lightest rung is the only defensible pick, unless a rung was actually
    // measured fast here, which is better evidence than the missing reading.
    const pick = provenBest ?? candidates[0];
    const tps = speeds[pick.id] ?? null;
    // Name only the readings that were actually missing.
    const missing = [
      caps.totalRamBytes == null ? "memory" : null,
      caps.freeDiskBytes == null ? "free storage" : null,
    ].filter(Boolean) as string[];
    const missingLabel = missing.length > 1 ? "memory or free storage" : missing[0];
    return {
      basis: tps != null ? "measured" : "specs",
      modelId: pick.id,
      modelName: pick.name,
      downloadBytes: pick.bytes,
      tokensPerSecond: tps,
      candidateIds,
      reason:
        tps != null
          ? `${pick.name} measured ${tps} tok/s on this device, so it's the pick — we couldn't read this device's memory to size anything larger safely.`
          : `We couldn't read this device's ${missingLabel}, so we're suggesting the smallest rung (${pick.name}). Run a speed test once it's downloaded, and only try a larger model if it stays fast.`,
    };
  }

  const ceiling = candidates[candidates.length - 1];
  const ceilingTps = speeds[ceiling.id] ?? null;

  if (ceilingTps != null && ceilingTps >= FAST_ENOUGH_TPS) {
    return {
      basis: "measured",
      modelId: ceiling.id,
      modelName: ceiling.name,
      downloadBytes: ceiling.bytes,
      tokensPerSecond: ceilingTps,
      candidateIds,
      reason: `${ceiling.name} is the largest model this device can hold, and it measured ${ceilingTps} tok/s here — comfortably fast enough.`,
    };
  }

  if (ceilingTps != null && ceilingTps < TOO_SLOW_TPS) {
    const better = provenBest ?? candidates[0];
    if (better.id !== ceiling.id) {
      const betterTps = speeds[better.id] ?? null;
      return {
        basis: "measured",
        modelId: better.id,
        modelName: better.name,
        downloadBytes: better.bytes,
        tokensPerSecond: betterTps,
        candidateIds,
        reason:
          betterTps != null
            ? `${ceiling.name} fits this device's memory but only measured ${ceilingTps} tok/s, which is too slow to chat with. ${better.name} measured ${betterTps} tok/s here.`
            : `${ceiling.name} fits this device's memory but only measured ${ceilingTps} tok/s, which is too slow to chat with. ${better.name} is the lightest model that fits — worth measuring next.`,
      };
    }
    return {
      basis: "measured",
      modelId: ceiling.id,
      modelName: ceiling.name,
      downloadBytes: ceiling.bytes,
      tokensPerSecond: ceilingTps,
      candidateIds,
      reason: `${ceiling.name} is the only model this device can hold, and it measured ${ceilingTps} tok/s here — usable, but expect slow replies. Your own key will feel much faster.`,
    };
  }

  if (ceilingTps != null) {
    // Between the thresholds: it works, it just isn't quick.
    return {
      basis: "measured",
      modelId: ceiling.id,
      modelName: ceiling.name,
      downloadBytes: ceiling.bytes,
      tokensPerSecond: ceilingTps,
      candidateIds,
      reason: `${ceiling.name} measured ${ceilingTps} tok/s on this device — it works, but replies may feel slow.`,
    };
  }

  // The ceiling is unmeasured, but a smaller rung is already proven here.
  if (provenBest && provenBest.id !== ceiling.id) {
    const provenTps = speeds[provenBest.id] ?? null;
    return {
      basis: "measured",
      modelId: provenBest.id,
      modelName: provenBest.name,
      downloadBytes: provenBest.bytes,
      tokensPerSecond: provenTps,
      candidateIds,
      reason: `${provenBest.name} already measured ${provenTps} tok/s on this device. ${ceiling.name} fits the specs too, but it hasn't been measured here, so we're not recommending it yet.`,
    };
  }

  return {
    basis: "specs",
    modelId: ceiling.id,
    modelName: ceiling.name,
    downloadBytes: ceiling.bytes,
    tokensPerSecond: null,
    candidateIds,
    reason: `On ${formatGB(caps.totalRamBytes ?? 0)} of RAM, ${ceiling.name} is the largest model that fits. Download it and run a speed test — the measured result, not the specs, decides from there.`,
  };
}

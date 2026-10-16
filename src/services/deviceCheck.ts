// Akosian
// Copyright (C) 2026 Pranesh Shivaraj
//
// This program is free software: you can redistribute it and/or modify
// it under the terms of the GNU General Public License as published by
// the Free Software Foundation, either version 3 of the License, or
// (at your option) any later version.

// Device readiness check for on-device ("local") AI. Local AI can run through
// three different engines depending on the phone — a system model (Apple
// Foundation / Gemini Nano, no download) or a downloaded llama.cpp model from
// the ladder in `providers/llamaProvider.ts`. This check figures out which
// engine the phone would use, measures what it can, and returns the verdict plus
// the model recommendation the AI-choice screen shows before the user commits.
//
// The recommendation itself lives in `./localModel.ts`, which is explicit about
// what was measured versus inferred.

import {
  FAST_ENOUGH_TPS,
  getDeviceProfile,
  recommendLocalModel,
  type DeviceProfile,
  type LocalModelRecommendation,
} from "./localModel";

export type LocalAIVerdict = "great" | "ok" | "poor" | "unknown";

export interface DeviceSpecRow {
  label: string;
  value: string;
  /** true = passes, false = fails, null = couldn't be measured */
  ok: boolean | null;
}

export interface LocalAIReadiness {
  verdict: LocalAIVerdict;
  headline: string;
  detail: string;
  engine: string;
  specs: DeviceSpecRow[];
  /** What this device should actually run. */
  recommended: LocalModelRecommendation;
  profile: DeviceProfile;
}

const GB = 1024 * 1024 * 1024;

function formatGB(bytes: number | null): string {
  if (bytes == null || !Number.isFinite(bytes) || bytes <= 0) return "Unknown";
  return `${(bytes / GB).toFixed(1)} GB`;
}

function verdictForLlama(
  totalMemBytes: number | null,
  freeDiskBytes: number | null
): LocalAIVerdict {
  const ramGB = totalMemBytes != null ? totalMemBytes / GB : null;
  const diskGB = freeDiskBytes != null ? freeDiskBytes / GB : null;
  if (ramGB == null && diskGB == null) return "unknown";
  // The smallest rung needs roughly 1.5 GB of free RAM at runtime plus ~400 MB
  // of storage; treat 4 GB total RAM / 1 GB free disk as the floor for "works".
  const ramScore = ramGB == null ? 1 : ramGB >= 6 ? 2 : ramGB >= 4 ? 1 : 0;
  const diskScore = diskGB == null ? 1 : diskGB >= 2 ? 2 : diskGB >= 1 ? 1 : 0;
  const worst = Math.min(ramScore, diskScore);
  return worst === 2 ? "great" : worst === 1 ? "ok" : "poor";
}

const COPY: Record<LocalAIVerdict, { headline: string; detail: string }> = {
  great: {
    headline: "Good news — local AI should run well on this device",
    detail:
      "You can proceed. Expect answers within a few seconds. The on-device model is still smaller and less capable than a cloud model, so complex requests may be simpler or slower than with your own API key.",
  },
  ok: {
    headline: "Local AI should work, but expect it to feel slow",
    detail:
      "You can proceed, but answers may take noticeably longer and struggle with complex multi-step requests. If that frustrates you, your own API key will feel much faster and smarter on this phone.",
  },
  poor: {
    headline: "This device will likely struggle with local AI",
    detail:
      "We don't recommend proceeding — the model may be very slow, run out of memory, or fail to download. Your own API key (or skipping AI) will give you a much better experience on this phone.",
  },
  unknown: {
    headline: "We couldn't fully measure this device",
    detail:
      "You can still try local AI — the app will attempt setup and tell you if it fails. If it feels slow or fails to download, switch to your own API key instead.",
  },
};

export async function checkLocalAIReadiness(): Promise<LocalAIReadiness> {
  const profile = await getDeviceProfile();
  const recommended = await recommendLocalModel(profile);

  // 1. System-model fast path — no download, no heavy RAM need.
  if (recommended.basis === "system-model") {
    return {
      verdict: "great",
      headline: "Good news — local AI should run well on this device",
      detail: `${recommended.reason} You can proceed.`,
      engine: `${recommended.modelName} (built in)`,
      specs: [
        { label: "Device", value: profile.deviceName, ok: true },
        { label: "OS", value: profile.osLabel, ok: true },
        { label: "Engine", value: "System model · no download", ok: true },
      ],
      recommended,
      profile,
    };
  }

  // 2. Downloaded-model path — memory + storage gate it, measurement decides.
  const ramGB = profile.totalRamBytes != null ? profile.totalRamBytes / GB : null;
  const diskGB = profile.freeDiskBytes != null ? profile.freeDiskBytes / GB : null;
  const verdict: LocalAIVerdict =
    !profile.isRealDevice
      ? "unknown"
      : recommended.modelId == null
        ? "poor"
        : verdictForLlama(profile.totalRamBytes, profile.freeDiskBytes);
  const copy = COPY[verdict];

  const specs: DeviceSpecRow[] = [
    { label: "Device", value: profile.deviceName, ok: null },
    { label: "OS", value: profile.osLabel, ok: null },
    {
      label: "Memory (RAM)",
      value: formatGB(profile.totalRamBytes),
      ok: ramGB == null ? null : ramGB >= 4,
    },
    {
      label: "Free storage",
      value: formatGB(profile.freeDiskBytes),
      ok: diskGB == null ? null : diskGB >= 1,
    },
  ];

  if (recommended.modelId && recommended.modelName) {
    specs.push({
      label: "Best model here",
      // Naming the rung is what makes the recommendation checkable rather than
      // a bare verdict.
      value: `${recommended.modelName} · ${recommended.downloadBytes ? formatBytes(recommended.downloadBytes) : "—"}`,
      ok: true,
    });
  }

  // Only ever shown when measured — a specs guess is never dressed up as a
  // result.
  if (recommended.tokensPerSecond != null) {
    specs.push({
      label: "Measured speed",
      value: `${recommended.tokensPerSecond} tok/s`,
      ok: recommended.tokensPerSecond >= FAST_ENOUGH_TPS,
    });
  }

  return {
    verdict,
    headline: copy.headline,
    detail: profile.isRealDevice
      ? `${copy.detail}\n\n${recommended.reason}`
      : "This looks like a simulator or emulator, so the measurements aren't from a real phone. Check again on your actual device before deciding.",
    engine: recommended.modelName
      ? `${recommended.modelName} (downloaded)`
      : "No local model fits this device",
    specs,
    recommended,
    profile,
  };
}

function formatBytes(bytes: number): string {
  if (bytes >= GB) return `${(bytes / GB).toFixed(1)} GB`;
  return `${Math.round(bytes / (1024 * 1024))} MB`;
}

// Akosian
// Copyright (C) 2026 Pranesh Shivaraj
//
// This program is free software: you can redistribute it and/or modify
// it under the terms of the GNU General Public License as published by
// the Free Software Foundation, either version 3 of the License, or
// (at your option) any later version.

// Device readiness check for on-device ("local") AI. Local AI can run through
// three different engines depending on the phone — a system model (Apple
// Foundation / Gemini Nano, no download) or a downloaded llama.cpp model
// (Qwen 0.5B ~400 MB, Llama 1B ~700 MB). This check figures out which engine
// the phone would use, measures RAM + free storage, and returns an honest
// verdict the AI-choice screen shows before the user commits.

import { Platform } from "react-native";
import * as Device from "expo-device";
import * as FileSystem from "expo-file-system/legacy";
import { appleBuiltinProvider } from "./providers/appleBuiltin";
import { geminiNanoProvider } from "./providers/geminiNano";

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
}

const GB = 1024 * 1024 * 1024;

function formatGB(bytes: number | null): string {
  if (bytes == null || !Number.isFinite(bytes) || bytes <= 0) return "Unknown";
  return `${(bytes / GB).toFixed(1)} GB`;
}

async function getFreeDiskBytes(): Promise<number | null> {
  try {
    const free = await (FileSystem as any).getFreeDiskStorageAsync?.();
    return typeof free === "number" && Number.isFinite(free) ? free : null;
  } catch {
    return null;
  }
}

function verdictForLlama(totalMemBytes: number | null, freeDiskBytes: number | null): LocalAIVerdict {
  const ramGB = totalMemBytes != null ? totalMemBytes / GB : null;
  const diskGB = freeDiskBytes != null ? freeDiskBytes / GB : null;
  if (ramGB == null && diskGB == null) return "unknown";
  // Qwen 0.5B needs roughly 1–1.5 GB of free RAM at runtime plus ~400 MB of
  // storage; treat 4 GB total RAM / 1 GB free disk as the floor for "works".
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
  const specs: DeviceSpecRow[] = [];
  const deviceName = Device.modelName ?? (Device.isDevice ? "Your device" : "Simulator");
  const osLabel =
    Device.osName && Device.osVersion ? `${Device.osName} ${Device.osVersion}` : Platform.OS === "ios" ? "iOS" : "Android";

  // 1. System-model fast path — no download, no heavy RAM need.
  try {
    if (await appleBuiltinProvider.isAvailable()) {
      return {
        verdict: "great",
        headline: "Good news — local AI should run well on this device",
        detail:
          "Your iPhone supports the built-in Apple Foundation Model, so local AI runs through the system with no large download. You can proceed.",
        engine: "Apple Foundation Model (built in)",
        specs: [
          { label: "Device", value: deviceName, ok: true },
          { label: "OS", value: osLabel, ok: true },
          { label: "Engine", value: "System model · no download", ok: true },
        ],
      };
    }
  } catch {}
  try {
    if (await geminiNanoProvider.isAvailable()) {
      return {
        verdict: "great",
        headline: "Good news — local AI should run well on this device",
        detail:
          "Your phone supports the built-in Gemini Nano model, so local AI runs through the system with no large download. You can proceed.",
        engine: "Gemini Nano (built in)",
        specs: [
          { label: "Device", value: deviceName, ok: true },
          { label: "OS", value: osLabel, ok: true },
          { label: "Engine", value: "System model · no download", ok: true },
        ],
      };
    }
  } catch {}

  // 2. Downloaded-model path (llama.cpp) — RAM + storage decide everything.
  const [totalMem, freeDisk] = await Promise.all([
    Promise.resolve().then(() => {
      const mem = (Device as any).totalMemory;
      return typeof mem === "number" && Number.isFinite(mem) && mem > 0 ? mem : null;
    }),
    getFreeDiskBytes(),
  ]);

  const ramGB = totalMem != null ? totalMem / GB : null;
  const diskGB = freeDisk != null ? freeDisk / GB : null;
  const verdict = Device.isDevice === false ? "unknown" : verdictForLlama(totalMem, freeDisk);
  const copy = COPY[verdict];

  specs.push({
    label: "Device",
    value: deviceName,
    ok: null,
  });
  specs.push({
    label: "OS",
    value: osLabel,
    ok: null,
  });
  specs.push({
    label: "Memory (RAM)",
    value: formatGB(totalMem),
    ok: ramGB == null ? null : ramGB >= 4,
  });
  specs.push({
    label: "Free storage",
    value: formatGB(freeDisk),
    ok: diskGB == null ? null : diskGB >= 1,
  });
  specs.push({
    label: "Engine",
    value: "Qwen 0.5B · ~400 MB download",
    ok: null,
  });

  return {
    verdict,
    headline: copy.headline,
    detail:
      Device.isDevice === false
        ? "This looks like a simulator or emulator, so the measurements aren't from a real phone. Check again on your actual device before deciding."
        : copy.detail,
    engine: "Qwen 2.5 0.5B (downloaded)",
    specs,
  };
}

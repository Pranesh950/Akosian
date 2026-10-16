// Akosian
// Copyright (C) 2026 Pranesh Shivaraj
//
// This program is free software: you can redistribute it and/or modify
// it under the terms of the GNU General Public License as published by
// the Free Software Foundation, either version 3 of the License, or
// (at your option) any later version.

import { Platform } from "react-native";
import * as FileSystem from "expo-file-system/legacy";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { LLMProvider, ChatMessage, LLMResponse } from "./types";
import { parseProviderResponse } from "./parseToolResponse";

export interface LlamaModel {
  id: string;
  name: string;
  size: string;
  url: string;
  filename: string;
  /** Parameter count, e.g. "3B" — what the model is usually described by. */
  params: string;
  /** Exact GGUF size in bytes (verified against the host's content-length). */
  bytes: number;
  /**
   * Total device RAM this model should only be attempted on. Deliberately
   * expressed against TOTAL RAM rather than free RAM, because total is what the
   * app can actually measure (`Device.totalMemory`) and a phone never hands an
   * app its whole memory — roughly half stays with the OS. A 4 GB phone
   * therefore has ~2 GB usable, which is why the 0.5B rung starts there rather
   * than at its ~950 MB runtime footprint.
   */
  minRamBytes: number;
  /** Capability rank; higher is smarter. Used to pick the best model that still
   *  runs fast enough, not as a hard ordering of the list. */
  quality: number;
}

const GB = 1024 * 1024 * 1024;

/**
 * The local model ladder, ascending by capability — `AVAILABLE_MODELS[0]` stays
 * the safest default for a device the recommender has not measured yet.
 *
 * Only llama.cpp (CPU/GPU) models live here. Phones whose OS ships an
 * NPU-backed system model (Apple Foundation Model, Gemini Nano) run that
 * instead and download nothing — see `src/services/localModel.ts`.
 *
 * Every `bytes` value is the host's real content-length; every rung has been
 * reachable when this list was written. Rungs are intentionally spaced ~2x
 * apart in capability so a recommendation has something meaningful to step
 * up or down to.
 */
export const AVAILABLE_MODELS: LlamaModel[] = [
  {
    id: "qwen-0.5b",
    name: "Qwen 2.5 0.5B",
    size: "~379 MB",
    url: "https://huggingface.co/bartowski/Qwen2.5-0.5B-Instruct-GGUF/resolve/main/Qwen2.5-0.5B-Instruct-Q4_K_M.gguf",
    filename: "qwen2.5-0.5b-q4_k_m.gguf",
    params: "0.5B",
    bytes: 397_808_192,
    minRamBytes: 4 * GB,
    quality: 10,
  },
  {
    id: "llama-1b",
    name: "Llama 3.2 1B",
    size: "~770 MB",
    url: "https://huggingface.co/bartowski/Llama-3.2-1B-Instruct-GGUF/resolve/main/Llama-3.2-1B-Instruct-Q4_K_M.gguf",
    filename: "llama-3.2-1b-q4_k_m.gguf",
    params: "1B",
    bytes: 807_694_464,
    minRamBytes: 4 * GB,
    quality: 20,
  },
  {
    id: "qwen-1.5b",
    name: "Qwen 2.5 1.5B",
    size: "~940 MB",
    url: "https://huggingface.co/bartowski/Qwen2.5-1.5B-Instruct-GGUF/resolve/main/Qwen2.5-1.5B-Instruct-Q4_K_M.gguf",
    filename: "qwen2.5-1.5b-q4_k_m.gguf",
    params: "1.5B",
    bytes: 986_048_768,
    minRamBytes: 6 * GB,
    quality: 35,
  },
  {
    id: "qwen-3b",
    name: "Qwen 2.5 3B",
    size: "~1.8 GB",
    url: "https://huggingface.co/bartowski/Qwen2.5-3B-Instruct-GGUF/resolve/main/Qwen2.5-3B-Instruct-Q4_K_M.gguf",
    filename: "qwen2.5-3b-q4_k_m.gguf",
    params: "3B",
    bytes: 1_929_903_264,
    minRamBytes: 6 * GB,
    quality: 60,
  },
  {
    id: "llama-3b",
    name: "Llama 3.2 3B",
    size: "~1.88 GB",
    url: "https://huggingface.co/bartowski/Llama-3.2-3B-Instruct-GGUF/resolve/main/Llama-3.2-3B-Instruct-Q4_K_M.gguf",
    filename: "llama-3.2-3b-q4_k_m.gguf",
    params: "3B",
    bytes: 2_019_377_696,
    minRamBytes: 6 * GB,
    quality: 58,
  },
  {
    id: "qwen-7b",
    name: "Qwen 2.5 7B",
    size: "~4.36 GB",
    url: "https://huggingface.co/bartowski/Qwen2.5-7B-Instruct-GGUF/resolve/main/Qwen2.5-7B-Instruct-Q4_K_M.gguf",
    filename: "qwen2.5-7b-q4_k_m.gguf",
    params: "7B",
    bytes: 4_683_074_240,
    minRamBytes: 12 * GB,
    quality: 85,
  },
  {
    id: "llama-8b",
    name: "Llama 3.1 8B",
    size: "~4.58 GB",
    url: "https://huggingface.co/bartowski/Meta-Llama-3.1-8B-Instruct-GGUF/resolve/main/Meta-Llama-3.1-8B-Instruct-Q4_K_M.gguf",
    filename: "meta-llama-3.1-8b-q4_k_m.gguf",
    params: "8B",
    bytes: 4_920_739_232,
    minRamBytes: 12 * GB,
    quality: 88,
  },
];

const MODEL_DIR = `${FileSystem.documentDirectory}models/`;
const SELECTED_MODEL_KEY = "llama_selected_model";

let context: any = null;
let currentModelId: string | null = null;
/** True while `chat()` is inside a completion, so a benchmark can't collide. */
let generationInFlight = false;

// Per-model download progress (0–1 or -1 for not started)
const downloadProgressMap: Record<string, number> = {};

export function getDownloadProgress(modelId?: string): number {
  const id = modelId ?? currentModelId ?? AVAILABLE_MODELS[0].id;
  return downloadProgressMap[id] ?? 0;
}

export function getCurrentModelId(): string | null {
  return currentModelId;
}

export function getAvailableModels(): LlamaModel[] {
  return AVAILABLE_MODELS;
}

export async function getSelectedModelId(): Promise<string> {
  try {
    const stored = await AsyncStorage.getItem(SELECTED_MODEL_KEY);
    if (stored && AVAILABLE_MODELS.some((m) => m.id === stored)) {
      return stored;
    }
  } catch {}
  return AVAILABLE_MODELS[0].id;
}

export async function setSelectedModelId(id: string): Promise<void> {
  await AsyncStorage.setItem(SELECTED_MODEL_KEY, id);
}

function getModelById(id: string): LlamaModel {
  return AVAILABLE_MODELS.find((m) => m.id === id) ?? AVAILABLE_MODELS[0];
}

export async function isModelDownloaded(modelId: string): Promise<boolean> {
  const model = getModelById(modelId);
  const path = `${MODEL_DIR}${model.filename}`;
  try {
    const info = await FileSystem.getInfoAsync(path);
    return info.exists && (info.size ?? 0) > 50_000_000;
  } catch {
    return false;
  }
}

async function ensureModelDownloaded(modelId: string): Promise<string> {
  const model = getModelById(modelId);
  const path = `${MODEL_DIR}${model.filename}`;

  if (await isModelDownloaded(modelId)) {
    downloadProgressMap[modelId] = 1;
    return path;
  }

  await FileSystem.makeDirectoryAsync(MODEL_DIR, { intermediates: true });

  downloadProgressMap[modelId] = 0;

  const download = FileSystem.createDownloadResumable(
    model.url,
    path,
    {},
    (progress) => {
      downloadProgressMap[modelId] =
        progress.totalBytesWritten / progress.totalBytesExpectedToWrite;
    }
  );

  const result = await download.downloadAsync();
  if (!result || !result.uri) {
    downloadProgressMap[modelId] = -1;
    throw new Error(`Failed to download ${model.name}`);
  }
  downloadProgressMap[modelId] = 1;
  return result.uri;
}

async function disposeContext(): Promise<void> {
  if (context) {
    try {
      await context.cancel();
    } catch {}
    context = null;
  }
  currentModelId = null;
}

// ── Real on-device speed measurement ────────────────────────────────────────
// Device specs cannot predict llama.cpp throughput. Metal/OpenCL offload swings
// it several-fold, and sustained decode is throttled by heat and memory
// pressure — none of which any Expo API reports. llama.cpp already measures the
// one thing that matters, so read it back instead of guessing.

/** A fixed continuation prompt: deterministic, and long enough to be steady. */
const BENCH_PROMPT = "The health benefits of a daily walk include";
const BENCH_MAX_TOKENS = 48;
/** Below this many generated tokens the sample is too short to trust. */
const BENCH_MIN_TOKENS = 8;

export interface ModelSpeed {
  modelId: string;
  /** Decode speed after prompt processing — the number the user feels. */
  tokensPerSecond: number;
  /** Prompt (prefill) speed, which dominates how long the first token takes. */
  promptTokensPerSecond: number;
  /** How many tokens the measurement was taken over. */
  sampledTokens: number;
}

/**
 * Measures real generation speed for an already-downloaded model.
 *
 * Reuses the live context when the model is the one the user is running, and
 * otherwise loads a temporary one that is released afterwards.
 *
 * Returns null when the model isn't downloaded yet, when llama.rn is missing,
 * when a reply is currently generating, or when the run produced too few tokens
 * to be a trustworthy sample. Callers must treat null as "not measured", never
 * as "slow".
 */
export async function benchmarkModel(modelId: string): Promise<ModelSpeed | null> {
  // Never measure during a reply: benchmarking another model would load a second
  // set of weights alongside the live one, and measuring the live one would
  // append to the conversation it is mid-way through.
  if (generationInFlight) {
    console.warn("[llamaProvider] Skipping benchmark while a reply is generating.");
    return null;
  }
  if (!(await isModelDownloaded(modelId))) return null;

  let llama: any;
  try {
    llama = require("llama.rn");
  } catch {
    return null;
  }

  const model = getModelById(modelId);
  const reusingLiveContext = currentModelId === modelId && !!context;
  let ctx: any = reusingLiveContext ? context : null;

  try {
    if (!ctx) {
      ctx = await llama.initLlama({
        model: `${MODEL_DIR}${model.filename}`,
        // A benchmark needs a small context, not the chat's.
        n_ctx: 1024,
        use_mlock: false,
        n_gpu_layers: Platform.OS === "ios" ? 99 : 0,
      });
    }

    const result = await ctx.completion({
      // Raw completion (not chat) so no chat template is applied — the template
      // of a smaller model can otherwise bail out before generating anything.
      prompt: BENCH_PROMPT,
      n_predict: BENCH_MAX_TOKENS,
      temperature: 0,
      top_k: 1,
    });

    const t = result?.timings;
    const sampledTokens = Number(t?.predicted_n);
    const tps = Number(t?.predicted_per_second);
    const pps = Number(t?.prompt_per_second);
    if (
      !Number.isFinite(tps) ||
      tps <= 0 ||
      !Number.isFinite(sampledTokens) ||
      sampledTokens < BENCH_MIN_TOKENS
    ) {
      return null;
    }

    return {
      modelId,
      tokensPerSecond: Math.round(tps * 10) / 10,
      promptTokensPerSecond: Number.isFinite(pps) ? Math.round(pps * 10) / 10 : 0,
      sampledTokens,
    };
  } catch (e) {
    console.warn(`[llamaProvider] Benchmark failed for ${modelId}:`, e);
    return null;
  } finally {
    if (!reusingLiveContext && ctx) {
      // Temporary context: free it so its weights don't sit in RAM.
      try {
        await ctx.release();
      } catch {}
    } else if (reusingLiveContext && ctx) {
      // Drop the benchmark prompt from the live KV cache so the next chat turn
      // starts clean rather than continuing the benchmark's sentence.
      try {
        await ctx.clearCache(true);
      } catch {}
    }
  }
}

export const llamaProvider: LLMProvider = {
  name: "Llama (local)",

  async isAvailable(): Promise<boolean> {
    try {
      const llama = require("llama.rn");
      return llama != null;
    } catch {
      return false;
    }
  },

  async init(): Promise<void> {
    const modelId = await getSelectedModelId();
    await this.switchModel(modelId);
  },

  async switchModel(modelId: string): Promise<void> {
    if (currentModelId === modelId && context) return;

    await disposeContext();

    const modelPath = await ensureModelDownloaded(modelId);
    const llama = require("llama.rn");

    context = await llama.initLlama({
      model: modelPath,
      n_ctx: 4096,
      use_mlock: true,
      n_gpu_layers: Platform.OS === "ios" ? 99 : 0,
    });

    currentModelId = modelId;
    await setSelectedModelId(modelId);
  },

  async chat(messages: ChatMessage[]): Promise<LLMResponse> {
    if (!context) {
      await this.init();
    }

    generationInFlight = true;
    let result: any;
    try {
      result = await context.completion({
        messages: messages.map((m) => ({
          role: m.role === "tool" ? "user" : m.role,
          content: m.content,
        })),
        n_predict: 800,
        temperature: 0.3,
        top_p: 0.9,
        stop: ["<|im_end|>", "<|endoftext|>", "<|eot_id|>"],
      });
    } finally {
      generationInFlight = false;
    }

    const raw = (result.content || result.text || "").trim();
    return parseProviderResponse(raw);
  },

  async dispose(): Promise<void> {
    await disposeContext();
  },
};

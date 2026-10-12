// Myrri Health
// Copyright (C) 2026 Pranesh Shivaraj
//
// This program is free software: you can redistribute it and/or modify
// it under the terms of the GNU General Public License as published by
// the Free Software Foundation, either version 3 of the License, or
// (at your option) any later version.

/**
 * Provider picker for the migrated AI stack (see AI_CHAT_REBUILD_PLAN.md §3.3).
 *
 * Maps the stored provider choice (`llm_provider_choice` + the BYOK config + the
 * selected GGUF) onto an AI SDK `LanguageModel`. Nothing here is wired into the
 * shipping chat screens yet — they still run on the legacy harness — so this is
 * additive, exactly like `./foodAgent.ts`.
 */

import { Platform } from "react-native";
import * as FileSystem from "expo-file-system/legacy";
import type { LanguageModel } from "ai";
import type { LanguageModelV3, LanguageModelV3CallOptions } from "@ai-sdk/provider";
import { wrapLanguageModel } from "ai";
import { createOpenAI } from "@ai-sdk/openai";
import { createAnthropic } from "@ai-sdk/anthropic";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
// NOTE: @react-native-ai/{apple,adk,llama} must NOT be statically imported.
// @react-native-ai/apple evaluates TurboModuleRegistry.getEnforcing('NativeAppleLLM')
// at import time, which throws on Android and kills the app as soon as any chat
// screen loads (both chat screens transitively import this module via chatSession).
// Each provider is require()d lazily inside the platform branch that needs it.
import { getLLMChoice } from "../localLLM";
import { getByokConfig } from "../providers/byok";
import { AVAILABLE_MODELS, getSelectedModelId } from "../providers/llamaProvider";
import { scrubForCloud } from "../cloudPrivacy";

const MODEL_DIR = `${FileSystem.documentDirectory}models/`;

/** Scrub direct identifiers out of every text part before it leaves the device. */
function cloudScrubbableModel(model: LanguageModelV3): LanguageModelV3 {
  return wrapLanguageModel({
    model,
    middleware: {
      specificationVersion: "v3",
      transformParams: async ({ params }) => ({
        ...params,
        prompt: params.prompt.map((message) =>
          typeof message.content === "string"
            ? { role: message.role, content: scrubForCloud(message.content) }
            : {
                ...message,
                content: message.content.map((part) =>
                  part.type === "text" ? { ...part, text: scrubForCloud(part.text) } : part,
                ),
              },
        ) as LanguageModelV3CallOptions["prompt"],
      }),
    },
  });
}

async function byokModel(): Promise<LanguageModel> {
  const config = await getByokConfig();
  if (!config) throw new Error("Bring-your-own-key isn't set up yet.");
  switch (config.provider) {
    case "openai":
      return createOpenAI({ apiKey: config.apiKey, baseURL: config.baseUrl })(config.model);
    case "anthropic":
      return createAnthropic({ apiKey: config.apiKey, baseURL: config.baseUrl })(config.model);
    case "gemini":
      return createGoogleGenerativeAI({ apiKey: config.apiKey, baseURL: config.baseUrl })(config.model);
    case "openrouter":
      return createOpenAI({
        apiKey: config.apiKey,
        baseURL: config.baseUrl ?? "https://openrouter.ai/api/v1",
      })(config.model);
    default:
      throw new Error(`Unsupported BYOK provider: ${config.provider}`);
  }
}

/**
 * Resolve the active model for the new agent stack. Mirrors the legacy
 * `selectProvider()` tier order: BYOK → Apple (iOS) / Gemini Nano (Android) → local GGUF.
 *
 * Native providers are loaded with platform-guarded require() calls — never a
 * static import — so the iOS-only Apple TurboModule is never evaluated on
 * Android (and vice versa). A missing/mislinked native module falls through to
 * the next tier instead of crashing the app on chat-screen open.
 */
export async function pickModel(): Promise<LanguageModel> {
  const choice = await getLLMChoice();

  if (choice === "none") {
    throw new Error("AI is turned off — enable it in the AI setup screen to chat.");
  }

  if (choice === "byok") {
    const model = await byokModel();
    return cloudScrubbableModel(model as LanguageModelV3);
  }

  // Local tier: prefer the built-in system model (no download), then a GGUF.
  if (Platform.OS === "ios") {
    try {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const { apple } = require("@react-native-ai/apple");
      if (apple?.isAvailable?.()) {
        return apple.languageModel();
      }
    } catch {
      // Apple provider unavailable — fall through to the GGUF.
    }
  }
  if (Platform.OS === "android") {
    try {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const { adk } = require("@react-native-ai/adk");
      if (await adk?.isAvailable?.()) {
        return adk();
      }
    } catch {
      // ADK unavailable — fall through to the GGUF.
    }
  }
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { llama } = require("@react-native-ai/llama");
    const modelId = await getSelectedModelId();
    const model = AVAILABLE_MODELS.find((m) => m.id === modelId) ?? AVAILABLE_MODELS[0];
    return llama.languageModel(`${MODEL_DIR}${model.filename}`);
  } catch (e) {
    throw new Error("No local AI provider is available on this device.");
  }
}

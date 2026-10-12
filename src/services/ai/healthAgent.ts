// Myrri Health
// Copyright (C) 2026 Pranesh Shivaraj
//
// This program is free software: you can redistribute it and/or modify
// it under the terms of the GNU General Public License as published by
// the Free Software Foundation, either version 3 of the License, or
// (at your option) any later version.

/**
 * Phase 2 of the AI-harness migration (see AI_CHAT_REBUILD_PLAN.md §5).
 *
 * Health chat on the new stack: a `ToolLoopAgent` with the ported health tools.
 * Mirrors `./foodAgent.ts`. Additive — the shipping screen still uses the
 * legacy harness until a device spike validates streaming and approvals.
 */

import { ToolLoopAgent, stepCountIs, type LanguageModel } from "ai";
import { healthTools } from "./healthTools";

export const HEALTH_AGENT_MAX_STEPS = 10;

export function createHealthAgent(options: { model: LanguageModel; instructions: string }) {
  return new ToolLoopAgent({
    model: options.model,
    instructions: options.instructions,
    tools: healthTools,
    stopWhen: stepCountIs(HEALTH_AGENT_MAX_STEPS),
  });
}

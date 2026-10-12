// Myrri Health
// Copyright (C) 2026 Pranesh Shivaraj
//
// This program is free software: you can redistribute it and/or modify
// it under the terms of the GNU General Public License as published by
// the Free Software Foundation, either version 3 of the License, or
// (at your option) any later version.

/**
 * Chat session over the new AI SDK `ToolLoopAgent` stack.
 *
 * Deliberately mirrors the legacy `createChatSession` surface (sendMessage /
 * resetChat / cancelGeneration) so screens can swap harness without rewriting
 * their message plumbing. History keeps only user/assistant text — tool
 * results are intentionally NOT persisted, exactly like the legacy harness,
 * which keeps the context small and means follow-up questions re-fetch.
 *
 * Approvals (`needsApproval` tools such as delete_meal / edit_meal) are
 * surfaced to the screen as a pending-approval descriptor; the screen applies
 * the mutation itself, matching the legacy earlyExit + pendingApproval UX.
 */

import type { ModelMessage } from "ai";
import { createFoodAgent } from "./foodAgent";
import { createHealthAgent } from "./healthAgent";
import { pickModel } from "./model";
import { resetHealthSnapshot } from "./healthTools";

export interface AgentChatSessionOptions {
  systemPrompt: string;
  kind: "food" | "health";
}

export interface PendingApprovalInfo {
  toolName: string;
  toolCallId: string;
  input: any;
}

export interface AgentChatTurn {
  role: "user" | "assistant";
  text: string;
  pendingApproval?: PendingApprovalInfo;
  /** Tool names the agent called during this turn, in order. */
  tools?: string[];
  /** The model's own reasoning text, if it streams any. */
  reasoning?: string;
}

export interface AgentActivity {
  kind: "tool" | "reasoning" | "text";
  label: string;
}

export interface AgentChatSession {
  sendMessage(
    text: string,
    onToken?: (partial: string) => void,
    onActivity?: (activity: AgentActivity) => void,
  ): Promise<AgentChatTurn[]>;
  resetChat(): void;
  cancelGeneration(): void;
  getTurns(): AgentChatTurn[];
  /** Mark a surfaced pending approval as resolved so it doesn't re-render later. */
  resolveApproval(mealId: string, note: string): void;
}

const APPROVAL_TOOL_NAMES = new Set(["delete_meal", "edit_meal"]);

export function createAgentChatSession(options: AgentChatSessionOptions): AgentChatSession {
  let agent: { stream: (args: any) => Promise<any> } | null = null;
  const history: ModelMessage[] = [];
  const turns: AgentChatTurn[] = [];
  let abortRef: AbortController | null = null;
  // A step sequence can end on a tool call with no final text; such a turn has
  // nothing to render, so its provenance (tools/reasoning) is carried over and
  // merged into the next assistant turn that DOES have something to show —
  // otherwise the screen would render an empty bubble.
  let carriedTools: string[] = [];
  let carriedReasoning: string[] = [];

  const ensureAgent = async () => {
    if (!agent) {
      const model = await pickModel();
      agent =
        options.kind === "food"
          ? createFoodAgent({ model, instructions: options.systemPrompt })
          : createHealthAgent({ model, instructions: options.systemPrompt });
    }
    return agent;
  };

  const sendMessage = async (
    text: string,
    onToken?: (partial: string) => void,
    onActivity?: (activity: AgentActivity) => void,
  ): Promise<AgentChatTurn[]> => {
    const active = await ensureAgent();
    abortRef = new AbortController();
    if (options.kind === "health") resetHealthSnapshot();

    history.push({ role: "user", content: text });
    turns.push({ role: "user", text });

    let accumulated = "";
    let newStep = false;
    let reasoningNewStep = false;
    let pendingApproval: PendingApprovalInfo | undefined;
    const toolsUsed: string[] = [];
    let reasoningText = "";

    try {
      const result = await active.stream({
        messages: history,
        abortSignal: abortRef.signal,
        onStepFinish: () => {
          if (accumulated.length > 0) newStep = true;
          if (reasoningText.length > 0) reasoningNewStep = true;
        },
      });

      for await (const part of result.fullStream) {
        if (part.type === "text-delta") {
          if (newStep) {
            accumulated += "\n\n";
            newStep = false;
          }
          accumulated += part.text;
          onToken?.(accumulated);
        } else if (part.type === "reasoning-delta") {
          if (reasoningNewStep && reasoningText.length > 0) reasoningText += "\n\n";
          reasoningNewStep = false;
          reasoningText += part.text;
          onActivity?.({ kind: "reasoning", label: "Thinking…" });
        } else if (part.type === "tool-call") {
          toolsUsed.push(part.toolName);
          onActivity?.({ kind: "tool", label: part.toolName });
        }
      }

      // Surface unexecuted tool approvals to the screen for a manual confirm.
      const steps = await result.steps;
      for (const step of steps) {
        for (const call of step.toolCalls ?? []) {
          if (!APPROVAL_TOOL_NAMES.has(call.toolName)) continue;
          const executed = (step.toolResults ?? []).some(
            (r: any) => r.toolCallId === call.toolCallId,
          );
          if (!executed) {
            pendingApproval = {
              toolName: call.toolName,
              toolCallId: call.toolCallId,
              input: call.input,
            };
          }
        }
      }

      const finalText = accumulated.trim();
      if (finalText) {
        history.push({ role: "assistant", content: finalText });
      }
      const reasoning = reasoningText.trim();
      if (finalText || pendingApproval) {
        // Only surface a turn that has something to render (reply text or an
        // approval card); fold in any provenance carried from tool-only turns.
        const mergedTools = [...carriedTools, ...toolsUsed];
        const mergedReasoning = [
          ...carriedReasoning,
          ...(reasoning ? [reasoning] : []),
        ];
        carriedTools = [];
        carriedReasoning = [];
        turns.push({
          role: "assistant",
          text: finalText,
          pendingApproval,
          tools: mergedTools.length ? mergedTools : undefined,
          reasoning: mergedReasoning.length ? mergedReasoning.join("\n\n") : undefined,
        });
      } else if (toolsUsed.length || reasoning) {
        carriedTools.push(...toolsUsed);
        if (reasoning) carriedReasoning.push(reasoning);
      }
    } catch (e: any) {
      if (abortRef?.signal.aborted) {
        const stopped = accumulated.trim()
          ? `${accumulated.trim()}\n\nGeneration stopped.`
          : "Generation stopped.";
        history.push({ role: "assistant", content: stopped });
        turns.push({ role: "assistant", text: stopped });
        return turns.slice();
      }
      throw e;
    } finally {
      abortRef = null;
    }
    return turns.slice();
  };

  return {
    sendMessage,
    resetChat: () => {
      history.length = 0;
      turns.length = 0;
      carriedTools = [];
      carriedReasoning = [];
    },
    cancelGeneration: () => abortRef?.abort(),
    getTurns: () => turns.slice(),
    resolveApproval: (mealId, note) => {
      for (const t of turns) {
        if (t.pendingApproval && t.pendingApproval.input?.mealId === mealId) {
          t.pendingApproval = undefined;
          if (!t.text) t.text = note;
        }
      }
    },
  };
}

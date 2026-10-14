// Akosian
// Copyright (C) 2026 Pranesh Shivaraj
//
// This program is free software: you can redistribute it and/or modify
// it under the terms of the GNU General Public License as published by
// the Free Software Foundation, either version 3 of the License, or
// (at your option) any later version.

/** Human-friendly labels + data-source names for agent tool calls. */

export const TOOL_LABELS: Record<string, { activity: string; source: string }> = {
  search_food: { activity: "Searching foods", source: "Nutrition database" },
  log_meal: { activity: "Logging your meal", source: "Meal log" },
  get_meals: { activity: "Checking today's meals", source: "Meal log" },
  delete_meal: { activity: "Preparing to remove a meal", source: "Meal log" },
  edit_meal: { activity: "Preparing to update a meal", source: "Meal log" },
  get_steps: { activity: "Reading activity", source: "Apple Health / Health Connect" },
  get_heart: { activity: "Reading heart data", source: "Apple Health / Health Connect" },
  get_workouts: { activity: "Reading workouts", source: "Apple Health / Health Connect" },
  get_activity_trends: { activity: "Reading activity trends", source: "Apple Health / Health Connect" },
  get_vitals: { activity: "Reading vitals", source: "Apple Health / Health Connect" },
  get_body: { activity: "Reading body metrics", source: "Apple Health / Health Connect" },
  get_sleep: { activity: "Reading sleep", source: "Apple Health / Health Connect" },
  get_recovery: { activity: "Reading recovery", source: "Readiness" },
  get_journal: { activity: "Reading your journal", source: "Journal" },
  get_goal_guidance: { activity: "Looking up goal guidance", source: "Goal library" },
  get_plan: { activity: "Reading your plan", source: "Coach plan" },
  update_plan: { activity: "Updating your plan", source: "Coach plan" },
};

export function toolActivity(toolName: string): string {
  return TOOL_LABELS[toolName]?.activity ?? `Running ${toolName}`;
}

export function sourcesForTools(toolNames: string[] | undefined): string[] {
  if (!toolNames?.length) return [];
  const out: string[] = [];
  for (const name of toolNames) {
    const source = TOOL_LABELS[name]?.source;
    if (source && !out.includes(source)) out.push(source);
  }
  return out;
}

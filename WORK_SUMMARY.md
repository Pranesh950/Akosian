# What I Did Recently

A short recap of the recent commits, newest first.

## October 2026

**Branding and docs**
- Added the Everwave logo (mark + full version) and made new app icons and splash screen with `scripts/generate-logo.mjs`.
- Wrote `AI_CHAT_HARNESS.md`, which explains how the health and food chat works today and lists 16 things that are wrong with it.
- Wrote `AI_CHAT_REBUILD_PLAN.md` with a plan to replace the chat system.
- Started `DEVLOG.md` to keep short notes on changes.

**Chat fixes and cleanup**
- Chat now answers "yesterday" questions properly for steps and sleep, instead of quietly giving today's numbers.
- Editing a meal's serving size now recalculates its calories and macros.
- Tidied the chat look: removed duplicate bubble/avatar styles and moved to shared colors.

**Readiness**
- Daily readiness is recorded once a day from the Biology tab, and the 7-day history finally fills in.
- The score is now just a read — asking the AI for recovery no longer changes your data behind your back.

**Speed and health access**
- A health snapshot is now loaded once per message instead of re-reading everything for every tool call.
- On iOS, tapping "Connect" gives clear feedback and opens the Health app, since that's where access actually lives.

**Platform settings**
- Turned off iPad support, dropped the microphone permission (camera only), and raised the Android target to API 36.

**Started the AI upgrade**
- Added the Vercel AI SDK and new food tool files (`src/services/ai/foodTools.ts`, `foodAgent.ts`). It's off by default, so the shipping chat is untouched.

**Removed dead code**
- Deleted 7 old chart and input components that nothing used anymore.

## September 2026

- Set up iOS builds and App Store submission through EAS for `com.myrri.myrri`.
- Fixed the EAS workflow file and made Expo's doctor checks pass.
- Stopped local secret files (`.asc`, `CREDENTIALS.md`) from being committed.

## August 2026

- Rewrote the Activity tab and the settings screen.
- Added the Play Store listing and an Android health-permissions doc, refreshed the README, and added the license and privacy policy.

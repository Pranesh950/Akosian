<div align="center">

<img src="assets/icon.png" alt="Akosian app icon" width="88" height="88" />

# Akosian

**A health tracker that runs on your phone, not someone else's server.**

Sleep, recovery, strain, food, and habits for iOS and Android. No account, no backend, no subscription — and an AI coach that can run entirely on-device.

[![Join the iOS beta on TestFlight](https://img.shields.io/badge/Join_the_iOS_beta-0D96F6?style=for-the-badge&logo=apple&logoColor=white)](https://testflight.apple.com/join/HvNZzY4D)
[![Join the Android beta](https://img.shields.io/badge/Join_the_Android_beta-3DDC84?style=for-the-badge&logo=android&logoColor=202126)](#get-akosian-on-android)
[![Star Akosian](https://img.shields.io/github/stars/Pranesh950/Akosian?style=for-the-badge&logo=github&label=Star%20Akosian&color=E56F63)](https://github.com/Pranesh950/Akosian)
[![License: GPL v3](https://img.shields.io/badge/Open_source-GPLv3-202126?style=for-the-badge)](LICENSE)

<img src="assets/brand/readme-hero.svg?v=3" alt="Akosian: Your health. Your phone. Your rules. Free, open source, local-first. Real iOS screenshots of the Overview, Journal, Fitness, and Biology tabs." width="100%" />

`18 health data types` · `326,759 foods offline` · `0 telemetry SDKs` · `GPLv3`

**Install on iPhone in one tap · Android in three · or build it yourself from source.**

[Install](#install) · [What it does](#what-you-can-do) · [Compare](#how-it-compares) · [Run the code](#build-it-yourself) · [How it works](#under-the-hood) · [Privacy](#privacy-plainly) · [Honest limits](#a-few-honest-limits)

</div>

## Install

Two betas, both free. Pick your phone; troubleshooting for both is at the end of the section.

### Try the web demo

**[Try Akosian in your browser →](https://pranesh950.github.io/Myrri-Health/)** — walk through onboarding, the dashboard, and the coach with fake data. Health sync, camera barcode scanning, and local AI only work in the installed app.

### Get Akosian on iOS

**One tap. No invite, no email, no approval wait.**

[![Join the Akosian iOS beta on TestFlight](https://img.shields.io/badge/Join_the_iOS_beta_on_TestFlight-0D96F6?style=for-the-badge&logo=apple&logoColor=white)](https://testflight.apple.com/join/HvNZzY4D)

Open this on the iPhone itself → **[testflight.apple.com/join/HvNZzY4D](https://testflight.apple.com/join/HvNZzY4D)**

1. **Open the link on the iPhone.** Public links only resolve on iOS, so a Mac or PC browser won't get you anywhere.
2. **Tap Accept.** No TestFlight app yet? The page sends you to Apple's free TestFlight first — install it, then reopen the link.
3. **Tap Install.** Akosian lands on your home screen like any other app.

That's the whole process. Reopen the same link whenever you want the newest build.

### Get Akosian on Android

**Three links, one Google account, in order.**

| 1 · Join the group | 2 · Become a tester | 3 · Install the app |
| :--- | :--- | :--- |
| [**Join Akosian testers →**](https://groups.google.com/g/akosian) | [**Open the beta opt-in →**](https://play.google.com/apps/testing/com.myrri.app) | [**Download on Google Play →**](https://play.google.com/store/apps/details?id=com.myrri.app) |
| Sign in and choose **Join group**, or request membership if approval is required. | Once you're a member, tap **Become a tester**. | Open the listing with the same account and tap **Install**. |

> **Use the same Google account for all three steps.** Google requires an account to run a closed Play beta; **Akosian itself never asks you to create one.** Join, opt in, and use the app in your normal routine — that's also what helps it graduate out of closed testing, where Google's process can require 12 testers opted in for 14 consecutive days.

<details>
<summary><strong>Install problems, and what actually causes them</strong></summary>

**iPhone**

- **Opened the link on a Mac or PC?** Public TestFlight links only resolve on iOS. Open it on the iPhone itself.
- **"This beta is full"?** Apple caps a public link at 10,000 testers. [Email the maintainer](mailto:pranesh.shivaraj.k@gmail.com?subject=Akosian%20iOS%20beta%20access) and try again when a slot frees up.
- **"Build expired", or nothing to install?** TestFlight builds live for 90 days. The link never changes — reopen it for the current build.
- **Asks for a newer iOS?** The beta targets **iOS 15.1+**.
- **Still stuck?** [Open an issue](https://github.com/Pranesh950/Akosian/issues) with your model, iOS version, and the exact error. Leave health values and personal data out of it.

**Android**

- **Group says "content unavailable"?** Check which Google account you're signed into, then reopen [the group](https://groups.google.com/g/akosian).
- **Requested membership?** A pending request isn't membership. Wait for approval before the tester opt-in.
- **"App not available for this account"?** The Play Store must be signed into the *same* account that joined the group and opted in.
- **Device unsupported?** Closed testing needs **Android 8.0 (API 26)** or newer; availability is also set per country in Play.
- **Still stuck?** Send the maintainer the error text and your phone model — [email](mailto:pranesh.shivaraj.k@gmail.com?subject=Akosian%20Android%20beta%20access), not a public issue with personal details.

</details>

## What you can do

| | |
| :--- | :--- |
| **☀️ Make sense of your morning**<br />Readiness, sleep, strain, and a locally generated morning brief — a summary of your day instead of another dashboard. | **🍎 Spend less time logging food**<br />Search 326,759 foods offline, scan supported barcodes, or describe a meal to the optional AI coach. |
| **📓 See the habits behind the numbers**<br />Water, caffeine, mood, movement, and streaks, with habit/readiness associations. Correlation is not causation. | **💬 Ask a coach that has context**<br />The optional AI coach can read your health and journal context, log meals, and work from your plan. |
| **📈 Compare against yourself**<br />Readiness measures today's HRV and resting heart rate against your own rolling 21-day baseline — not against other people. | **🧬 Explore a wellness age estimate**<br />An index from the signals you have, shown with uncertainty. Not a clinical test or a diagnosis. |

### Pick your AI. Or skip it.

| Mode | Where it runs | What it means |
| :--- | :--- | :--- |
| **No AI** | — | Tracking, scores, food lookup, and morning briefs need no model and no key. |
| **On-device AI** | Your phone | The NPU model your OS already ships, or a GGUF model downloaded once. Inference never leaves the device. |
| **Your own key** | Your provider | OpenAI, Anthropic, Gemini, or OpenRouter. Chat and relevant context go straight from your phone to them, billed by them. Keys live in OS secure storage. |

### Works with the data you already have

Akosian reads **Apple Health on iOS** and **Health Connect on Android** — it doesn't talk to wearables directly. Apple Watch, Galaxy Watch, Pixel Watch, Garmin, Fitbit, Oura, and WHOOP can all feed it wherever their companion app syncs into your platform's health store. Support varies by vendor, region, and metric; some setups need a bridge.

No wearable? Manual meals and habits work fine. Health-based scores still need their underlying data.

## How it compares

Akosian isn't trying to out-polish a funded team. It's trying to remove the parts you can't opt out of elsewhere: the account, the subscription, and the server.

| | **Akosian** | **Bevel** | **WHOOP** |
| :--- | :--- | :--- | :--- |
| **Price for the whole app** | **$0.** No tier, no paywall, no hardware. Optional cloud AI is billed by your provider, at cost. | Free core; **$99.99/yr** for the AI coach, health records, biological age, and training plans. | **$199–$359/yr, every year**, with no free tier. The band is bundled into the membership, not included once. |
| **Account** | **None.** Open the app and start tracking. | Required. | Required. |
| **Where your data is processed** | **On your phone.** Cloud AI stays off unless you turn it on with your own key. | Bevel's account and cloud. | WHOOP's cloud. |
| **AI** | On-device (your OS model or a local GGUF) or your own provider key — and optional entirely. | Cloud-only Bevel Intelligence, metered on Pro. | Cloud-only WHOOP Coach. |
| **Local-first** | **Yes.** Scores, food search, journal, and on-device AI work with no network. | Account-centric; the AI needs the cloud. | Cloud sync is the model. |
| **Hardware** | **Any wearable** that writes to Apple Health or Health Connect — or none at all. | Apple Watch-centric, **iOS only**. | WHOOP band only. |
| **Platforms** | iOS **and** Android. | iOS only. | iOS and Android. |
| **Source** | **GPLv3.** Audit it, fork it, build it, keep it. | Closed. | Closed. |

**The short version:** Bevel charges for the AI coach and WHOOP charges for the band and the app; Akosian charges for nothing and hands you the source. The trade is polish and headcount — a funded team ships faster than [one maintainer](https://github.com/Pranesh950), which is what the [honest limits](#a-few-honest-limits) are for.

<sub>Competitor plans and prices read from their public pricing pages in October 2026 — check them before relying on a number. This compares terms, not build quality or clinical claims.</sub>

## Build it yourself

Akosian is a **native app**. Expo Go can't load HealthKit, Health Connect, or llama.cpp, so skip it and use one of these.

### Option A — build in the cloud (no Xcode, no Android Studio)

Needs a free [Expo account](https://expo.dev). On a fork, run `eas init` and point `owner` in `app.json` at your own account first — otherwise the build targets the maintainer's project.

```bash
npm install -g eas-cli
eas login
eas init

eas build -p android --profile preview      # installable APK, signs itself
eas build -p ios     --profile preview      # ad-hoc install; Apple Developer account required
```

Android needs no Apple-style membership and no local SDK. EAS iOS ad-hoc installs need a paid Apple Developer account ($99/year) — for a free path onto your own iPhone, use Xcode's personal team in Option B. Simulator builds need no account at all.

### Option B — build locally

| Platform | You'll need |
| :--- | :--- |
| **Both** | Node **20.19.4+** (React Native 0.81's minimum), npm |
| **Android** | JDK **17**, Android Studio with **SDK 36** + build-tools 36.0.0. Runs on Android 8.0 (API 26)+ |
| **iOS** | macOS, **Xcode 16.1+**, CocoaPods. Runs on iOS 15.1+ |

```bash
git clone https://github.com/Pranesh950/Akosian.git
cd Akosian
npm install

npx expo run:android   # emulator or USB device
npx expo run:ios       # macOS + Xcode, simulator or device
```

After the first native build, `npx expo start --dev-client` is enough for JS changes. A free Apple ID can sign onto your own iPhone for seven days at a time; a paid account lifts that.

<details>
<summary><strong>The food database and Git LFS (read this if the app has no food)</strong></summary>

The 112 MB nutrition database is stored with Git LFS, and GitHub's free LFS bandwidth is small. Under heavy traffic the quota runs out and your clone gets a 134-byte **pointer file** instead of the database. The clone succeeds; the food search is just empty.

Build it from source instead — the script downloads the 63 MB OpenNutrition 2025.1 release, verifies its published SHA-256, and assembles the SQLite file locally:

```bash
GIT_LFS_SKIP_SMUDGE=1 git clone https://github.com/Pranesh950/Akosian.git
cd Akosian
npm install
npm run build:opennutrition
```

</details>

```text
app/                    Screens, onboarding, chat, and detail views
src/services/           Health, scoring, journal, food, and coaching
src/services/ai/        Agents, model policy, and tools
src/services/providers/ On-device engines and cloud-key configuration
src/components/         Charts, gauges, chat, and shared UI
modules/                Native integrations
plugins/                Expo native configuration
scripts/                Nutrition database and asset tooling
```

Nutrition data attribution: [OpenNutrition](src/data/OPENNUTRITION_ATTRIBUTION.md) — the dataset carries its own attribution and share-alike terms, which apply to forks too.

## Under the hood

**Expo SDK 54 · React Native 0.81 · TypeScript · Expo Router · SQLite · HealthKit / Health Connect · Vercel AI SDK · llama.cpp via `llama.rn`** — all on the phone.

| Piece | How it works |
| :--- | :--- |
| **Health data** | 18 HealthKit read types on iOS; the matching Health Connect record types on Android (5 core + 12 optional). Steps, heart rate, resting heart rate, HRV, sleep, respiratory rate, SpO₂, VO₂max, active energy, distance, weight, height, blood pressure, body temperature, body fat, lean mass, workouts. |
| **Scores** | Readiness: today's HRV and resting heart rate vs. a rolling 21-day baseline of your own readings, plus sleep duration against a target. Scoring is a **pure read** — an AI tool call can compute a score but cannot write your health data. |
| **Food** | A bundled 112 MB SQLite file: 326,759 foods, 313,256 barcodes, FTS5 search. Built from OpenNutrition 2025.1 by `npm run build:opennutrition`, which downloads the release and checks its SHA-256 before building. Kept in Git LFS. |
| **On-device AI** | Prefers the model your OS already has (Apple Foundation Model, Gemini Nano, through small native modules in `modules/`). Otherwise downloads a GGUF model — Qwen 2.5 0.5B/1.5B/3B/7B, Llama 3.2 1B/3B, or Llama 3.1 8B, roughly 379 MB to 4.9 GB — and runs it on llama.cpp. |
| **Model choice** | It doesn't guess. Picks the largest model that fits RAM and free disk, benchmarks it on your device, keeps it above 8 tok/s, steps down below 4 tok/s, and labels a specs-based guess as a prediction rather than a measurement. |
| **Cloud AI (optional)** | OpenAI, Anthropic, Gemini, or OpenRouter — `openrouter/free` works without payment. Requests go phone → provider directly; keys stay in OS secure storage. |
| **Notifications** | The morning brief is scheduled locally with `expo-notifications`. No push service, no device token, no server. |
| **App size** | `llama.rn` ships one prebuilt engine per ARM instruction set (v8, v8.2, dotprod, i8mm, Hexagon/OpenCL). A config plugin keeps only the universal arm64 build and drops emulator and DSP stubs, since the loader already falls back cleanly. |

### Four problems worth reading the source for

- **HealthKit never tells you what you were allowed to read.** iOS reports that the permission sheet was shown, not which read types were granted. Rather than claiming "no data", the app surfaces an `access_requested` state and sends you to the Health app, where access actually lives.
- **Health Connect providers disagree about optional metrics.** One phone missing body temperature shouldn't invalidate the connection, so permissions are requested in core and optional groups, and an unavailable optional type is skipped instead of failing the flow.
- **Android paints an elevated view's shadow through a translucent background.** A tinted card with a shadow shows that shadow as a smudge across its own surface, so tinted cards composite the tint into a solid color (`solidTint` in [src/theme.ts](src/theme.ts)) before drawing one.
- **"Missing" and "zero" are different answers.** An unmeasured metric renders as `—`, never `0`, and a score with nothing behind it stays grayed out instead of showing a confident number.

## Privacy, plainly

- **No Akosian account, backend, ads, or analytics SDKs.** There is no telemetry library in `package.json`.
- Health records, journals, meals, and settings live in **on-device storage**. Revoke health permissions any time in Apple Health or Health Connect.
- **On-device inference stays on-device.** Model downloads and store services still need a network.
- **Cloud AI is opt-in.** When on, your chat and relevant context go directly to your provider. Identifier scrubbing is best-effort — not a guarantee of anonymity, and not removal of all sensitive health data.
- API keys go to **OS secure storage**, not to a server. Your provider's billing and retention policies still apply.

**Check it yourself.** Outbound hosts are the whole claim: `grep -rn "https://" src` lists every URL in the app. What's there is `huggingface.co` for model downloads, your chosen AI provider, store links, and nutrition-data attribution strings that are never fetched. No crash reporter, no event pipeline, no third-party SDK.

The [full privacy policy](PRIVACY_POLICY.md) has the long version. Found a security issue? [SECURITY.md](SECURITY.md) has the disclosure channel and the known gaps. Keep private health data out of public issues and the tester group.

## A few honest limits

- **Wellness app, not a medical device.** Scores and AI output are informational, can be wrong, and are not medical advice. Bevel and WHOOP are more polished products with teams behind them; the [comparison](#how-it-compares) is about price, ownership, and auditability, not finish.
- **The web demo is a re-creation, not the app.** HealthKit, Health Connect, and llama.cpp are native modules, so the [browser demo](https://pranesh950.github.io/Myrri-Health/) uses fake data and can't scan barcodes or run local AI. Installing is how you see the real thing.
- **No automated tests yet.** Scoring and model policy are deliberately pure functions so they *can* be tested without a phone; today verification is manual. That's a real risk in beta.
- **Phone-only.** Tablet support is off and layouts are portrait, so an iPad runs the phone layout.
- **Not small.** 112 MB of food database is bundled, and a local model adds 379 MB – 4.9 GB.
- **Sync is the weakest link.** Apple Health and Health Connect only see what your wearable's companion app writes there, so most "missing data" reports are a sync problem in that other app. Turn Bluetooth on and sync there first.
- Wearable coverage and food data are not exhaustive. Missing inputs mean less confident insights.
- The banner above is **real iOS screenshots** from one tester's device — those values are personal data, not defaults.

## Help make private health the default

1. **Run a beta and report what broke.** [iPhone: one tap](#get-akosian-on-ios) · [Android: three links](#get-akosian-on-android). Real use finds the bugs that matter.
2. **Read the code and tell us what's wrong.** "This doesn't handle X" is worth more than a compliment.
3. **Send it to one person** who tracks their sleep or is tired of subscription health apps.
4. **[Star the repo](https://github.com/Pranesh950/Akosian)** — it's the main way other people find it.

Bug reports: phone model, OS version, app version, steps to reproduce — with health data, API keys, and personal details removed from screenshots and logs.

### What's next

Public availability on both stores · an automated test suite · broader device testing · better on-device AI · more languages. Have a different priority? [Open an issue](https://github.com/Pranesh950/Akosian/issues).

<details>
<summary><strong>Share text you can copy</strong></summary>

> Akosian is a free, open-source health app for sleep, recovery, food, and habits — optional on-device AI, no account, no subscription. iPhone beta (one tap): https://testflight.apple.com/join/HvNZzY4D · Android beta: https://github.com/Pranesh950/Akosian#get-akosian-on-android

Share the signup sections rather than a bare store link: iPhone testers need the TestFlight URL, and Android testers need group membership plus the opt-in before the listing works.

</details>

## License

[GNU GPL v3](LICENSE) or later. Inspect, modify, and redistribute under those terms; ship a modified version and it stays open under the same terms. Provided **without warranty**. Third-party names belong to their respective owners; Akosian isn't affiliated with the wearable or AI companies mentioned here.

---

<div align="center">

### Better health tools. Fewer strings attached.

[Install on iPhone](#get-akosian-on-ios) · [Install on Android](#get-akosian-on-android) · [Build from source](#build-it-yourself) · [Read the source](https://github.com/Pranesh950/Akosian)

<sub>Built by Pranesh Shivaraj.</sub>

</div>

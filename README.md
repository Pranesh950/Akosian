<div align="center">

<img src="assets/icon.png" alt="Akosian app icon" width="88" height="88" />

# Akosian

### Health should be private. And free.

**Your body is not a business model.**

Sleep, recovery, food, habits, and an optional AI coach.<br />
No Akosian account. No subscription. No ads. Open source.

[![Join the Android beta](https://img.shields.io/badge/Join_the_Android_beta-3DDC84?style=for-the-badge&logo=android&logoColor=202126)](#get-akosian-on-android)
[![Star Akosian](https://img.shields.io/github/stars/Pranesh950/Akosian?style=for-the-badge&logo=github&label=Star%20Akosian&color=E56F63)](https://github.com/Pranesh950/Akosian)
[![License: GPL v3](https://img.shields.io/badge/Open_source-GPLv3-202126?style=for-the-badge)](LICENSE)

**Android closed beta · iOS public testing link not available yet**

<img src="assets/brand/readme-hero.svg?v=2" alt="Akosian: Your health. Your phone. Your rules. Free, open source, local-first. Illustrated readiness, sleep, and food cards—not actual app screenshots." width="100%" />

**Your health data belongs with you. Not behind a monthly paywall.**

[Get the Android beta](#get-akosian-on-android) · [What you can do](#what-you-can-do) · [Privacy, plainly](#privacy-plainly) · [Build it yourself](#build-it-yourself)

</div>

## Get Akosian on Android

**Three links. One Google account. Follow them in order.**

| 1 · Join the group | 2 · Become a tester | 3 · Install the app |
| :--- | :--- | :--- |
| [**Join Akosian testers →**](https://groups.google.com/g/akosian) | [**Open the beta opt-in →**](https://play.google.com/apps/testing/com.myrri.app) | [**Download on Google Play →**](https://play.google.com/store/apps/details?id=com.myrri.app) |
| Sign in and choose **Join group**, or request membership if approval is required. | Once you're a group member, tap **Become a tester**. | Open the listing with the same account and tap **Install**. |

> **Important:** use the **same Google account** for the group, the tester opt-in, and Google Play. Google requires an account for beta access; **Akosian itself does not require an account**.

<details>
<summary><strong>Can't join, see the app, or install? Start here.</strong></summary>

- **Group says “Content unavailable”?** Sign in to Google, check the selected account, and reopen [the group](https://groups.google.com/g/akosian). If it still fails, [email the maintainer](mailto:pranesh.shivaraj.k@gmail.com?subject=Akosian%20Android%20beta%20access) for help. Don't post your email or health data in a public issue.
- **You requested membership?** Wait for approval before opening the tester opt-in link. A pending request is not membership.
- **“App not available for this account”?** Check that you joined the group and accepted the beta using the account selected in your Play Store. Reopen the opt-in page, then the store listing.
- **Still unavailable?** Closed-test access, supported devices, and country availability are controlled in Google Play. Send the maintainer the error text and your phone model; no health records needed.
- **No wearable?** Choose the no-device/manual setup. Food and habit logging don't require one. Health-based scores need the relevant health data.

</details>

**Want to help get Akosian out of closed testing?** Join, opt in, and try it in your normal routine. Google Play's production-access process can require at least **12 testers opted in continuously for 14 days**; eligibility and approval are determined by Google. Honest bug reports and real-world feedback matter more than perfect reviews.

**On iPhone?** There is no public TestFlight link listed yet. Watch this repository's [releases](https://github.com/Pranesh950/Akosian/releases) for availability. A GitHub star is appreciated, but it doesn't subscribe you to release notifications.

## Your health. Your phone. Your rules.

You already generated the data. You should be able to understand it without another subscription.

Akosian brings your health signals, meals, and everyday habits together in a **free, local-first wellness app**. Connect Apple Health or Android Health Connect, or start with manual tracking. Choose on-device AI, your own cloud API key, or no AI at all.

| What you shouldn't have to trade | The Akosian approach |
| :--- | :--- |
| **Money just to access core features** | No Akosian subscription or feature paywall. Optional cloud AI may cost money through your provider. |
| **Your privacy for a dashboard** | Core records and calculations stay on your device. Cloud AI is an explicit choice, not a requirement. |
| **An email address to start tracking** | No Akosian signup. Open the app and get started. |
| **A new wearable to participate** | Use compatible data from the wearable you own, or log manually. |
| **Blind trust in a black box** | GPLv3 source code you can inspect, modify, and build yourself. |

**No ads. No selling your health data. No “start your free trial” countdown.**

## What you can do

| | |
| :--- | :--- |
| **☀️ Make sense of your morning**<br />Readiness, sleep, strain, and a locally generated morning brief help you review your day—not just collect more numbers. | **🍎 Spend less time logging food**<br />Search the bundled offline food database, scan supported barcodes, or describe a meal to the optional AI food coach. |
| **📓 See the habits behind the numbers**<br />Track water, caffeine, mood, movement, and more. Review streaks and habit/readiness associations. Correlation is not causation. | **💬 Ask a coach with context**<br />The optional AI coach can use your health and journal context, help log meals, and work with your plan. Local AI depends on your phone. |
| **📈 Compare with your own baseline**<br />Readiness uses a rolling 21-day HRV/resting-heart-rate/sleep baseline. Available data affects what scores you can see. | **🧬 Explore a wellness age estimate**<br />An estimated index from available health signals, with uncertainty. Not a clinical biological-age test or diagnosis. |

### Pick your AI. Or skip it.

| Mode | Where it runs | What to know |
| :--- | :--- | :--- |
| **No AI** | Your phone | Core tracking, scores, food lookup, and morning briefs don't require an AI model or API key. |
| **On-device AI** | Your phone | Supported Apple/Gemini Nano system models or a downloaded local model. Inference stays local; initial model setup may need internet, storage, and a capable device. |
| **Bring your own key** | Your chosen cloud provider | Supports OpenAI, Anthropic, Gemini, and OpenRouter. Chat and relevant context leave your phone; provider pricing and privacy terms apply. Keys use OS secure storage. |

**The app is free. Optional third-party AI usage is not necessarily free.** Small local models can be slower and less capable than cloud models. You can use Akosian without either.

### Works with the data you already have

Akosian reads **Apple Health on iOS** and **Health Connect on Android**, with your permission. It doesn't connect directly to each wearable.

Apple Watch, Galaxy Watch, Pixel Watch, Garmin, Fitbit, Oura, WHOOP, and other devices can supply data **where their companion apps support syncing to your platform's health store**. Support varies by vendor, region, OS, and metric; some setups need a bridge. Having a supported brand does not guarantee every metric is available.

No wearable? Start with manual meals, habits, and supported manual metrics. Readiness and other health-based scores still need their underlying data.

## Privacy, plainly

**Private by default is a product decision, not a badge.**

- **No Akosian account, backend, ads, or analytics SDKs.**
- Core health records, journals, meals, and settings use **on-device storage**.
- Health permissions are your choice. Revoke them in Apple Health or Health Connect.
- **On-device AI inference stays on-device.** Model downloads and app-store services still need network access.
- **Cloud AI is optional.** When enabled, your chat and relevant context go directly to your selected provider. Identifier scrubbing is best-effort—not a guarantee of anonymity, and not removal of all sensitive health information.
- API keys are kept in **OS secure storage**, not an Akosian server. Your provider's billing and retention policies still apply.

Read the [full privacy policy](PRIVACY_POLICY.md) and inspect the [source](src/services). Keep private health information out of public bug reports and the tester group.

## Help make private health the default

You don't need to code to help.

1. **Try the [Android beta](#get-akosian-on-android).** Tell us what broke, what confused you, and what actually helped.
2. **[Star the repository](https://github.com/Pranesh950/Akosian).** Help other people discover an open-source alternative.
3. **Send it to one friend** who cares about privacy, tracks their sleep, or is tired of subscription-only health tools.

**A message you can copy:**

> Health should be private and free. Akosian is an open-source health app for sleep, recovery, food, and habits—with optional on-device AI, no Akosian account, and no subscription. Android beta signup: https://github.com/Pranesh950/Akosian#get-akosian-on-android

[![Share on X](https://img.shields.io/badge/Share_on_X-202126?style=for-the-badge&logo=x&logoColor=white)](https://twitter.com/intent/tweet?text=Health%20should%20be%20private%20and%20free.%20Akosian%20is%20an%20open-source%20health%20app%20with%20no%20subscription%20and%20optional%20on-device%20AI.%20Try%20the%20Android%20beta%3A&url=https%3A%2F%2Fgithub.com%2FPranesh950%2FAkosian%23get-akosian-on-android)
[![Share on WhatsApp](https://img.shields.io/badge/Send_to_a_friend-25D366?style=for-the-badge&logo=whatsapp&logoColor=white)](https://wa.me/?text=Health%20should%20be%20private%20and%20free.%20Try%20Akosian%2C%20an%20open-source%20health%20app%20with%20no%20subscription%20and%20optional%20on-device%20AI%3A%20https%3A%2F%2Fgithub.com%2FPranesh950%2FAkosian%23get-akosian-on-android)

**Please share the signup section, not just the Play Store listing.** Closed-beta users need group membership and the tester opt-in before they can install.

## Build it yourself

**Expo SDK 54 · React Native 0.81 · TypeScript · Expo Router · SQLite · HealthKit / Health Connect · AI SDK · llama.rn**

Prerequisites: Node **20.19+**, npm, and Android Studio or Xcode for local native builds. EAS builds require your own Expo project and signing credentials. This is a **native app**; Expo Go cannot load its health and AI native modules.

```bash
git clone https://github.com/Pranesh950/Akosian.git
cd Akosian
npm install

# Typecheck
npx tsc --noEmit

# Build and run a native development app
npx expo run:android
# On macOS with Xcode:
npx expo run:ios
```

Already installed a matching development build? Start Metro with `npx expo start --dev-client`.

```text
app/                    Screens, onboarding, chat, and detail views
src/services/           Health, scoring, journal, food, and coaching
src/services/ai/        AI agents, models, and tools
src/services/providers/ On-device engines and cloud-key configuration
src/components/         Charts, gauges, chat, and shared UI
modules/                Native integrations
plugins/                Expo native configuration
scripts/                Nutrition database and asset tooling
```

Nutrition data attribution: [OpenNutrition](src/data/OPENNUTRITION_ATTRIBUTION.md).

## Contribute

[Report a bug or suggest a feature](https://github.com/Pranesh950/Akosian/issues) · [Browse the source](https://github.com/Pranesh950/Akosian) · [Read the license](LICENSE)

Code, design, documentation, translations, accessibility improvements, and nutrition-data fixes are welcome. For a bug report, include your phone model, OS version, app version, and steps to reproduce. **Remove health data, API keys, and personal details from screenshots and logs.**

### What's next

- Public Android and iOS availability.
- More device testing and on-device AI improvements.
- More languages and accessibility polish.

Have a different priority? [Open an issue](https://github.com/Pranesh950/Akosian/issues).

## A few honest limits

- Akosian is a **wellness app, not a medical device**. Scores and AI responses are informational and can be wrong. They are not medical advice or a substitute for professional care.
- Wearable data quality and sync support vary. Missing inputs mean missing or less confident insights.
- The offline food database and barcode coverage aren't exhaustive. Check portions and nutrition estimates.
- On-device AI availability, speed, and memory requirements vary by phone. Core tracking works without it.
- The banner above is an **illustration**, not an actual app screenshot. This is beta software; expect rough edges.

## License

[GNU GPL v3](LICENSE), or any later version, under the terms in the license. You can inspect, modify, and redistribute the software under those terms. Provided **without warranty**. Third-party names belong to their respective owners; Akosian is not affiliated with the wearable or AI companies mentioned here.

---

<div align="center">

### Better health tools. Fewer strings attached.

**If that sounds like the future you want, help build it.**

[Join the Android beta](#get-akosian-on-android) · [Star Akosian](https://github.com/Pranesh950/Akosian) · [Share with a friend](#help-make-private-health-the-default)

<sub>Built by Pranesh Shivaraj. For people, not data brokers.</sub>

</div>

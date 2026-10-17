# Security policy

Akosian is a local-first health app: there is no Akosian account, no backend, and no server holding your data. That makes the threat model unusual and small — and it makes the few paths that *do* leave the device worth reporting loudly.

## Reporting a vulnerability

Email **pranesh.shivaraj.k@gmail.com** with `[Akosian security]` in the subject, or open a [private security advisory](https://github.com/Pranesh950/Akosian/security/advisories/new). Prefer the private advisory for anything that would hurt users if it were public.

This is a **solo-maintained beta with no bug bounty and no response SLA**. You will get a human reply, usually within a few days, and credit in the fix unless you would rather stay anonymous.

**Please redact:** health values, screenshots of your data, API keys, and anyone else's personal information. A description of the bug is enough — we do not need your records to reproduce it.

## In scope

- **Health data leaving the device.** Core records, journals, meals, and scores are meant to stay on-device. A code path that uploads them is the most serious bug you can find here.
- **API key handling.** Cloud provider keys are kept in `expo-secure-store` with `WHEN_UNLOCKED_THIS_DEVICE_ONLY`. Leakage through logs, error messages, crash output, exports, or the chat UI is in scope.
- **The on-device AI tool layer.** The AI is designed to *read* health data and compute scores, and is not supposed to be able to write health records. A prompt or a tool response that makes it write, delete, or silently alter health data is in scope — tool output is treated as untrusted input.
- **Model integrity.** A known gap rather than a surprise: GGUF models are downloaded over HTTPS from `huggingface.co` and are **not** verified against an independently published hash. (The food-database build *does* verify a published SHA-256.) A realistic tampering path is worth reporting.
- **Dependency and release integrity.** Anything that gets code into a build that the maintainer did not intend.

## Out of scope

- The **optional** cloud AI sending your chat and relevant context to the provider you configured. That is the feature. [PRIVACY_POLICY.md](PRIVACY_POLICY.md) says so, and identifier scrubbing is explicitly best-effort, not a guarantee of anonymity.
- Your wearable's companion app failing to sync data into HealthKit or Health Connect.
- Expired TestFlight builds, store-review delays, or other app-store process issues.
- Findings that need a rooted or jailbroken device, a malicious keyboard, or an unlocked phone in hand — unless they lead somewhere that matters, such as keys readable without your passcode.
- Raw scanner output with no demonstrated impact.

## Supported versions

Only the current beta build. This is pre-1.0 software: fixes land on `main` and appear in the next TestFlight or Play build, so please reproduce on the latest build before reporting.

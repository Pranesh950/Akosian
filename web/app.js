/* Akosian web demo — a small, dependency-free re-creation of the native app.
 * Everything in the phone is fake sample data. The only real network call is
 * the optional OpenRouter chat, sent directly from the browser to OpenRouter. */

const GOALS = [
  { id: "weight_loss", label: "Weight loss", emoji: "🔥", tagline: "Lose fat sustainably" },
  { id: "muscle_gain", label: "Muscle gain", emoji: "💪", tagline: "Add lean size" },
  { id: "body_recomp", label: "Body recomp", emoji: "⚖️", tagline: "Fat down, muscle up" },
  { id: "strength", label: "Strength", emoji: "🏋️", tagline: "Get stronger on the big lifts" },
  { id: "faster_running", label: "Faster running", emoji: "🏃", tagline: "Train smarter" },
  { id: "endurance", label: "Endurance", emoji: "🚴", tagline: "Go further, last longer" },
  { id: "injury_recovery", label: "Injury recovery", emoji: "🩹", tagline: "Return stronger, safely" },
  { id: "better_sleep", label: "Better sleep", emoji: "😴", tagline: "Fall asleep faster" },
  { id: "stress_hrv", label: "Stress & HRV", emoji: "🧘", tagline: "Calm the nervous system" },
  { id: "general_health", label: "General health", emoji: "🌿", tagline: "Move daily, sleep well" },
];

const DEVICES = [
  { id: "apple", label: "Apple Watch", icon: "watch", desc: "Syncs directly with Apple Health", color: "#5B7BE1" },
  { id: "samsung", label: "Samsung Galaxy Watch", icon: "watch", desc: "Syncs via Samsung Health", color: "#55A477" },
  { id: "googlefit", label: "Pixel Watch", icon: "watch-variant", desc: "Syncs via Google Fit", color: "#E56F63" },
  { id: "garmin", label: "Garmin", icon: "watch-variant", desc: "Syncs via Health Connect / Apple Health", color: "#D69A43" },
  { id: "fitbit", label: "Fitbit", icon: "watch-variant", desc: "Syncs via Health Connect / Apple Health", color: "#8A72C8" },
  { id: "oura", label: "Oura Ring", icon: "ring", desc: "Syncs via Health Connect / Apple Health", color: "#6B83A5" },
  { id: "whoop", label: "WHOOP", icon: "watch", desc: "Syncs via Health Connect / Apple Health", color: "#C96D63" },
  { id: "other", label: "No device", icon: "cellphone", desc: "Track manually", color: "#9698A1" },
];

const AI_MODES = [
  {
    id: "api",
    title: "API key",
    badge: "WEB DEMO",
    badgeClass: "green",
    sub: "OPENROUTER · FREE MODELS",
    desc: "Paste an OpenRouter key and chat with the coach right here. The key stays in this tab's memory and is never saved.",
    icon: "key-outline",
  },
  {
    id: "local",
    title: "Local AI",
    badge: "PHONE ONLY",
    badgeClass: "amber",
    sub: "ON-DEVICE",
    desc: "Apple Foundation Models, Gemini Nano, or llama.cpp need the native app. Install Akosian to run a model on your phone.",
    icon: "cellphone-lock",
    locked: true,
  },
  {
    id: "none",
    title: "No AI",
    badge: "PHONE ONLY",
    badgeClass: "gray",
    sub: "OFFLINE · PRIVACY MAX",
    desc: "On your phone, every health, journal, and food feature still works without AI. In this demo, use the key option or skip for now.",
    icon: "robot-off-outline",
    locked: true,
  },
];

const PROVIDERS = [
  { id: "openrouter", label: "OpenRouter", initial: "OR", free: true, locked: false },
  { id: "openai", label: "OpenAI", initial: "O", free: false, locked: true },
  { id: "anthropic", label: "Anthropic", initial: "A", free: false, locked: true },
  { id: "gemini", label: "Gemini", initial: "G", free: false, locked: true },
];

const DEMO = {
  sleepScore: 82,
  strainScore: 61,
  steps: 8432,
  activeCalories: 620,
  distance: "6.4 km",
  hrv: 58,
  restingHr: 54,
  avgHr: 72,
  sleepHours: 7.7,
  respiratory: 14.2,
  oxygen: 98,
  weight: 74.2,
  bodyFat: 18.4,
  leanMass: 60.4,
  vo2Max: 48.2,
  bioAge: 27.4,
  caloriesEaten: 1428,
  caloriesTarget: 2100,
  protein: 112,
  proteinTarget: 150,
  carbs: 148,
  carbsTarget: 230,
  fat: 48,
  fatTarget: 70,
};

const SYSTEM_PROMPT = `You are the Akosian health coach inside a browser demo. Be concise, warm, and practical.
The data below is fake sample data for the demo:
- Sleep 7h 42m, sleep score 82, goal 8h.
- HRV 58 ms (slightly above the 21-day baseline), resting HR 54 bpm, respiratory rate 14.2, SpO2 98%.
- 8,432 steps, 620 active calories, 6.4 km.
- Food: 1,428 of 2,100 kcal, 112/150 g protein, 148/230 g carbs, 48/70 g fat.
- Workouts this month: 12 sessions, 9h 20m active.
- Goals: Better sleep and Stress & HRV.
The coach can read health and journal context, suggest meals, and adjust the plan. Never claim to diagnose or treat.
Keep answers under 120 words unless asked for detail.`;

const initialJournal = () => ({
  habits: { water: true, caffeine: false, mood: true, steps: true, sleep: false },
});

const initialState = () => ({
  screen: "device",
  tab: "home",
  onboarding: {
    device: null,
    age: "29",
    sex: "male",
    height: "178",
    weight: "74",
    goals: ["better_sleep", "stress_hrv"],
    trainingDays: 3,
    activity: "light",
  },
  aiMode: "api",
  provider: "openrouter",
  apiKey: "",
  model: "openrouter/free",
  testState: null,
  messages: [],
  chatMode: "health",
  chatInput: "",
  typing: false,
  menuOpen: false,
  modal: null,
  toast: null,
  journal: initialJournal(),
});

let state = initialState();
let toastTimer = null;

const app = document.getElementById("app");
const modalRoot = document.getElementById("app-modal");

/* ---------------- helpers ---------------- */

const esc = (value) =>
  String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

const mdi = (name) => `<i class="mdi mdi-${name}" aria-hidden="true"></i>`;

function friendlyDate() {
  return new Date().toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  });
}

function sleepLabel(hours) {
  const h = Math.floor(hours);
  const m = Math.round((hours - h) * 60);
  return `${h}h ${String(m).padStart(2, "0")}m`;
}

function goalById(id) {
  return GOALS.find((g) => g.id === id);
}

function showToast(message) {
  state.toast = message;
  render();
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => {
    state.toast = null;
    render();
  }, 2800);
}

function render(options = {}) {
  const previous = app.querySelector(".app-scroll, .tab-scroll, .chat-messages");
  const previousScroll = previous ? previous.scrollTop : 0;

  app.innerHTML = screenFor(state.screen);
  renderModal();

  if (state.screen === "chat" || options.scrollBottom) {
    const messages = app.querySelector(".chat-messages");
    if (messages) messages.scrollTop = messages.scrollHeight;
  } else {
    const next = app.querySelector(".app-scroll, .tab-scroll");
    if (next) next.scrollTop = previousScroll;
  }

  if (state.toast) {
    const toast = document.createElement("div");
    toast.className = "toast";
    toast.textContent = state.toast;
    app.querySelector(".app")?.appendChild(toast);
  }
}

function statusBar() {
  return `<div class="status-bar">
    <span>9:41</span>
    <span class="status-icons">${mdi("signal")}${mdi("wifi")}${mdi("battery")}</span>
  </div>`;
}

function backButton() {
  return `<button type="button" class="back-btn" data-action="back" aria-label="Go back">${mdi("arrow-left")}</button>`;
}

function onboardingShell({ content, footer = "", back = true }) {
  return `<div class="app"><div class="onb">
    <div class="wash"></div>
    ${statusBar()}
    <div class="onb-scroll">
      ${back ? backButton() : ""}
      ${content}
    </div>
    ${footer ? `<div class="onb-footer">${footer}</div>` : ""}
  </div></div>`;
}

function footerButton(label, action, { disabled = false, icon = "arrow-right", extra = "" } = {}) {
  return `<button type="button" class="footer-btn" data-action="${action}" ${disabled ? "disabled" : ""}>${label}${icon ? mdi(icon) : ""}</button>${extra}`;
}

/* ---------------- screens ---------------- */

function screenFor(screen) {
  switch (screen) {
    case "device":
      return deviceScreen();
    case "profile":
      return profileScreen();
    case "ai":
      return aiScreen();
    case "byok":
      return byokScreen();
    case "goals":
      return goalsScreen();
    case "complete":
      return completeScreen();
    case "tabs":
      return tabsScreen();
    case "chat":
      return chatScreen();
    default:
      return deviceScreen();
  }
}

function deviceScreen() {
  const rows = DEVICES.map((device) => `
    <button type="button" class="device-row" data-action="select-device" data-value="${device.id}">
      <span class="device-icon" style="background:${device.color}14;color:${device.color}">${mdi(device.icon)}</span>
      <span class="device-info"><strong>${device.label}</strong><span>${device.desc}</span></span>
      ${mdi("chevron-right")}
    </button>`).join("");

  return onboardingShell({
    back: false,
    content: `
      <div class="onb-header">
        <div class="eyebrow-row"><span class="dot"></span><span>1 of 3 · Connect</span></div>
        <h2 class="onb-title">What do you wear?</h2>
        <p class="onb-sub">Connect a device for automatic data, or continue without one. In this demo the sync is simulated.</p>
      </div>
      <div class="device-list">${rows}</div>
      <div class="note-card">${mdi("information-outline")}<span>Health access is native-only. The demo shows a realistic sample day so you can explore the rest of the app.</span></div>
    `,
  });
}

function profileScreen() {
  const sexOptions = [
    { id: "female", label: "Female", desc: "Use female reference ranges" },
    { id: "male", label: "Male", desc: "Use male reference ranges" },
    { id: "unspecified", label: "Prefer not to say", desc: "Use sex-neutral ranges" },
  ];
  const o = state.onboarding;

  return onboardingShell({
    content: `
      <div class="onb-header">
        <div class="eyebrow-row"><span class="dot"></span><span>2 of 3 · Personalize</span></div>
        <h2 class="onb-title">A little about you</h2>
        <p class="onb-sub">Personalizes calorie targets and sharpens your biological-age estimate — a wellness index, not a medical diagnosis.</p>
      </div>

      <div class="form-section">
        <div class="form-label"><span>Chronological age</span></div>
        <label class="input-wrap">
          <input type="number" inputmode="numeric" value="${esc(o.age)}" data-field="age" min="18" max="100" aria-label="Age" />
          <span class="unit">years</span>
        </label>
        <p class="form-hint">Used to compare your metrics with age-matched ranges. Kept on-device.</p>
      </div>

      <div class="form-section">
        <div class="form-label"><span>Height</span></div>
        <label class="input-wrap">
          <input type="number" inputmode="decimal" value="${esc(o.height)}" data-field="height" aria-label="Height in centimetres" />
          <span class="unit">cm</span>
        </label>
        <p class="form-hint">Optional · personalizes calorie targets and BMI.</p>
      </div>

      <div class="form-section">
        <div class="form-label"><span>Weight</span></div>
        <label class="input-wrap">
          <input type="number" inputmode="decimal" value="${esc(o.weight)}" data-field="weight" aria-label="Weight in kilograms" />
          <span class="unit">kg</span>
        </label>
        <p class="form-hint">Optional · calorie and protein targets. Your tracker can update it.</p>
      </div>

      <div class="form-section">
        <div class="form-label"><span>Biological sex</span></div>
        <div class="option-list">
          ${sexOptions.map((option) => `
            <button type="button" class="option-row ${o.sex === option.id ? "selected" : ""}" data-action="select-sex" data-value="${option.id}">
              <span class="option-radio">${mdi(o.sex === option.id ? "check" : "circle-outline")}</span>
              <span><strong>${option.label}</strong><small>${option.desc}</small></span>
            </button>`).join("")}
        </div>
      </div>

      <div class="note-card">${mdi("lock-outline")}<span>Your profile stays on this device and can be changed later.</span></div>
    `,
    footer: footerButton("Continue", "profile-continue"),
  });
}

function aiScreen() {
  const cards = AI_MODES.map((mode) => {
    const selected = state.aiMode === mode.id;
    return `<button type="button" class="choice-card ${selected ? "selected" : ""} ${mode.locked ? "locked" : ""}" data-action="select-ai" data-value="${mode.id}">
      <span class="choice-top">
        <span class="choice-icon">${mdi(mode.icon)}</span>
        <span class="choice-heading">
          <span class="choice-title-row"><span class="choice-title">${mode.title}</span><span class="badge ${mode.badgeClass}">${mode.badge}</span></span>
          <span class="choice-sub">${mode.sub}</span>
        </span>
        <span class="choice-radio">${mode.locked ? mdi("lock-outline") : ""}</span>
      </span>
      <span class="choice-desc">${mode.desc}</span>
    </button>`;
  }).join("");

  return onboardingShell({
    content: `
      <div class="onb-header">
        <div class="eyebrow-row"><span class="dot"></span><span>3 of 3 · Your AI</span></div>
        <h2 class="onb-title">Choose how your assistant runs</h2>
        <p class="onb-sub">Bring a key here, or install Akosian to use on-device AI or skip the assistant entirely.</p>
      </div>
      <div class="choice-list">${cards}</div>

      <div class="info-card">
        <span class="info-icon">${mdi("key-outline")}</span>
        <div>
          <strong>How the demo key is handled</strong>
          <p>It stays in this tab's memory, is never saved to disk, and is sent only to OpenRouter. Reload the page and it's gone.</p>
        </div>
      </div>

      <div class="info-card">
        <span class="info-icon">${mdi("hand-coin-outline")}</span>
        <div>
          <strong>We don't earn money from any of them</strong>
          <p>All options are free to set up and we take no commission. Any API usage goes straight to your provider.</p>
        </div>
      </div>
    `,
    footer: footerButton("Continue with API key", "ai-continue", {
      extra: `<button type="button" class="text-link" data-action="skip-ai">Skip AI for now</button>`,
    }),
  });
}

function byokScreen() {
  const providers = PROVIDERS.map((provider) => `
    <button type="button" class="provider-card ${state.provider === provider.id ? "selected" : ""} ${provider.locked ? "locked" : ""}" data-action="select-provider" data-value="${provider.id}">
      <span class="provider-avatar">${provider.initial}</span>
      <span>${provider.label}${provider.free ? '<span class="free">FREE · RECOMMENDED</span>' : ""}</span>
    </button>`).join("");

  const test = state.testState;
  const testResult = !test
    ? ""
    : test.status === "testing"
      ? `<div class="test-result ok">${mdi("loading")} Testing the connection…</div>`
      : `<div class="test-result ${test.ok ? "ok" : "fail"}">${mdi(test.ok ? "check-circle" : "alert-circle-outline")}<span>${esc(test.message)}</span></div>`;

  return onboardingShell({
    content: `
      <div class="onb-header">
        <div class="eyebrow-row"><span class="dot"></span><span>Bring your own key</span></div>
        <h2 class="onb-title">Add your AI key</h2>
        <p class="onb-sub">The web demo supports OpenRouter keys in the browser. Your key is kept in memory and sent only to OpenRouter.</p>
      </div>

      <div class="form-section">
        <div class="form-label"><span>Provider</span></div>
        <div class="provider-grid">${providers}</div>
      </div>

      <div class="form-section">
        <div class="form-label"><span>OpenRouter API key</span></div>
        <label class="key-input">
          ${mdi("key-outline")}
          <input type="password" value="${esc(state.apiKey)}" data-field="apiKey" placeholder="sk-or-v1-…" autocomplete="off" spellcheck="false" aria-label="OpenRouter API key" />
        </label>
        <p class="form-hint">Get a free key at <a class="inline-link" href="https://openrouter.ai/settings/keys" target="_blank" rel="noopener">openrouter.ai/settings/keys</a>. A free account works.</p>
      </div>

      <div class="form-section">
        <div class="form-label"><span>Model</span></div>
        <input class="text-input" type="text" value="${esc(state.model)}" data-field="model" placeholder="openrouter/free" autocomplete="off" spellcheck="false" aria-label="Model" />
        <p class="form-hint">Leave the default <strong>openrouter/free</strong> to use a free model router.</p>
      </div>

      <button type="button" class="test-row" data-action="test-key" ${state.apiKey.trim() ? "" : "disabled"}>
        ${mdi("flash-outline")} ${test && test.status === "testing" ? "Testing…" : "Test connection"}
      </button>
      ${testResult}

      <div class="note-card">${mdi("shield-lock-outline")}<span>On your phone, keys live in OS secure storage. In this browser demo the key is never persisted.</span></div>
    `,
    footer: footerButton("Save & continue", "save-key", {
      disabled: !state.apiKey.trim(),
      extra: `<button type="button" class="text-link" data-action="skip-ai">Continue without a key</button>`,
    }),
  });
}

function goalsScreen() {
  const o = state.onboarding;
  const cards = GOALS.map((goal) => `
    <button type="button" class="goal-card ${o.goals.includes(goal.id) ? "selected" : ""}" data-action="toggle-goal" data-value="${goal.id}">
      ${o.goals.includes(goal.id) ? `<span class="goal-check">${mdi("check")}</span>` : ""}
      <span class="goal-emoji">${goal.emoji}</span>
      <strong>${goal.label}</strong>
      <small>${goal.tagline}</small>
    </button>`).join("");

  const training = [1, 3, 5].map((days) => `
    <button type="button" class="segment ${o.trainingDays === days ? "active" : ""}" data-action="set-training" data-value="${days}">
      <strong>${days === 1 ? "1–2" : days === 3 ? "3–4" : "5+"}</strong>
      <span>days / wk</span>
    </button>`).join("");

  const activities = [
    { id: "sedentary", label: "Sedentary" },
    { id: "light", label: "Light" },
    { id: "moderate", label: "Moderate" },
    { id: "active", label: "Active" },
  ].map((activity) => `
    <button type="button" class="chip ${o.activity === activity.id ? "active" : ""}" data-action="set-activity" data-value="${activity.id}">${activity.label}</button>`).join("");

  return onboardingShell({
    content: `
      <div class="onb-header">
        <div class="eyebrow-row"><span class="dot"></span><span>Your coach plan</span></div>
        <h2 class="onb-title">What are your goals?</h2>
        <p class="onb-sub">Pick one or two — we'll build a plan of habits, nutrition, and sleep goals that runs across the app.</p>
      </div>

      <div class="goal-grid">${cards}</div>

      <div class="question-section">
        <p class="question-title">How often can you train each week?</p>
        <div class="segmented-row">${training}</div>
      </div>

      <div class="question-section">
        <p class="question-title">Your overall activity level</p>
        <div class="chip-wrap">${activities}</div>
        <p class="form-hint">Used to estimate your calorie targets. Tune it later with your coach.</p>
      </div>

      <div class="estimate-card">${mdi("creation-outline")}<span>Built from our goal library — ask Coach to adjust it anytime.</span></div>
    `,
    footer: footerButton(
      o.goals.length === 0 ? "Select a goal" : `Build my plan${o.goals.length > 1 ? ` (${o.goals.length})` : ""}`,
      "build-plan",
      { disabled: o.goals.length === 0 }
    ),
  });
}

function completeScreen() {
  const o = state.onboarding;
  const labels = o.goals.map((id) => goalById(id)?.label).filter(Boolean);

  return `<div class="app">
    ${statusBar()}
    <div class="wash"></div>
    <div class="complete-wrap">
      <div class="complete-body">
        <div class="check-circle">${mdi("check")}</div>
        <h2>You're all set</h2>
        <p>Your sample day is ready. Change anything later in Settings — or install the app for real health data.</p>
        <div class="plan-card">
          <div class="plan-head">${mdi("creation")}<span>Your coach plan</span></div>
          <p class="plan-goals">${labels.length ? labels.join(" + ") : "Your custom plan"}</p>
          <div class="plan-row">${mdi("format-list-checks")}<span>Habits ready in the Journal</span></div>
          <div class="plan-row">${mdi("food-apple-outline")}<span>Nutrition targets under your food log</span></div>
          <div class="plan-row">${mdi("weather-night")}<span>Sleep goal on the Home dial</span></div>
          <div class="plan-row">${mdi("robot-outline")}<span>${state.apiKey ? "API key connected for chat" : "Ask Coach once you add a key"}</span></div>
        </div>
      </div>
      <div class="onb-footer" style="padding-left:0;padding-right:0">
        ${footerButton("Get started", "finish-onboarding", { icon: "" })}
      </div>
    </div>
  </div>`;
}

/* ---------------- tabs ---------------- */

function tabsScreen() {
  const head =
    state.tab === "home"
      ? `<div class="tab-head">
          <div><h1>Overview</h1><p class="date">${friendlyDate()}</p></div>
          <div class="tab-head-actions">
            <button type="button" class="icon-btn" data-action="sync" aria-label="Sync health data">${mdi("sync")}</button>
            <button type="button" class="icon-btn" data-action="open-settings" aria-label="Settings">${mdi("cog-outline")}</button>
            <span class="status-pill"><span class="status-dot"></span>Connected</span>
          </div>
        </div>`
      : state.tab === "journal"
        ? `<div class="tab-head"><div><h1>Journal</h1><p class="date">${friendlyDate()}</p></div><div class="tab-head-actions"><button type="button" class="icon-btn" data-action="open-settings" aria-label="Settings">${mdi("cog-outline")}</button></div></div>`
        : state.tab === "activity"
          ? `<div class="tab-head"><div><h1>Fitness</h1><p class="date">Last 30 days</p></div><div class="tab-head-actions"><button type="button" class="icon-btn" data-action="sync" aria-label="Sync workouts">${mdi("sync")}</button><button type="button" class="icon-btn" data-action="open-settings" aria-label="Settings">${mdi("cog-outline")}</button></div></div>`
          : `<div class="tab-head"><div><h1>Biology</h1><p class="date">${friendlyDate()}</p></div><div class="tab-head-actions"><button type="button" class="icon-btn" data-action="open-settings" aria-label="Settings">${mdi("cog-outline")}</button></div></div>`;

  const content =
    state.tab === "home"
      ? homeContent()
      : state.tab === "journal"
        ? journalContent()
        : state.tab === "activity"
          ? activityContent()
          : biologyContent();

  return `<div class="app">
    <div class="tab-screen">
      ${statusBar()}
      <div class="wash"></div>
      ${head}
      <div class="tab-scroll">${content}</div>
      ${state.menuOpen ? '<div class="menu-scrim" data-action="close-menu"></div>' : ""}
      ${state.menuOpen ? quickMenu() : ""}
      ${bottomNav()}
    </div>
  </div>`;
}

function describeArc(cx, cy, radius, startAngle, endAngle) {
  const polar = (angle) => {
    const rad = ((angle - 90) * Math.PI) / 180;
    return { x: cx + radius * Math.cos(rad), y: cy + radius * Math.sin(rad) };
  };
  const start = polar(startAngle);
  const end = polar(endAngle);
  const large = endAngle - startAngle <= 180 ? "0" : "1";
  return `M ${start.x.toFixed(2)} ${start.y.toFixed(2)} A ${radius} ${radius} 0 ${large} 1 ${end.x.toFixed(2)} ${end.y.toFixed(2)}`;
}

function gauge(score, color, label, caption = "", captionHit = false) {
  const segments = 10;
  const total = 170;
  const start = 360 - total / 2;
  const span = total / segments;
  const gap = 2;
  const filled = Math.round((score / 100) * segments);
  const cx = 69;
  const cy = 55;
  const radius = 52;

  let paths = "";
  for (let i = 0; i < segments; i += 1) {
    const segStart = start + i * span;
    const segEnd = segStart + span - gap;
    paths += `<path d="${describeArc(cx, cy, radius, segStart, segEnd)}" stroke="${i < filled ? color : "#E7E8EC"}" stroke-width="5.5" fill="none" opacity="${i < filled ? 1 : 0.55}" />`;
  }

  return `<div class="gauge">
    <svg viewBox="0 0 138 74" role="img" aria-label="${label} score ${score}">${paths}</svg>
    <div class="gauge-score" style="color:${color}">${score}</div>
    <div class="gauge-label">${label}</div>
    ${caption ? `<div class="gauge-caption ${captionHit ? "hit" : ""}">${caption}</div>` : ""}
  </div>`;
}

function vitalCard(label, value, unit, icon, color) {
  return `<div class="vital-card">
    <span class="vital-accent" style="background:${color}"></span>
    <div class="vital-top">
      <span class="vital-icon" style="background:${color}14;color:${color}">${mdi(icon)}</span>
      <span class="vital-label">${label}</span>
    </div>
    <div class="vital-value-row"><span class="vital-value">${value}</span>${unit ? `<span class="vital-unit">${unit}</span>` : ""}</div>
  </div>`;
}

function homeContent() {
  const d = DEMO;
  return `
    <div class="card gauges-card">
      <div class="gauge-wrap" data-action="open-sleep" role="button" tabindex="0">
        ${gauge(d.sleepScore, "#6B83A5", "Sleep", `${sleepLabel(d.sleepHours)} of 8h goal`, true)}
      </div>
      <div class="gauge-divider"></div>
      <div class="gauge-wrap" data-action="open-strain" role="button" tabindex="0">
        ${gauge(d.strainScore, "#C96D63", "Strain")}
      </div>
    </div>

    <p class="section-title">Today</p>
    <div class="snapshot-row">
      <div class="snapshot-card">
        <span class="snapshot-icon" style="background:rgba(85,164,119,.1);color:#55A477">${mdi("shoe-print")}</span>
        <div class="snapshot-label">Steps</div>
        <div class="snapshot-value">${d.steps.toLocaleString()}</div>
      </div>
      <div class="snapshot-card">
        <span class="snapshot-icon" style="background:rgba(214,154,67,.1);color:#D69A43">${mdi("fire")}</span>
        <div class="snapshot-label">Active cal</div>
        <div class="snapshot-value">${d.activeCalories}</div>
        <div class="snapshot-unit">kcal</div>
      </div>
      <div class="snapshot-card">
        <span class="snapshot-icon" style="background:rgba(91,123,225,.1);color:#5B7BE1">${mdi("map-marker-distance")}</span>
        <div class="snapshot-label">Distance</div>
        <div class="snapshot-value" style="font-size:16px">${d.distance}</div>
      </div>
    </div>

    <p class="section-title">Vitals</p>
    <div class="vital-grid">
      ${vitalCard("HRV", d.hrv, "ms", "waveform", "#E56F63")}
      ${vitalCard("Resting HR", d.restingHr, "bpm", "heart-pulse", "#E56F63")}
      ${vitalCard("Sleep", sleepLabel(d.sleepHours), "", "weather-night", "#6B83A5")}
      ${vitalCard("Resp. rate", d.respiratory, "rpm", "lungs", "#6B83A5")}
      ${vitalCard("Blood O₂", d.oxygen, "%", "water-outline", "#E56F63")}
      ${vitalCard("Avg HR", d.avgHr, "bpm", "heart-outline", "#E56F63")}
    </div>

    <button type="button" class="card coach-card" data-action="open-chat" data-value="health">
      <span class="coach-icon">${mdi("robot-outline")}</span>
      <span class="coach-copy"><strong>Ask your coach</strong><small>${state.apiKey ? "Connected to OpenRouter" : "Demo replies until you add a key"}</small></span>
      ${mdi("chevron-right")}
    </button>

    <div class="note-card" style="margin-top:14px">${mdi("flask-outline")}<span>Sample data for the demo. The installed app reads Apple Health or Health Connect.</span></div>
  `;
}

function journalContent() {
  const d = DEMO;
  const now = new Date();
  const dayNames = ["S", "M", "T", "W", "T", "F", "S"];
  const calendar = [];
  for (let offset = -3; offset <= 3; offset += 1) {
    const day = new Date(now);
    day.setDate(now.getDate() + offset);
    calendar.push({
      label: dayNames[day.getDay()],
      date: day.getDate(),
      today: offset === 0,
    });
  }

  const macro = (label, value, target, color) => `
    <div>
      <div class="macro-top"><span>${label}</span><span>${value} / ${target} g</span></div>
      <div class="macro-bar"><i style="width:${Math.min(100, (value / target) * 100)}%;background:${color}"></i></div>
    </div>`;

  const meals = [
    { emoji: "🥣", name: "Breakfast", kcal: 412, items: [["Greek yogurt + berries", "212 kcal"], ["Granola", "200 kcal"]] },
    { emoji: "🥗", name: "Lunch", kcal: 548, items: [["Chicken rice bowl", "548 kcal"]] },
    { emoji: "🍎", name: "Snacks", kcal: 218, items: [["Apple", "95 kcal"], ["Almonds", "123 kcal"]] },
    { emoji: "🍽️", name: "Dinner", kcal: 250, items: [["Planned: salmon + greens", "250 kcal"]] },
  ];

  const habit = (key, emoji, label, sub) => {
    const done = state.journal.habits[key];
    return `<button type="button" class="card habit-card" data-action="toggle-habit" data-value="${key}">
      <span class="habit-emoji">${emoji}</span>
      <span class="habit-copy"><strong>${label}</strong><small>${sub}</small></span>
      <span class="habit-check ${done ? "done" : ""}">${mdi("check")}</span>
    </button>`;
  };

  return `
    <div class="calendar-strip">
      ${calendar.map((day) => `<div class="calendar-day ${day.today ? "today" : ""}"><span>${day.label}</span><strong>${day.date}</strong></div>`).join("")}
    </div>

    <div class="card calorie-card">
      <div class="calorie-head">
        <div><h3>Calories eaten</h3><div class="calorie-value">${d.caloriesEaten.toLocaleString()} <small>/ ${d.caloriesTarget.toLocaleString()} kcal</small></div></div>
        <span class="tag tag-green">On track</span>
      </div>
      <div class="macro-row">
        ${macro("Protein", d.protein, d.proteinTarget, "#55A477")}
        ${macro("Carbs", d.carbs, d.carbsTarget, "#5B7BE1")}
        ${macro("Fat", d.fat, d.fatTarget, "#D69A43")}
      </div>
    </div>

    <p class="section-title">Meals</p>
    ${meals.map((meal) => `
      <div class="card meal-card">
        <div class="meal-head"><span class="meal-emoji">${meal.emoji}</span><strong>${meal.name}</strong><span>${meal.kcal} kcal</span></div>
        ${meal.items.map(([name, kcal]) => `<div class="meal-item"><span>${name}</span><span>${kcal}</span></div>`).join("")}
      </div>`).join("")}

    <p class="section-title">Habits</p>
    ${habit("water", "💧", "Water", "1.8 L of 2.5 L")}
    ${habit("caffeine", "☕", "Caffeine", "2 of 3 cups")}
    ${habit("mood", "🙂", "Mood", "Logged as good")}
    ${habit("steps", "👟", "Steps", "8,432 of 10,000")}
    ${habit("sleep", "🌙", "Wind-down", "No screens after 10:30")}

    <div class="note-card">${mdi("information-outline")}<span>Tap a habit to toggle it. The phone app also supports custom habits, amounts, and streaks.</span></div>
  `;
}

function activityContent() {
  const bars = [18, 34, 0, 46, 28, 0, 56, 22, 62, 40, 0, 48, 70, 30];
  return `
    <div class="card summary-card">
      <div class="summary-head"><strong>Activity summary</strong><span>↑ 18% vs last month</span></div>
      <div class="summary-stats">
        <div><strong>12</strong><span>Workouts</span></div>
        <div><strong>9h 20m</strong><span>Active time</span></div>
        <div><strong>61</strong><span>Avg strain</span></div>
      </div>
    </div>

    <p class="section-title">Training load</p>
    <div class="card bars-card">
      <div class="bars">
        ${bars.map((height, index) => `<div class="bar ${height > 0 ? "active" : ""}" style="height:${Math.max(4, height)}%;opacity:${0.55 + (index / bars.length) * 0.45}"></div>`).join("")}
      </div>
      <div class="bars-axis"><span>Sep 24</span><span>Oct 8</span><span>Oct 23</span></div>
    </div>

    <p class="section-title">Recent workouts</p>
    <button type="button" class="card workout-card" data-action="workout" data-value="Morning Run">
      <span class="workout-icon">${mdi("run-fast")}</span>
      <span class="workout-copy"><strong>Morning Run</strong><small>Today · 6:42 AM</small><span class="workout-meta"><span>5.2 km</span><span>31 min</span><span>412 cal</span></span></span>
      ${mdi("chevron-right")}
    </button>
    <button type="button" class="card workout-card" data-action="workout" data-value="Upper Body">
      <span class="workout-icon" style="background:rgba(138,114,200,.12);color:#8A72C8">${mdi("dumbbell")}</span>
      <span class="workout-copy"><strong>Upper Body</strong><small>Yesterday · 5:18 PM</small><span class="workout-meta"><span>48 min</span><span>286 cal</span><span>118 bpm</span></span></span>
      ${mdi("chevron-right")}
    </button>
    <button type="button" class="card workout-card" data-action="workout" data-value="Evening Walk">
      <span class="workout-icon" style="background:rgba(91,123,225,.12);color:#5B7BE1">${mdi("walk")}</span>
      <span class="workout-copy"><strong>Evening Walk</strong><small>Mon · 7:05 PM</small><span class="workout-meta"><span>3.8 km</span><span>44 min</span><span>176 cal</span></span></span>
      ${mdi("chevron-right")}
    </button>

    <div class="note-card">${mdi("information-outline")}<span>Workouts come from Health Connect or Apple Health in the real app. These are sample sessions.</span></div>
  `;
}

function sparkline(color, points = [8, 13, 10, 16, 12, 18, 15, 21]) {
  const width = 120;
  const height = 24;
  const max = Math.max(...points);
  const min = Math.min(...points);
  const coords = points.map((point, index) => {
    const x = (index / (points.length - 1)) * width;
    const y = height - 2 - ((point - min) / Math.max(1, max - min)) * (height - 6);
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  });
  return `<svg class="spark" viewBox="0 0 ${width} ${height}" preserveAspectRatio="none" aria-hidden="true">
    <polyline points="${coords.join(" ")}" fill="none" stroke="${color}" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" opacity="0.9" />
  </svg>`;
}

function biomarker(label, value, unit, sub, icon) {
  return `<button type="button" class="card biomarker-card" data-action="biomarker" data-value="${label}">
    <div class="biomarker-head"><span class="biomarker-label">${label}</span>${mdi(icon)}</div>
    <div class="biomarker-value">${value}<small>${unit}</small></div>
    <div class="biomarker-sub">${sub}</div>
    ${sparkline("#5B7BE1")}
  </button>`;
}

function biologyContent() {
  const d = DEMO;
  return `
    <div class="bio-hero">
      <div class="eyebrow">Physiological age</div>
      <div class="bio-age">${d.bioAge}<small> years</small></div>
      <div class="bio-badge">${mdi("arrow-down")} 2.3 years younger than your age</div>
      <p class="bio-note">A wellness index from the signals you have, shown with uncertainty. Not a clinical test or a diagnosis.</p>
    </div>

    <p class="section-title">Biomarkers</p>
    <div class="biomarker-grid">
      ${biomarker("Weight", d.weight, "kg", "−0.4 kg this month", "scale-bathroom")}
      ${biomarker("HRV", d.hrv, "ms", "Above your 21-day baseline", "waveform")}
      ${biomarker("Resting HR", d.restingHr, "bpm", "3 bpm lower this month", "heart-pulse")}
      ${biomarker("Body fat", d.bodyFat, "%", "−0.6% this month", "percent-outline")}
      ${biomarker("Lean mass", d.leanMass, "kg", "Holding steady", "arm-flex")}
      ${biomarker("VO₂ max", d.vo2Max, "mL/kg/min", "Top 20% for your age", "run-fast")}
      ${biomarker("Blood O₂", d.oxygen, "%", "Within your range", "water-outline")}
      ${biomarker("Sleep", sleepLabel(d.sleepHours), "", "82 sleep score", "weather-night")}
    </div>

    <div class="note-card">${mdi("information-outline")}<span>Tap a biomarker on your phone to see its full trend and log a manual value.</span></div>
  `;
}

function bottomNav() {
  const tabs = [
    { id: "home", label: "Home", icon: "home-outline" },
    { id: "journal", label: "Journal", icon: "notebook-outline" },
    { id: "activity", label: "Fitness", icon: "run" },
    { id: "biology", label: "Biology", icon: "heart-outline" },
  ];
  return `<div class="bottom-nav">
    <button type="button" class="plus-btn ${state.menuOpen ? "open" : ""}" data-action="toggle-menu" aria-label="${state.menuOpen ? "Close quick actions" : "Open quick actions"}">${mdi(state.menuOpen ? "close" : "plus")}</button>
    <div class="tab-bar">
      ${tabs.map((tab) => `<button type="button" class="tab-item ${state.tab === tab.id ? "active" : ""}" data-action="tab" data-value="${tab.id}">${mdi(tab.icon)}<span>${tab.label}</span></button>`).join("")}
    </div>
  </div>`;
}

function quickMenu() {
  return `<div class="quick-menu" role="menu">
    <button type="button" class="menu-item" data-action="open-food-search">
      <span class="menu-icon" style="background:#F0F1F4;color:#55A477">${mdi("magnify")}</span>
      <span><strong>Search Foods</strong><small>Browse &amp; add manually</small></span>
    </button>
    <div class="menu-sep"></div>
    <button type="button" class="menu-item" data-action="open-barcode">
      <span class="menu-icon" style="background:rgba(85,164,119,.1);color:#55A477">${mdi("barcode-scan")}</span>
      <span><strong>Scan Barcode</strong><small>Log a product instantly</small></span>
    </button>
    <div class="menu-sep"></div>
    <button type="button" class="menu-item" data-action="open-chat" data-value="food">
      <span class="menu-icon" style="background:rgba(91,123,225,.1);color:#5B7BE1">${mdi("robot-outline")}</span>
      <span><strong>AI Food Log</strong><small>Chat with assistant</small></span>
    </button>
    <div class="menu-sep"></div>
    <button type="button" class="menu-item" data-action="open-chat" data-value="health">
      <span class="menu-icon" style="background:rgba(91,123,225,.12);color:#5B7BE1">${mdi("brain")}</span>
      <span><strong>Ask AI</strong><small>Health insights &amp; advice</small></span>
    </button>
    <div class="menu-sep"></div>
    <button type="button" class="menu-item" data-action="open-settings">
      <span class="menu-icon" style="background:#F0F1F4;color:#202126">${mdi("cog-outline")}</span>
      <span><strong>Settings</strong><small>AI, brief, health access</small></span>
    </button>
  </div>`;
}

/* ---------------- chat ---------------- */

function chatGreeting(mode) {
  return mode === "food"
    ? "What did you eat? Describe a meal and I'll estimate the calories and macros. You can also ask what's left for the day."
    : "Hey — I'm your Akosian coach. I can see your sample day: 7h 42m sleep, HRV 58 ms, and 8,432 steps. What do you want to look at?";
}

function chatScreen() {
  const starters =
    state.chatMode === "food"
      ? ["2 eggs and toast", "Chicken rice bowl", "How much protein is left?"]
      : ["How am I recovering?", "What should I focus on today?", "Why is my HRV up?"];

  const messages = state.messages
    .map((message) => `<div class="chat-bubble ${message.role}">${esc(message.content).replace(/\n/g, "<br>")}</div>`)
    .join("");

  const typing = state.typing
    ? `<div class="chat-bubble assistant"><span class="typing"><i></i><i></i><i></i></span></div>`
    : "";

  const connection = state.apiKey
    ? `<span><span class="dot"></span>OpenRouter · ${esc(state.model || "openrouter/free")}</span>`
    : `<span>Demo replies · add a key in Settings</span>`;

  return `<div class="app"><div class="chat-screen">
    ${statusBar()}
    <div class="chat-head">
      <button type="button" class="back-btn" style="margin:0" data-action="close-chat" aria-label="Close chat">${mdi("arrow-left")}</button>
      <span class="chat-avatar">${mdi("robot-outline")}</span>
      <span class="chat-head-copy"><strong>${state.chatMode === "food" ? "Food log" : "Ask Coach"}</strong>${connection}</span>
    </div>
    <div class="chat-messages">${messages}${typing}</div>
    ${state.messages.length <= 1 ? `<div class="starter-row">${starters.map((starter) => `<button type="button" class="starter-chip" data-action="starter" data-value="${esc(starter)}">${esc(starter)}</button>`).join("")}</div>` : ""}
    <form class="chat-compose" id="chat-form">
      <input type="text" value="${esc(state.chatInput)}" data-field="chatInput" placeholder="${state.chatMode === "food" ? "Describe a meal…" : "Ask about your health…"}" autocomplete="off" aria-label="Message" />
      <button type="submit" class="send-btn" aria-label="Send message" ${state.typing ? "disabled" : ""}>${mdi("send")}</button>
    </form>
  </div></div>`;
}

/* ---------------- modal ---------------- */

function renderModal() {
  if (!state.modal) {
    modalRoot.classList.add("hidden");
    modalRoot.innerHTML = "";
    return;
  }

  modalRoot.classList.remove("hidden");
  modalRoot.innerHTML = modalContent(state.modal);
}

function modalContent(modal) {
  if (modal.type === "phone-only") {
    const local = modal.value === "local";
    return `<div class="modal-card" role="dialog" aria-modal="true" aria-labelledby="modal-title">
      <div class="modal-icon">${mdi(local ? "cellphone-lock" : "robot-off-outline")}</div>
      <h3 id="modal-title">${local ? "On-device AI is phone-only" : "That option is phone-only"}</h3>
      <p>${local
        ? "Local models need native modules — Apple Foundation Models, Gemini Nano, or llama.cpp. They can't run in a browser. Install Akosian to use local AI."
        : "Skipping AI is a phone-app choice. In this demo, use the API key option to try the coach, or continue without AI for now."}</p>
      <div class="modal-actions">
        <a class="modal-btn primary" href="https://testflight.apple.com/join/HvNZzY4D" target="_blank" rel="noopener">${mdi("apple")} Install on iPhone</a>
        <a class="modal-btn" href="https://play.google.com/store/apps/details?id=com.myrri.app" target="_blank" rel="noopener">${mdi("android")} Get it on Android</a>
      </div>
      <button type="button" class="modal-close" data-action="modal-close">Back to options</button>
    </div>`;
  }

  if (modal.type === "provider-only") {
    return `<div class="modal-card" role="dialog" aria-modal="true" aria-labelledby="modal-title">
      <div class="modal-icon">${mdi("cloud-off-outline")}</div>
      <h3 id="modal-title">OpenRouter only in the browser</h3>
      <p>OpenAI, Anthropic, and Gemini block direct browser requests with CORS. The installed app supports all four providers with keys in secure storage. Here, use OpenRouter — free models work without a card.</p>
      <div class="modal-actions">
        <a class="modal-btn primary" href="https://openrouter.ai/settings/keys" target="_blank" rel="noopener">${mdi("open-in-new")} Get a free OpenRouter key</a>
      </div>
      <button type="button" class="modal-close" data-action="modal-close">Back to providers</button>
    </div>`;
  }

  if (modal.type === "barcode") {
    return `<div class="modal-card" role="dialog" aria-modal="true" aria-labelledby="modal-title">
      <div class="modal-icon">${mdi("barcode-scan")}</div>
      <h3 id="modal-title">Barcode scan needs a camera</h3>
      <p>This is where the scanner lives in the app. A browser demo can't open the native camera scanner or read a barcode, so there's nothing to point it at here.</p>
      <p style="margin-top:9px">On your phone, Akosian searches 326,759 foods and 313,256 barcodes offline — no account, no lookup server.</p>
      <div class="modal-actions">
        <a class="modal-btn primary" href="https://testflight.apple.com/join/HvNZzY4D" target="_blank" rel="noopener">${mdi("apple")} Install on iPhone to scan</a>
        <a class="modal-btn" href="https://play.google.com/store/apps/details?id=com.myrri.app" target="_blank" rel="noopener">${mdi("android")} Get it on Android</a>
        <button type="button" class="modal-btn" data-action="open-food-search">${mdi("magnify")} Search foods instead</button>
      </div>
      <button type="button" class="modal-close" data-action="modal-close">Keep browsing the demo</button>
    </div>`;
  }

  if (modal.type === "settings") {
    return `<div class="modal-card" role="dialog" aria-modal="true" aria-labelledby="modal-title">
      <div class="modal-icon">${mdi("cog-outline")}</div>
      <h3 id="modal-title">Demo settings</h3>
      <p><strong>AI:</strong> ${state.apiKey ? `OpenRouter key in memory · ${esc(state.model || "openrouter/free")}` : "No key — chat uses canned demo replies."}</p>
      <p style="margin-top:6px"><strong>Health data:</strong> simulated sample day.</p>
      <p style="margin-top:6px"><strong>Storage:</strong> nothing is saved. Reloading resets the demo.</p>
      <div class="modal-actions">
        <button type="button" class="modal-btn primary" data-action="open-chat" data-value="health">${mdi("robot-outline")} Open the coach</button>
        <button type="button" class="modal-btn" data-action="restart-demo">${mdi("restart")} Restart the demo</button>
        <a class="modal-btn" href="https://testflight.apple.com/join/HvNZzY4D" target="_blank" rel="noopener">${mdi("apple")} Install on iPhone</a>
      </div>
      <button type="button" class="modal-close" data-action="modal-close">Close</button>
    </div>`;
  }

  if (modal.type === "food-search") {
    return `<div class="modal-card" role="dialog" aria-modal="true" aria-labelledby="modal-title">
      <div class="modal-icon">${mdi("magnify")}</div>
      <h3 id="modal-title">Search foods</h3>
      <p>A tiny sample of the offline database. The real app searches 326,759 foods on your phone.</p>
      <div class="modal-actions">
        <button type="button" class="modal-btn" data-action="log-food" data-value="Greek yogurt">${mdi("plus")} Greek yogurt · 120 kcal</button>
        <button type="button" class="modal-btn" data-action="log-food" data-value="Chicken breast">${mdi("plus")} Chicken breast · 165 kcal</button>
        <button type="button" class="modal-btn" data-action="log-food" data-value="Banana">${mdi("plus")} Banana · 105 kcal</button>
      </div>
      <button type="button" class="modal-close" data-action="modal-close">Close</button>
    </div>`;
  }

  return "";
}

/* ---------------- events ---------------- */

function handleAction(action, value) {
  switch (action) {
    case "select-device": {
      state.onboarding.device = value;
      state.screen = "profile";
      showToast("Health sync is simulated in the demo.");
      break;
    }
    case "back": {
      back();
      break;
    }
    case "profile-continue":
      state.screen = "ai";
      render();
      break;
    case "select-sex":
      state.onboarding.sex = value;
      render();
      break;
    case "select-ai":
      if (value === "local" || value === "none") {
        state.modal = { type: "phone-only", value };
        render();
      } else {
        state.aiMode = value;
        render();
      }
      break;
    case "ai-continue":
      state.screen = "byok";
      render();
      break;
    case "skip-ai":
      state.screen = "goals";
      state.menuOpen = false;
      render();
      break;
    case "select-provider":
      if (value !== "openrouter") {
        state.modal = { type: "provider-only" };
        render();
        return;
      }
      state.provider = value;
      render();
      break;
    case "test-key":
      testKey();
      break;
    case "save-key":
      if (!state.apiKey.trim()) {
        showToast("Paste an OpenRouter key first, or continue without one.");
        return;
      }
      state.screen = "goals";
      showToast("Key kept in this tab only — not saved.");
      break;
    case "toggle-goal": {
      const goals = state.onboarding.goals;
      state.onboarding.goals = goals.includes(value) ? goals.filter((id) => id !== value) : [...goals, value];
      render();
      break;
    }
    case "set-training":
      state.onboarding.trainingDays = Number(value);
      render();
      break;
    case "set-activity":
      state.onboarding.activity = value;
      render();
      break;
    case "build-plan":
      state.screen = "complete";
      render();
      break;
    case "finish-onboarding":
      state.screen = "tabs";
      state.tab = "home";
      showToast("Welcome to your sample day.");
      break;
    case "tab":
      state.tab = value;
      state.menuOpen = false;
      state.modal = null;
      render();
      break;
    case "toggle-menu":
      state.menuOpen = !state.menuOpen;
      render();
      break;
    case "close-menu":
      state.menuOpen = false;
      render();
      break;
    case "open-settings":
      state.menuOpen = false;
      state.modal = { type: "settings" };
      render();
      break;
    case "open-barcode":
      state.menuOpen = false;
      state.modal = { type: "barcode" };
      render();
      break;
    case "open-food-search":
      state.menuOpen = false;
      state.modal = { type: "food-search" };
      render();
      break;
    case "modal-close":
      state.modal = null;
      render();
      break;
    case "log-food":
      state.modal = null;
      showToast(`${value} added to today's food log.`);
      break;
    case "open-chat":
      openChat(value);
      break;
    case "close-chat":
      state.screen = "tabs";
      state.modal = null;
      render();
      break;
    case "starter":
      sendChat(value);
      break;
    case "sync":
      showToast("Synced sample health data.");
      break;
    case "workout":
      showToast(`${value} · sample workout details.`);
      break;
    case "biomarker":
      showToast(`${value} · full trends are in the phone app.`);
      break;
    case "open-sleep":
      showToast("Sleep detail screen is available in the phone app.");
      break;
    case "open-strain":
      showToast("Strain detail screen is available in the phone app.");
      break;
    case "toggle-habit": {
      state.journal.habits[value] = !state.journal.habits[value];
      render();
      break;
    }
    case "restart-demo":
      restartDemo();
      break;
    default:
      break;
  }
}

function back() {
  switch (state.screen) {
    case "profile":
      state.screen = "device";
      break;
    case "ai":
      state.screen = "profile";
      break;
    case "byok":
      state.screen = "ai";
      break;
    case "goals":
      state.screen = "byok";
      break;
    case "complete":
      state.screen = "goals";
      break;
    case "chat":
      state.screen = "tabs";
      break;
    default:
      state.screen = "device";
  }
  state.modal = null;
  render();
}

function restartDemo() {
  clearTimeout(toastTimer);
  state = initialState();
  render({ scrollBottom: true });
}

function openChat(mode) {
  state.menuOpen = false;
  state.modal = null;
  state.chatMode = mode;
  state.screen = "chat";
  if (state.messages.length === 0) {
    state.messages.push({ role: "assistant", content: chatGreeting(mode) });
  }
  state.chatInput = "";
  render({ scrollBottom: true });
}

async function sendChat(explicitText) {
  if (state.typing) return;
  const text = String(explicitText ?? state.chatInput ?? "").trim();
  if (!text) return;

  state.messages.push({ role: "user", content: text });
  state.chatInput = "";
  state.typing = true;
  state.screen = "chat";
  render({ scrollBottom: true });

  let reply = "";
  let suffix = "";
  try {
    if (state.provider === "openrouter" && state.apiKey.trim()) {
      reply = await askOpenRouter(state.messages);
    } else {
      reply = cannedReply(text);
      suffix = "\n\n— Demo reply. Add an OpenRouter key in the AI setup to talk to a real model.";
    }
  } catch (error) {
    reply = cannedReply(text);
    suffix = `\n\n— Live request failed (${error.message || "network error"}). Showing a demo reply.`;
  }

  state.typing = false;
  state.messages.push({ role: "assistant", content: `${reply}${suffix}` });
  render({ scrollBottom: true });
}

async function askOpenRouter(history) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 30000);
  try {
    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${state.apiKey.trim()}`,
        "HTTP-Referer": window.location.origin || "https://localhost",
        "X-Title": "Akosian Web Demo",
      },
      body: JSON.stringify({
        model: state.model.trim() || "openrouter/free",
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          ...history.map((message) => ({ role: message.role, content: message.content })),
        ],
        max_tokens: 220,
      }),
      signal: controller.signal,
    });

    if (!response.ok) {
      const body = await response.text();
      throw new Error(`OpenRouter ${response.status}: ${body.slice(0, 120)}`);
    }

    const data = await response.json();
    const content = data?.choices?.[0]?.message?.content;
    if (!content) throw new Error("OpenRouter returned an empty reply");
    return content.trim();
  } finally {
    clearTimeout(timeout);
  }
}

async function testKey() {
  if (!state.apiKey.trim() || state.testState?.status === "testing") return;
  state.testState = { status: "testing" };
  render();

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 20000);
  try {
    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${state.apiKey.trim()}`,
        "HTTP-Referer": window.location.origin || "https://localhost",
        "X-Title": "Akosian Web Demo",
      },
      body: JSON.stringify({
        model: state.model.trim() || "openrouter/free",
        messages: [{ role: "user", content: "Reply with the single word OK." }],
        max_tokens: 5,
      }),
      signal: controller.signal,
    });

    if (!response.ok) {
      const body = await response.text();
      throw new Error(body.slice(0, 100) || `HTTP ${response.status}`);
    }

    state.testState = {
      ok: true,
      message: "Connected. The coach will use this key in this tab only.",
    };
  } catch (error) {
    state.testState = {
      ok: false,
      message: `Couldn't connect: ${error.message || "network error"}. Check the key and model name.`,
    };
  } finally {
    clearTimeout(timeout);
  }
  render();
}

function cannedReply(text) {
  const q = text.toLowerCase();
  const d = DEMO;

  if (q.includes("barcode") || q.includes("scan")) {
    return "Barcode scanning needs the phone's camera, so it doesn't run in this browser demo. On your phone the scanner reads the barcode and looks it up in the bundled offline database — no lookup server.";
  }

  if (q.includes("sleep") || q.includes("tired") || q.includes("bed")) {
    return `You slept ${sleepLabel(d.sleepHours)} and your sleep score is ${d.sleepScore}. That's solid, but just under your 8-hour goal. If you want a small win today, keep the wind-down routine and aim for lights-out 20 minutes earlier. Your resting HR (${d.restingHr} bpm) suggests you're recovered.`;
  }

  if (q.includes("hrv") || q.includes("stress") || q.includes("recover")) {
    return `HRV is ${d.hrv} ms, slightly above your 21-day baseline, and resting HR is ${d.restingHr} bpm. That points to good recovery. Today is a reasonable day for a normal session — no need to push a hard interval workout unless you feel fresh.`;
  }

  if (q.includes("protein") || q.includes("eat") || q.includes("food") || q.includes("meal") || q.includes("calorie") || q.includes("macro")) {
    return `So far today: ${d.caloriesEaten} of ${d.caloriesTarget} kcal. Protein is ${d.protein}/${d.proteinTarget} g, carbs ${d.carbs}/${d.carbsTarget} g, fat ${d.fat}/${d.fatTarget} g. To close the protein gap, something like Greek yogurt with berries or a chicken rice bowl fits well without blowing the calorie target.`;
  }

  if (q.includes("run") || q.includes("workout") || q.includes("train") || q.includes("fitness") || q.includes("strain")) {
    return `You've logged 12 workouts and 9h 20m of active time this month, with an average strain of ${d.strainScore}. Your latest run was 5.2 km in 31 minutes. With recovery looking good, an easy-to-moderate session today fits the plan.`;
  }

  if (q.includes("weight") || q.includes("body") || q.includes("fat") || q.includes("age")) {
    return `Weight is ${d.weight} kg (down 0.4 kg this month), body fat ${d.bodyFat}%, and your wellness age estimate is ${d.bioAge} — about 2.3 years younger than your chronological age. Treat that as a directional index, not a clinical measurement.`;
  }

  if (q.includes("plan") || q.includes("goal") || q.includes("focus") || q.includes("today")) {
    return "Your plan centers on Better sleep and Stress & HRV. Today's focus: protect your 8-hour sleep window, take a 15-minute walk after lunch, and do a short breathing session before bed. Your 8,432 steps already cover most of the movement target.";
  }

  if (q.includes("egg") || q.includes("toast")) {
    return "Two eggs and two slices of toast is roughly 380–430 kcal, with about 20 g protein. Add fruit or yogurt if you want to push protein closer to 30 g.";
  }

  return "I can help with sleep, recovery, training load, food, or your coach plan. Try asking \"How am I recovering?\" or \"What should I eat to hit my protein target?\"";
}

/* ---------------- wiring ---------------- */

app.addEventListener("click", (event) => {
  const target = event.target.closest("[data-action]");
  if (!target) return;
  event.preventDefault();
  handleAction(target.dataset.action, target.dataset.value);
});

modalRoot.addEventListener("click", (event) => {
  if (event.target === modalRoot) {
    state.modal = null;
    render();
    return;
  }
  const target = event.target.closest("[data-action]");
  if (!target) return;
  event.preventDefault();
  handleAction(target.dataset.action, target.dataset.value);
});

app.addEventListener("input", (event) => {
  const field = event.target.dataset.field;
  if (!field) return;

  if (field === "chatInput") {
    state.chatInput = event.target.value;
    return;
  }

  if (field === "apiKey") {
    state.apiKey = event.target.value;
    if (state.testState) state.testState = null;
    const hasKey = Boolean(state.apiKey.trim());
    const testButton = app.querySelector('[data-action="test-key"]');
    if (testButton) testButton.disabled = !hasKey;
    const saveButton = app.querySelector('[data-action="save-key"]');
    if (saveButton) saveButton.disabled = !hasKey;
    return;
  }

  if (field === "model") {
    state.model = event.target.value;
    return;
  }

  if (["age", "height", "weight"].includes(field)) {
    state.onboarding[field] = event.target.value;
  }
});

app.addEventListener("submit", (event) => {
  if (event.target.id !== "chat-form") return;
  event.preventDefault();
  const input = event.target.querySelector('[data-field="chatInput"]');
  sendChat(input ? input.value : state.chatInput);
});

document.getElementById("restart-demo").addEventListener("click", restartDemo);

render({ scrollBottom: true });

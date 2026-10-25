/* Akosian web demo — a small, dependency-free re-creation of the native app.
 * Everything in the phone is fake sample data. The only real network call is
 * the optional OpenRouter chat, sent directly from the browser to OpenRouter. */

const GOALS = [
  { id: "weight_loss", label: "Weight loss", emoji: "🔥", tagline: "Lose fat sustainably without crashing" },
  { id: "muscle_gain", label: "Muscle gain", emoji: "💪", tagline: "Add lean size with training + surplus" },
  { id: "body_recomp", label: "Body recomp", emoji: "⚖️", tagline: "Lose fat and build muscle at once" },
  { id: "strength", label: "Strength", emoji: "🏋️", tagline: "Get stronger on the big lifts" },
  { id: "faster_running", label: "Faster running", emoji: "🏃", tagline: "Run faster with smarter training" },
  { id: "endurance", label: "Endurance", emoji: "🚴", tagline: "Go further and last longer" },
  { id: "injury_recovery", label: "Injury recovery", emoji: "🩹", tagline: "Return stronger, safely" },
  { id: "better_sleep", label: "Better sleep", emoji: "😴", tagline: "Fall asleep faster, wake up rested" },
  { id: "stress_hrv", label: "Stress & HRV", emoji: "🧘", tagline: "Calm the nervous system, raise HRV" },
  { id: "general_health", label: "General health", emoji: "🌿", tagline: "Move daily, sleep well, live longer" },
];

const DEVICES = [
  { id: "apple", label: "Apple Watch", icon: "watch", desc: "Syncs directly with Apple Health", color: "#5B7BE1" },
  { id: "samsung", label: "Samsung Galaxy Watch", icon: "watch", desc: "Syncs via Samsung Health", color: "#55A477" },
  { id: "googlefit", label: "Pixel Watch", icon: "watch-variant", desc: "Syncs via Google Fit", color: "#E56F63" },
  { id: "garmin", label: "Garmin", icon: "watch-variant", desc: "Syncs via Health Connect / Apple Health", color: "#D69A43" },
  { id: "fitbit", label: "Fitbit", icon: "watch-variant", desc: "Syncs via Health Connect / Apple Health", color: "#8A72C8" },
  { id: "xiaomi", label: "Xiaomi (Mi Band)", icon: "watch", desc: "Syncs via Mi Fitness", color: "#6B83A5" },
  { id: "amazfit", label: "Amazfit", icon: "watch", desc: "Syncs via the Zepp app", color: "#C96D63" },
  { id: "huawei", label: "Huawei", icon: "watch", desc: "Syncs via HUAWEI Health", color: "#9698A1" },
  { id: "other", label: "No Device", icon: "cellphone", desc: "Track manually", color: "#9698A1" },
];

const AI_MODES = [
  {
    id: "api",
    title: "Your own key",
    badge: "RECOMMENDED",
    badgeClass: "green",
    sub: "OPENAI · ANTHROPIC · GEMINI · OPENROUTER",
    desc: "OpenAI, Anthropic, Gemini, or OpenRouter. You pick the model and pay the provider directly; your key stays in this device's secure storage. Tip: OpenRouter offers free models.",
    icon: "key-outline",
  },
  {
    id: "local",
    title: "Local",
    badge: "NOT RECOMMENDED",
    badgeClass: "amber",
    sub: "ON-DEVICE",
    desc: "A small model runs on your phone, so prompts never leave the device. Less capable, slower, and needs a recent high-end phone with plenty of free storage.",
    icon: "cellphone-lock",
    locked: true,
  },
  {
    id: "none",
    title: "No AI",
    badge: "PRIVATE",
    badgeClass: "gray",
    sub: "OFFLINE · PRIVACY MAX",
    desc: "Skip the assistant. Every health, journal, and food feature — including barcode scanning — still works on-device. Turn AI on anytime later.",
    icon: "robot-off-outline",
    locked: true,
  },
];

const PROVIDERS = [
  { id: "openrouter", label: "OpenRouter", initial: "OR", free: true, locked: false },
  { id: "openai", label: "OpenAI", initial: "O", free: false, locked: true },
  { id: "anthropic", label: "Anthropic", initial: "A", free: false, locked: true },
  { id: "gemini", label: "Google Gemini", initial: "G", free: false, locked: true },
];

const OPENROUTER_STEPS = [
  'Go to <strong>openrouter.ai</strong> and create a free account — Google or GitHub sign-in works.',
  'Open the keys page with the button below and tap <strong>Create Key</strong>, then copy it.',
  'Come back here and paste the key into the <strong>API key</strong> field above.',
  'In the <strong>Model</strong> field below, type <strong>openrouter/free</strong> — a free model router, no payment needed.',
  'Tap <strong>Test connection</strong>, then <strong>Save &amp; continue</strong>.',
];

const KG_PER_LB = 0.45359237;
const CM_PER_IN = 2.54;
const LBS_PER_KG = 2.2046226218;

const SLEEP_NIGHTS = [7.1, 6.4, 8.2, 7.6, 5.9, 8.4, 7.7];
const SLEEP_STAGES = [
  { label: "Deep", hours: 1.6, color: "#3B6B8A" },
  { label: "REM", hours: 1.9, color: "#7BAE7F" },
  { label: "Light", hours: 4.2, color: "#8FC97A" },
  { label: "Awake", hours: 0.3, color: "#BF4B4B" },
];

const FOODS = [
  {
    id: "greek-yogurt-berries",
    name: "Greek yogurt + berries",
    category: "Dairy",
    per100: { calories: 88, protein: 7.5, carbs: 10.8, fat: 5, fiber: 0.4 },
    defaultGrams: 240,
    units: [{ label: "cup", plural: "cups", grams: 240 }],
  },
  {
    id: "chicken-rice-bowl",
    name: "Chicken rice bowl",
    category: "Mixed dishes",
    per100: { calories: 130, protein: 10, carbs: 14.5, fat: 3.3, fiber: 1.1 },
    defaultGrams: 420,
    units: [{ label: "bowl", plural: "bowls", grams: 420 }],
  },
  {
    id: "apple-almonds",
    name: "Apple + almonds",
    category: "Snack",
    per100: { calories: 229, protein: 6.3, carbs: 25.3, fat: 12.6, fiber: 4.2 },
    defaultGrams: 95,
    units: [{ label: "serving", plural: "servings", grams: 95 }],
  },
  {
    id: "cottage-cheese-fruit",
    name: "Cottage cheese + fruit",
    category: "Dairy",
    per100: { calories: 85, protein: 10, carbs: 8.2, fat: 1.4, fiber: 0.6 },
    defaultGrams: 220,
    units: [{ label: "bowl", plural: "bowls", grams: 220 }],
  },
  {
    id: "greek-yogurt",
    name: "Greek yogurt",
    category: "Dairy",
    per100: { calories: 59, protein: 10.2, carbs: 3.6, fat: 0.4, fiber: 0 },
    defaultGrams: 170,
    units: [{ label: "cup", plural: "cups", grams: 240 }],
  },
  {
    id: "chicken-breast",
    name: "Chicken breast",
    category: "Meat",
    per100: { calories: 165, protein: 31, carbs: 0, fat: 3.6, fiber: 0 },
    defaultGrams: 150,
    units: [{ label: "piece", plural: "pieces", grams: 150 }],
  },
  {
    id: "banana",
    name: "Banana",
    category: "Fruit",
    per100: { calories: 89, protein: 1.1, carbs: 22.8, fat: 0.3, fiber: 2.6 },
    defaultGrams: 118,
    units: [{ label: "banana", plural: "bananas", grams: 118 }],
  },
  {
    id: "eggs-toast",
    name: "2 eggs and toast",
    category: "Breakfast",
    per100: { calories: 210, protein: 10, carbs: 18, fat: 11, fiber: 1.4 },
    defaultGrams: 195,
    units: [{ label: "serving", plural: "servings", grams: 195 }],
  },
];

const WORKOUTS = [
  {
    id: "morning-run",
    name: "Morning Run",
    date: "Oct 23",
    startLabel: "6:42 AM",
    endLabel: "7:13 AM",
    weekday: "Friday, October 23",
    durationMin: 31,
    icon: "run-fast",
    color: "#E56F63",
    bg: "rgba(229,111,99,.1)",
    calories: 412,
    distanceKm: 5.2,
    avgHr: 142,
    maxHr: 171,
    minHr: 98,
    curve: [98, 112, 124, 131, 128, 136, 141, 138, 145, 149, 146, 152, 158, 154, 161, 157, 163, 166, 162, 168, 164, 159, 155, 160, 157, 150, 146, 143, 139, 134, 128],
  },
  {
    id: "upper-body",
    name: "Upper Body",
    date: "Oct 22",
    startLabel: "5:18 PM",
    endLabel: "6:06 PM",
    weekday: "Thursday, October 22",
    durationMin: 48,
    icon: "dumbbell",
    color: "#8A72C8",
    bg: "rgba(138,114,200,.1)",
    calories: 286,
    distanceKm: null,
    avgHr: 118,
    maxHr: 148,
    minHr: 86,
    curve: [86, 94, 108, 116, 104, 122, 118, 129, 114, 126, 132, 121, 137, 128, 119, 135, 124, 141, 130, 148, 134, 126, 120, 133, 118, 127, 115, 109, 112, 103, 96],
  },
  {
    id: "evening-walk",
    name: "Evening Walk",
    date: "Oct 20",
    startLabel: "7:05 PM",
    endLabel: "7:49 PM",
    weekday: "Tuesday, October 20",
    durationMin: 44,
    icon: "walk",
    color: "#5B7BE1",
    bg: "rgba(91,123,225,.1)",
    calories: 176,
    distanceKm: 3.8,
    avgHr: 96,
    maxHr: 112,
    minHr: 78,
    curve: [82, 88, 94, 91, 99, 96, 104, 100, 108, 103, 98, 110, 105, 101, 96, 99, 92, 97, 90, 86, 91, 84, 88, 82, 90, 85, 80, 86, 79, 82, 78],
  },
];

const DEMO = {
  sleepScore: 82,
  strainScore: 61,
  steps: 8432,
  activeCalories: 620,
  distanceKm: 6.4,
  hrv: 58,
  restingHr: 54,
  avgHr: 72,
  sleepHours: 7.7,
  respiratory: 14.2,
  oxygen: 98,
  weight: 68,
  weightLbs: 150,
  bodyFat: 18.4,
  leanMass: 60.4,
  leanLbs: 133.2,
  vo2Max: 48.2,
  bioAge: 42,
  bioLabel: "Excellent",
  bioReliability: 36,
  bioBaselineDays: 30,
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
  habits: {
    water_goal: { type: "counter", value: 5, target: 8 },
    veggies: { type: "counter", value: 3, target: 5 },
    walk: { type: "counter", value: 1, target: 1 },
    sunlight: { type: "binary", state: "yes" },
    meditate: { type: "binary", state: "skip" },
    read_book: { type: "measure", value: 20, unit: "min" },
    social: { type: "binary", state: "no" },
    device_bed: { type: "binary", state: "yes" },
    early_bed: { type: "binary", state: "skip" },
    no_late_food: { type: "binary", state: "yes" },
  },
  mood: 3,
  hydration: 5,
  meals: [
    { id: "m1", foodName: "Greek yogurt + berries", time: "7:42 AM", grams: 240, calories: 212, protein: 18, carbs: 26, fat: 5 },
    { id: "m2", foodName: "Chicken rice bowl", time: "12:35 PM", grams: 420, calories: 548, protein: 42, carbs: 61, fat: 14 },
    { id: "m3", foodName: "Apple + almonds", time: "4:10 PM", grams: 95, calories: 218, protein: 6, carbs: 24, fat: 12 },
  ],
});

const initialState = () => ({
  screen: "device",
  tab: "home",
  onboarding: {
    device: null,
    age: "",
    sex: "unspecified",
    height: "",
    heightUnit: "cm",
    heightFt: "",
    heightIn: "",
    weight: "",
    weightUnit: "kg",
    goals: [],
    trainingDays: 3,
    activity: "light",
  },
  aiMode: "api",
  aiReturn: "onboarding",
  provider: "openrouter",
  apiKey: "",
  model: "openrouter/free",
  showKey: false,
  showGuide: false,
  testState: null,
  messages: [],
  chatMode: "health",
  chatInput: "",
  typing: false,
  menuOpen: false,
  modal: null,
  toast: null,
  journal: initialJournal(),
  settings: { briefEnabled: false, briefHour: 7, briefMinute: 0, briefTest: "idle" },
  distanceUnit: "km",
  weightUnit: "kg",
  editedFromSettings: false,
  foodQuery: "",
  foodDetail: null,
  detailReturn: "tabs",
  workoutId: null,
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

const mdi = (name, extra = "") => `<i class="mdi mdi-${name}${extra ? ` ${extra}` : ""}" aria-hidden="true"></i>`;

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

function formatDistance(km) {
  if (km == null) return "—";
  return state.distanceUnit === "mi"
    ? `${(km / 1.609344).toFixed(1)} mi`
    : `${km.toFixed(1)} km`;
}

function displayWeight(kg) {
  if (kg == null) return "—";
  return state.weightUnit === "lb" ? `${(kg * LBS_PER_KG).toFixed(1)} lbs` : `${kg.toFixed(1)} kg`;
}

const isAgeValid = (value) => {
  const age = Number.parseInt(value, 10);
  return Number.isFinite(age) && age >= 18 && age <= 100;
};

const isHeightValid = (value) => !value.trim() || (Number(value) >= 90 && Number(value) <= 250);
const isWeightValid = (value) => !value.trim() || (Number(value) >= 25 && Number(value) <= 350);

function pageShell({ title, date, content, centered = false, backAction = "back" }) {
  return `<div class="app"><div class="page-screen">
    ${statusBar()}
    <div class="wash"></div>
    <div class="page-head ${centered ? "centered" : ""}">
      <button type="button" class="back-btn page-back" data-action="${backAction}" aria-label="Go back">${mdi("arrow-left")}</button>
      <div class="page-head-copy"><h1 class="page-title">${title}</h1>${date ? `<span class="page-date">${date}</span>` : ""}</div>
      ${centered ? '<span class="page-back-spacer"></span>' : ""}
    </div>
    <div class="page-scroll">${content}</div>
  </div></div>`;
}

function sleepDetailScreen() {
  const d = DEMO;
  const goal = 8;
  const sleepScore = d.sleepScore;
  const scoreLabel = sleepScore >= 90 ? "Excellent" : sleepScore >= 75 ? "Good" : sleepScore >= 55 ? "Fair" : sleepScore >= 35 ? "Poor" : "Low";
  const scoreColor = sleepScore >= 75 ? "var(--success)" : sleepScore >= 55 ? "var(--warning)" : "var(--danger)";
  const goalPct = Math.round((d.sleepHours / goal) * 100);
  const inBed = d.sleepHours + 0.3;
  const efficiency = Math.round((d.sleepHours / inBed) * 100);
  const deepRem = SLEEP_STAGES.filter((s) => s.label === "Deep" || s.label === "REM").reduce((sum, s) => sum + s.hours, 0);
  const stageBase = SLEEP_STAGES.reduce((sum, s) => sum + s.hours, 0);
  const week = SLEEP_NIGHTS.map((hours, index) => {
    const day = new Date();
    day.setDate(day.getDate() - (SLEEP_NIGHTS.length - 1 - index));
    return { hours, label: day.toLocaleDateString("en-US", { weekday: "narrow" }), today: index === SLEEP_NIGHTS.length - 1 };
  });
  const valid = week.filter((n) => n.hours >= 0.5);
  const maxVal = Math.max(goal * 1.15, ...week.map((n) => n.hours), 6);
  const deepPct = Math.round((1.6 / d.sleepHours) * 100);
  const remPct = Math.round((1.9 / d.sleepHours) * 100);
  const recovery = [
    { label: "Resting Heart Rate", value: `${d.restingHr} bpm`, icon: "heart-pulse", color: "#E56F63", sub: "Lower is generally better" },
    { label: "Heart Rate Variability", value: `${d.hrv} ms`, icon: "waveform", color: "#5B7BE1", sub: "Higher suggests better recovery" },
    { label: "Respiratory Rate", value: `${d.respiratory} rpm`, icon: "lungs", color: "#5B7BE1", sub: "Breaths per minute" },
    { label: "Blood Oxygen", value: `${d.oxygen}%`, icon: "water-percent", color: "#55A477", sub: "Average during sleep" },
    { label: "Body Temperature", value: "36.4°C", icon: "thermometer", color: "#D69A43", sub: "Overnight baseline" },
  ];

  return pageShell({
    title: "Sleep",
    date: friendlyDate(),
    content: `
      <div class="detail-hero sleep-hero">
        ${gauge(sleepScore, "#6B83A5", "Sleep")}
        <div class="detail-hero-text">
          <span class="detail-label" style="color:${scoreColor}">${scoreLabel}</span>
          <strong class="detail-value">${sleepLabel(d.sleepHours)}</strong>
          <span class="detail-sub">Total sleep</span>
        </div>
      </div>

      <div class="card detail-card">
        <div class="detail-card-head">${mdi("sleep")}<span>Sleep Duration</span></div>
        <div class="duration-bar">
          <i class="duration-fill" style="width:${Math.min(100, (d.sleepHours / 10) * 100)}%;background:var(--success)"></i>
          <i class="duration-goal-mark" style="left:${(goal / 10) * 100}%"></i>
        </div>
        <div class="duration-markers"><span>0h</span><span class="duration-target">8h 00m goal</span><span>10h</span></div>
        <div class="goal-chip miss">${mdi("sleep-off")}<span>${sleepLabel(d.sleepHours)} of 8h 00m goal (${goalPct}%) — ${sleepLabel(Math.max(0, goal - d.sleepHours))} to go</span></div>
        <div class="quality-row">
          <div class="quality-stat"><strong>${efficiency}%</strong><span>Efficiency</span></div>
          <div class="quality-divider"></div>
          <div class="quality-stat"><strong>${sleepLabel(deepRem)}</strong><span>Deep + REM</span></div>
          <div class="quality-divider"></div>
          <div class="quality-stat"><strong>${sleepLabel(inBed)}</strong><span>In bed</span></div>
        </div>
      </div>

      <div class="card detail-card">
        <div class="detail-card-head">${mdi("calendar-week")}<span>Last 7 Nights</span></div>
        <div class="week-bars">
          <i class="week-goal-line" style="bottom:${(goal / maxVal) * 100}%"></i>
          ${week.map((night) => `<div class="week-col">
            <div class="week-track"><i class="week-bar ${night.hours >= goal - 0.5 ? "met" : ""} ${night.today ? "today" : ""}" style="height:${(night.hours / maxVal) * 100}%"></i></div>
            <span class="week-day ${night.today ? "today" : ""}">${night.label}</span>
          </div>`).join("")}
        </div>
        <span class="weekly-goal-caption">— 8h 00m goal</span>
        <div class="week-stats">
          <div><strong>${sleepLabel(valid.reduce((sum, n) => sum + n.hours, 0) / valid.length)}</strong><span>Average</span></div>
          <div><strong>${sleepLabel(Math.max(...valid.map((n) => n.hours)))}</strong><span>Best</span></div>
          <div><strong>${valid.filter((n) => n.hours >= goal - 0.5).length}/${week.length}</strong><span>Goal nights</span></div>
        </div>
      </div>

      <div class="card detail-card">
        <div class="detail-card-head">${mdi("chart-timeline-variant")}<span>Sleep Stages</span></div>
        <div class="stage-stack">
          ${SLEEP_STAGES.map((stage) => `<i style="width:${(stage.hours / stageBase) * 100}%;background:${stage.color}"></i>`).join("")}
        </div>
        ${SLEEP_STAGES.map((stage) => `<div class="stage-row">
          <i class="stage-dot" style="background:${stage.color}"></i>
          <span class="stage-label-text">${stage.label}</span>
          <span class="stage-pct">${Math.round((stage.hours / stageBase) * 100)}%</span>
          <span class="stage-hours">${sleepLabel(stage.hours)}</span>
        </div>`).join("")}
      </div>

      <p class="section-title">Recovery Vitals</p>
      <div class="card recovery-card">
        ${recovery.map((row) => `<div class="recovery-row">
          <span class="recovery-icon" style="background:${row.color}15;color:${row.color}">${mdi(row.icon)}</span>
          <span class="recovery-copy"><strong>${row.label}</strong><small>${row.sub}</small></span>
          <b>${row.value}</b>
        </div>`).join("")}
      </div>

      <div class="card insight-card">
        <div class="insight-head">${mdi("star-outline")}<strong>Insights</strong></div>
        ${[
          "You got decent rest. A consistent bedtime could push this into the excellent range.",
          `Good stage balance: ${deepPct}% deep, ${remPct}% REM.`,
          `Resting HR of ${d.restingHr} bpm reflects your overnight recovery.`,
          `HRV of ${d.hrv} ms indicates your body's readiness today.`,
        ].map((insight) => `<div class="insight-row"><i class="insight-dot"></i><span>${insight}</span></div>`).join("")}
      </div>

      <div class="card insight-card">
        <div class="insight-head">${mdi("lightbulb-outline")}<strong>Sleep Hygiene</strong></div>
        ${[
          "Keep a consistent wake-up time, even on weekends.",
          "Avoid screens 30–60 minutes before bed.",
          "Keep your bedroom cool, dark, and quiet.",
        ].map((tip, index) => `<div class="tip-row"><b>${index + 1}</b><span>${tip}</span></div>`).join("")}
      </div>
    `,
  });
}

function strainDetailScreen() {
  const d = DEMO;
  const avg = 72, max = 148, min = 52;
  const chart = "0,120 20,112 40,118 60,96 80,104 100,88 120,92 140,74 160,82 180,66 200,72 220,54 240,62 260,44 280,50";
  return pageShell({
    title: "Strain",
    date: friendlyDate(),
    content: `
      <div class="detail-hero strain-hero">
        ${gauge(d.strainScore, "#C96D63", "Strain")}
        <div class="detail-hero-text">
          <span class="detail-label" style="color:var(--warning)">Moderate</span>
          <strong class="detail-value">${d.strainScore}</strong>
          <span class="detail-sub">out of 100</span>
        </div>
      </div>

      <p class="section-title">Activity Snapshot</p>
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
          <div class="snapshot-value" style="font-size:16px">${formatDistance(d.distanceKm)}</div>
        </div>
      </div>

      <div class="card chart-card">
        <div class="detail-card-head">${mdi("heart-pulse")}<span>Heart Rate</span></div>
        <div class="hr-chart">
          <svg viewBox="0 0 280 130" preserveAspectRatio="none" role="img" aria-label="Heart rate over the day">
            <polyline points="${chart}" fill="none" stroke="#E56F63" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />
          </svg>
        </div>
        <div class="hr-stats">
          <div><span>Avg</span><strong>${avg} bpm</strong></div>
          <div><span>Max</span><strong>${max} bpm</strong></div>
          <div><span>Min</span><strong>${min} bpm</strong></div>
        </div>
      </div>

      <div class="card insight-card">
        <div class="insight-head">${mdi("information-outline")}<strong>How strain is calculated</strong></div>
        <div class="calc-row"><i style="background:var(--warning)"></i><span><strong>Active calories</strong><small>50% of score — calories burned through movement</small></span></div>
        <div class="calc-row"><i style="background:var(--success)"></i><span><strong>Steps</strong><small>30% of score — total steps vs 10K goal</small></span></div>
        <div class="calc-row"><i style="background:var(--danger)"></i><span><strong>Heart rate load</strong><small>20% of score — time spent at elevated HR</small></span></div>
      </div>

      <div class="card insight-card">
        <div class="insight-head" style="color:var(--warning)">${mdi("star-outline")}<strong>Insights</strong></div>
        <div class="insight-row"><i class="insight-dot" style="background:var(--warning)"></i><span>A solid effort today. You're building fitness without overreaching.</span></div>
        <div class="insight-row"><i class="insight-dot" style="background:var(--warning)"></i><span>${d.steps.toLocaleString()} steps today — close to the recommended 10K.</span></div>
      </div>
    `,
  });
}

function workoutDetailScreen() {
  const workout = WORKOUTS.find((item) => item.id === state.workoutId) ?? WORKOUTS[0];
  const pace = workout.distanceKm ? (() => {
    const secPerKm = (workout.durationMin * 60) / workout.distanceKm;
    return `${Math.floor(secPerKm / 60)}:${String(Math.round(secPerKm % 60)).padStart(2, "0")} /km`;
  })() : null;
  const speed = workout.distanceKm ? `${(workout.distanceKm / (workout.durationMin / 60)).toFixed(1)} km/h` : null;
  const curve = workout.curve;
  const chartPoints = curve.map((value, index) => {
    const x = (index / (curve.length - 1)) * 280;
    const y = 120 - ((value - workout.minHr) / Math.max(1, workout.maxHr - workout.minHr)) * 100;
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  }).join(" ");
  const duration = workout.durationMin >= 60
    ? `${Math.floor(workout.durationMin / 60)} hr ${workout.durationMin % 60} min`
    : `${workout.durationMin} min`;

  return pageShell({
    title: "Workout",
    content: `
      <div class="workout-detail-hero">
        <span class="workout-detail-icon" style="background:${workout.bg};color:${workout.color}">${mdi(workout.icon)}</span>
        <h2>${workout.name}</h2>
        <p>${workout.weekday}</p>
        <small>${workout.startLabel} – ${workout.endLabel}</small>
      </div>

      <div class="workout-distance-hero">
        ${workout.distanceKm
          ? `<strong>${workout.distanceKm.toFixed(2)}<small> km</small></strong><span>Distance</span>`
          : `<strong>${duration}</strong><span>Duration</span>`}
      </div>

      <div class="stat-grid">
        <div class="stat-tile"><span>${mdi("timer-outline")}</span><strong>${duration}</strong><small>Duration</small></div>
        ${pace ? `<div class="stat-tile"><span>${mdi("speedometer")}</span><strong>${pace}</strong><small>Avg pace</small></div>` : ""}
        <div class="stat-tile"><span>${mdi("fire")}</span><strong>${workout.calories}</strong><small>Calories</small></div>
        <div class="stat-tile"><span>${mdi("heart-pulse")}</span><strong>${workout.avgHr} bpm</strong><small>Avg HR</small></div>
        ${speed ? `<div class="stat-tile"><span>${mdi("map-marker-distance")}</span><strong>${speed}</strong><small>Avg speed</small></div>` : ""}
      </div>

      <div class="card chart-card">
        <div class="detail-card-head">${mdi("heart-pulse")}<span>Heart rate</span></div>
        <div class="hr-chart">
          <svg viewBox="0 0 280 130" preserveAspectRatio="none" role="img" aria-label="Heart rate curve for this workout">
            <polyline points="${chartPoints}" fill="none" stroke="#E56F63" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />
          </svg>
        </div>
        <div class="hr-stats">
          <div><span>Avg</span><strong>${workout.avgHr} bpm</strong></div>
          <div><span>Max</span><strong>${workout.maxHr} bpm</strong></div>
          <div><span>Min</span><strong>${workout.minHr} bpm</strong></div>
        </div>
        <p class="scrub-hint">Heart rate recorded during this session</p>
      </div>
    `,
  });
}

function foodDetailFor(food) {
  const per100 = food.per100;
  const unit = food.unit ?? null;
  const grams = unit
    ? Math.max(1, Math.round(food.count * unit.grams))
    : Math.max(1, Math.round(food.count));
  const multiplier = grams / 100;
  const macros = {
    calories: Math.round(per100.calories * multiplier),
    protein: Math.round(per100.protein * multiplier * 10) / 10,
    carbs: Math.round(per100.carbs * multiplier * 10) / 10,
    fat: Math.round(per100.fat * multiplier * 10) / 10,
    fiber: Math.round(per100.fiber * multiplier * 10) / 10,
  };
  return { grams, macros };
}

function foodDetailScreen() {
  const item = state.foodDetail;
  if (!item) return foodSearchScreen();
  const { grams, macros } = foodDetailFor(item);
  const units = item.units ?? [];

  return `<div class="app"><div class="food-screen">
    ${statusBar()}
    <div class="food-head">
      <button type="button" class="back-btn page-back" data-action="back" aria-label="Go back">${mdi("arrow-left")}</button>
      <strong class="food-title">${esc(item.name)}</strong>
      <span class="page-back-spacer"></span>
    </div>
    <div class="page-scroll food-scroll">
      <p class="food-category">${esc(item.category)}</p>
      <p class="food-attribution">Nutrition data from OpenNutrition (https://www.opennutrition.app), licensed under ODbL/DbCL.</p>

      <div class="card serving-card">
        <div class="serving-input-wrap">
          <input class="serving-input" type="text" inputmode="decimal" value="${esc(String(item.count))}" data-field="serving" aria-label="Serving amount" />
          <button type="button" class="unit-select" data-action="open-units">
            <span>${item.unit ? item.unit.label : "grams"}</span>${mdi("chevron-down")}
          </button>
        </div>
      </div>

      <div class="card macros-card">
        <p class="macros-title">Nutrition for ${item.unit ? `${item.count} ${item.unit.label} (${grams}g)` : `${grams}g`}</p>
        <div class="macro-badges">
          <div class="macro-badge" style="background:#FEF3C7"><strong>${macros.calories}</strong><span>Calories</span></div>
          <div class="macro-badge" style="background:#DBEAFE"><strong>${macros.protein}g</strong><span>Protein</span></div>
          <div class="macro-badge" style="background:#FCE7F3"><strong>${macros.carbs}g</strong><span>Carbs</span></div>
        </div>
        <div class="macro-badges">
          <div class="macro-badge" style="background:#E0E7FF"><strong>${macros.fat}g</strong><span>Fat</span></div>
          <div class="macro-badge" style="background:#D1FAE5"><strong>${macros.fiber}g</strong><span>Fiber</span></div>
          <div class="macro-badge" style="background:#F3E8FF"><strong>${Math.round(item.per100.calories)}</strong><span>Per 100g</span></div>
        </div>
      </div>

      <button type="button" class="log-btn" data-action="log-food-detail">
        ${mdi(item.mealId ? "pencil" : "check")} ${item.mealId ? "Update" : "Log"} ${macros.calories} cal
      </button>
    </div>
  </div></div>`;
}

function foodSearchScreen() {
  const query = state.foodQuery.trim().toLowerCase();
  const results = FOODS.filter((food) =>
    !query || food.name.toLowerCase().includes(query) || food.category.toLowerCase().includes(query)
  );
  return `<div class="app"><div class="food-screen">
    ${statusBar()}
    <div class="food-head">
      <button type="button" class="back-btn page-back" data-action="back" aria-label="Go back">${mdi("arrow-left")}</button>
      <strong class="food-title">Add Food</strong>
      <span class="page-back-spacer"></span>
    </div>
    <div class="page-scroll food-scroll">
      <p class="food-attribution">Nutrition data from OpenNutrition (https://www.opennutrition.app), licensed under ODbL/DbCL.</p>
      <label class="search-input">
        ${mdi("magnify")}
        <input type="text" value="${esc(state.foodQuery)}" data-field="foodQuery" placeholder="Search foods..." autocomplete="off" aria-label="Search foods" />
      </label>
      ${results.length === 0
        ? `<div class="search-empty">${mdi("food-off")}<span>No foods found</span></div>`
        : `<div class="food-results card">${results.map((food) => `<button type="button" class="food-row" data-action="open-food" data-value="${food.id}">
            <span class="food-row-copy"><strong>${food.name}</strong><small>${food.category}</small><span>${food.per100.calories} cal · ${food.per100.protein}g P · ${food.per100.carbs}g C · ${food.per100.fat}g F</span></span>
            ${mdi("chevron-right")}
          </button>`).join("")}</div>`}
    </div>
  </div></div>`;
}

function settingsScreen() {
  const s = state.settings;
  const timeLabel = `${s.briefHour % 12 === 0 ? 12 : s.briefHour % 12}:${String(s.briefMinute).padStart(2, "0")} ${s.briefHour < 12 ? "AM" : "PM"}`;
  const testLabel = s.briefTest === "sent"
    ? "Test brief sent!"
    : s.briefTest === "error"
      ? "Couldn't send — check notifications"
      : "Send a test brief now";
  return `<div class="app"><div class="page-screen">
    ${statusBar()}
    <div class="page-head centered settings-head">
      <button type="button" class="back-btn page-back" data-action="back" aria-label="Go back">${mdi("arrow-left")}</button>
      <h1 class="page-title">Settings</h1>
      <span class="page-back-spacer"></span>
    </div>
    <div class="page-scroll">
      <p class="settings-section-label">AI ASSISTANT</p>
      <button type="button" class="settings-row" data-action="open-ai-settings">
        <span class="settings-row-icon" style="background:rgba(32,33,38,.07);color:var(--ink)">${mdi("robot-outline")}</span>
        <span class="settings-copy"><strong>AI Assistant</strong><small>${state.aiMode === "api" ? (state.apiKey ? `OpenRouter · ${esc(state.model || "openrouter/free")}` : "Your own key · not set") : state.aiMode === "local" ? "On-device" : "Off"}</small></span>
        ${mdi("chevron-right")}
      </button>
      <p class="settings-hint">Chat, food logging, and plan building use this AI. Switch anytime — or turn it off entirely.</p>

      <p class="settings-section-label">PROFILE</p>
      <button type="button" class="settings-row" data-action="open-profile-settings">
        <span class="settings-row-icon" style="background:rgba(138,114,200,.1);color:var(--lilac)">${mdi("account-outline")}</span>
        <span class="settings-copy"><strong>Age, height &amp; weight</strong><small>${state.onboarding.age ? `${state.onboarding.age} yrs` : "Not set up"}${state.onboarding.height ? ` · ${state.onboarding.height} cm` : ""}${state.onboarding.weight ? ` · ${state.onboarding.weightUnit === "lb" ? `${(Number(state.onboarding.weight) * LBS_PER_KG).toFixed(1)} lbs` : `${state.onboarding.weight} kg`}` : ""}</small></span>
        ${mdi("chevron-right")}
      </button>
      <p class="settings-hint">Personalizes calorie and protein targets plus the biological-age estimate. Stays on this device.</p>

      <p class="settings-section-label">MORNING BRIEF</p>
      <div class="settings-row static">
        <span class="settings-row-icon" style="background:rgba(214,154,67,.1);color:var(--warning)">${mdi("weather-sunset-up")}</span>
        <span class="settings-copy"><strong>Daily morning brief</strong><small>${s.briefEnabled ? `Scheduled for ${timeLabel}` : "Off — tap to enable"}</small></span>
        <button type="button" class="switch ${s.briefEnabled ? "on" : ""}" data-action="toggle-brief" role="switch" aria-checked="${s.briefEnabled}" aria-label="Daily morning brief"><i></i></button>
      </div>
      ${s.briefEnabled ? `<div class="brief-panel">
        <span class="brief-panel-label">Time</span>
        <div class="brief-time-row">
          <div class="time-block"><span>Hour</span><div class="time-stepper">
            <button type="button" data-action="brief-hour" data-delta="-1" aria-label="Earlier hour">${mdi("minus")}</button>
            <strong>${s.briefHour % 12 === 0 ? 12 : s.briefHour % 12}</strong>
            <button type="button" data-action="brief-hour" data-delta="1" aria-label="Later hour">${mdi("plus")}</button>
          </div></div>
          <div class="time-block"><span>Minute</span><div class="time-stepper">
            <button type="button" data-action="brief-minute" data-delta="-1" aria-label="Earlier minute">${mdi("minus")}</button>
            <strong>${String(s.briefMinute).padStart(2, "0")}</strong>
            <button type="button" data-action="brief-minute" data-delta="1" aria-label="Later minute">${mdi("plus")}</button>
          </div></div>
          <div class="brief-ampm">${s.briefHour < 12 ? "AM" : "PM"}</div>
        </div>
        <button type="button" class="test-brief ${s.briefTest}" data-action="test-brief">
          ${mdi(s.briefTest === "sent" ? "check-circle" : s.briefTest === "error" ? "alert-circle-outline" : "bell-outline")}
          <span>${testLabel}</span>
        </button>
      </div>` : ""}

      <p class="settings-section-label">UNITS</p>
      <div class="settings-row static">
        <span class="settings-row-icon" style="background:rgba(91,123,225,.1);color:var(--info)">${mdi("ruler")}</span>
        <span class="settings-copy"><strong>Distance</strong><small>${state.distanceUnit === "km" ? "Kilometers" : "Miles"}</small></span>
        <div class="unit-switch">
          <button type="button" class="${state.distanceUnit === "km" ? "active" : ""}" data-action="set-distance-unit" data-value="km">km</button>
          <button type="button" class="${state.distanceUnit === "mi" ? "active" : ""}" data-action="set-distance-unit" data-value="mi">mi</button>
        </div>
      </div>
      <p class="settings-hint">Distances from steps, workouts, and strain are shown in this unit.</p>
      <div class="settings-row static">
        <span class="settings-row-icon" style="background:rgba(214,154,67,.1);color:var(--warning)">${mdi("scale-bathroom")}</span>
        <span class="settings-copy"><strong>Weight</strong><small>${state.weightUnit === "kg" ? "Kilograms" : "Pounds"}</small></span>
        <div class="unit-switch">
          <button type="button" class="${state.weightUnit === "kg" ? "active" : ""}" data-action="set-weight-unit" data-value="kg">kg</button>
          <button type="button" class="${state.weightUnit === "lb" ? "active" : ""}" data-action="set-weight-unit" data-value="lb">lbs</button>
        </div>
      </div>
      <p class="settings-hint">Body weight entries in the journal are shown in this unit.</p>

      <p class="settings-section-label">HEALTH &amp; DEVICES</p>
      <button type="button" class="settings-row" data-action="settings-health">
        <span class="settings-row-icon" style="background:rgba(85,164,119,.1);color:var(--success)">${mdi("heart-pulse")}</span>
        <span class="settings-copy"><strong>Health data</strong><small>Connected</small></span>
        <i class="settings-status-dot"></i>
      </button>
      <p class="settings-hint">Reads from Apple Health or Health Connect. Everything stays on your device.</p>

      <p class="settings-section-label">ABOUT</p>
      <div class="settings-row static">
        <span class="settings-row-icon" style="background:var(--elevated);color:var(--ink)">${mdi("dna")}</span>
        <span class="settings-copy"><strong>Akosian</strong><small>Version 1.0.0 · PolyForm Noncommercial</small></span>
      </div>
      <p class="settings-hint">Free forever. No account, no ads, no data selling. Source-available under the PolyForm Noncommercial License 1.0.0.</p>
    </div>
  </div></div>`;
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
    case "health":
      return healthScreen();
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
    case "settings":
      return settingsScreen();
    case "sleep":
      return sleepDetailScreen();
    case "strain":
      return strainDetailScreen();
    case "workout":
      return workoutDetailScreen();
    case "foodSearch":
      return foodSearchScreen();
    case "foodDetail":
      return foodDetailScreen();
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
        <div class="eyebrow-row"><span class="dot"></span><span>1 of 3</span></div>
        <h2 class="onb-title">What do you wear?</h2>
        <p class="onb-sub">Connect a device for automatic data, or continue without one — you can change this later.</p>
      </div>
      <div class="device-list">${rows}</div>
      <div class="note-card">${mdi("information-outline")}<span>Health access is native-only. The demo shows a realistic sample day so you can explore the rest of the app.</span></div>
    `,
  });
}

function healthScreen() {
  const device = DEVICES.find((item) => item.id === state.onboarding.device);
  const isApple = state.onboarding.device === "apple";
  const permissions = isApple
    ? [
        { icon: "shoe-print", label: "Steps & Distance", color: "#55A477" },
        { icon: "heart", label: "Heart Rate", color: "#E56F63" },
        { icon: "sleep", label: "Sleep Analysis", color: "#5B7BE1" },
        { icon: "fire", label: "Active Calories", color: "#D69A43" },
        { icon: "water-opacity", label: "Blood Oxygen", color: "#5B7BE1" },
        { icon: "thermometer", label: "Body Temperature", color: "#5B7BE1" },
      ]
    : [
        { icon: "shoe-print", label: "Steps & Distance", color: "#55A477" },
        { icon: "heart", label: "Heart Rate", color: "#E56F63" },
        { icon: "sleep", label: "Sleep Analysis", color: "#5B7BE1" },
        { icon: "fire", label: "Active Calories", color: "#D69A43" },
        { icon: "water-opacity", label: "Blood Oxygen", color: "#5B7BE1" },
        { icon: "thermometer", label: "Body Temperature", color: "#5B7BE1" },
      ];

  return onboardingShell({
    content: `
      <div class="onb-header">
        <div class="eyebrow-row"><span class="dot"></span><span>2 of 3</span></div>
        <h2 class="onb-title">${isApple ? "Connect to HealthKit" : "Connect to Health Connect"}</h2>
        <p class="onb-sub">${isApple
          ? "Apple will show a permission sheet next — pick the categories to share. You can change them later in Settings."
          : "Android will show a permission sheet next — choose the categories to share. You can change them later in Settings."}</p>
      </div>
      <div class="permissions-list">
        ${permissions.map((permission) => `<div class="permission-row">
          <span class="permission-icon" style="background:${permission.color}15;color:${permission.color}">${mdi(permission.icon)}</span>
          <span class="permission-label">${permission.label}</span>
          ${mdi("check-circle", "permission-check")}
        </div>`).join("")}
      </div>
      <div class="note-card">${mdi("lock-outline")}<span>${device ? `${device.label} data` : "Health data"} is read on-device only. Nothing is uploaded to a server.</span></div>
    `,
    footer: `<button type="button" class="footer-btn" data-action="health-connect">${mdi("shield-lock")}Review Health Access</button>
      <button type="button" class="footer-skip" data-action="health-skip">Set Up Later</button>`,
  });
}

function profileScreen() {
  const sexOptions = [
    { id: "female", label: "Female", desc: "Use female reference ranges" },
    { id: "male", label: "Male", desc: "Use male reference ranges" },
    { id: "unspecified", label: "Prefer not to say", desc: "Use sex-neutral ranges" },
  ];
  const o = state.onboarding;
  const ageValid = isAgeValid(o.age);
  const heightCm = o.heightUnit === "cm"
    ? o.height.trim() ? Number(o.height) : null
    : o.heightFt.trim() || o.heightIn.trim()
      ? (Number(o.heightFt || 0) * 12 + Number(o.heightIn || 0)) * CM_PER_IN
      : null;
  const heightOk = heightCm == null || (Number.isFinite(heightCm) && heightCm >= 90 && heightCm <= 250);
  const weightOk = !o.weight.trim() || (Number.isFinite(Number(o.weight)) && Number(o.weight) > 0);
  const canContinue = ageValid && heightOk && weightOk;
  const ageHint = !o.age.trim()
    ? "Used to compare your metrics with age-matched reference ranges."
    : !ageValid
      ? "Enter an age between 18 and 100."
      : "Your age is stored only on this device.";
  const displayWeight = o.weight.trim()
    ? o.weightUnit === "lb"
      ? String(Math.round(Number(o.weight) * LBS_PER_KG * 10) / 10)
      : o.weight
    : "";

  return onboardingShell({
    content: `
      <div class="onb-header">
        <div class="eyebrow-row"><span class="dot"></span><span>PERSONALIZE</span></div>
        <h2 class="onb-title">A little about you</h2>
        <p class="onb-sub">Personalizes your calorie targets and sharpens your biological-age estimate — a wellness index, not a medical diagnosis.</p>
      </div>

      <div class="form-section">
        <div class="form-label"><span>Chronological age</span></div>
        <label class="input-wrap ${o.age.trim() && !ageValid ? "invalid" : ""}">
          <input type="number" inputmode="numeric" value="${esc(o.age)}" data-field="age" min="18" max="100" placeholder="Your age" aria-label="Age" />
          <span class="unit">years</span>
        </label>
        <p class="form-hint ${o.age.trim() && !ageValid ? "invalid" : ""}">${ageHint}</p>
      </div>

      <div class="form-section">
        <div class="form-label row">
          <span>Height</span>
          <span class="unit-switch">
            <button type="button" class="${o.heightUnit === "cm" ? "active" : ""}" data-action="height-unit" data-value="cm">cm</button>
            <button type="button" class="${o.heightUnit === "ft" ? "active" : ""}" data-action="height-unit" data-value="ft">ft</button>
          </span>
        </div>
        <p class="form-hint">Optional · personalizes calorie targets and BMI.</p>
        ${o.heightUnit === "cm"
          ? `<label class="input-wrap ${!heightOk ? "invalid" : ""}">
              <input type="number" inputmode="decimal" value="${esc(o.height)}" data-field="height" placeholder="Your height" aria-label="Height in centimetres" />
              <span class="unit">cm</span>
            </label>
            ${!heightOk ? '<p class="form-hint invalid">Enter a height between 90 and 250 cm.</p>' : ""}`
          : `<div class="split-row">
              <label class="input-wrap ${!heightOk ? "invalid" : ""}">
                <input type="number" inputmode="numeric" value="${esc(o.heightFt)}" data-field="heightFt" placeholder="5" aria-label="Height feet" />
                <span class="unit">ft</span>
              </label>
              <label class="input-wrap ${!heightOk ? "invalid" : ""}">
                <input type="number" inputmode="numeric" value="${esc(o.heightIn)}" data-field="heightIn" placeholder="9" aria-label="Height inches" />
                <span class="unit">in</span>
              </label>
            </div>
            ${!heightOk ? '<p class="form-hint invalid">Enter a height between 90 and 250 cm.</p>' : ""}`}
      </div>

      <div class="form-section">
        <div class="form-label row">
          <span>Weight</span>
          <span class="unit-switch">
            <button type="button" class="${o.weightUnit === "kg" ? "active" : ""}" data-action="weight-unit" data-value="kg">kg</button>
            <button type="button" class="${o.weightUnit === "lb" ? "active" : ""}" data-action="weight-unit" data-value="lb">lb</button>
          </span>
        </div>
        <p class="form-hint">Optional · calorie and protein targets. Your tracker can update it.</p>
        <label class="input-wrap ${!weightOk ? "invalid" : ""}">
          <input type="number" inputmode="decimal" value="${esc(displayWeight)}" data-field="weight" placeholder="Your weight" aria-label="Weight" />
          <span class="unit">${o.weightUnit === "kg" ? "kg" : "lbs"}</span>
        </label>
      </div>

      <div class="form-section">
        <div class="form-label"><span>Biological sex</span></div>
        <p class="form-hint">Optional · helps us choose more appropriate reference ranges.</p>
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
    footer: `<button type="button" class="footer-btn" data-action="profile-continue" ${canContinue ? "" : "disabled"}>Continue${mdi("arrow-right")}</button>`,
  });
}

function aiScreen() {
  const cards = AI_MODES.map((mode) => {
    const selected = state.aiMode === mode.id;
    return `<button type="button" class="choice-card ${selected ? "selected" : ""}" data-action="select-ai" data-value="${mode.id}">
      <span class="choice-top">
        <span class="choice-icon">${mdi(mode.icon)}</span>
        <span class="choice-heading">
          <span class="choice-title-row"><span class="choice-title">${mode.title}</span><span class="badge ${mode.badgeClass}">${mode.badge}</span></span>
          <span class="choice-sub">${mode.sub}</span>
        </span>
        <span class="choice-radio"></span>
      </span>
      <span class="choice-desc">${mode.desc}</span>
    </button>`;
  }).join("");

  const info = state.aiMode === "none"
    ? `<div class="info-card">
        <span class="info-icon success">${mdi("shield-check-outline")}</span>
        <div>
          <strong>What still works without AI</strong>
          <p>Readiness, strain, biological age, the morning brief, journaling, and the offline food database with barcode scanning all run on your phone. Turn AI on anytime from the chat screens.</p>
        </div>
      </div>`
    : state.aiMode === "local"
      ? `<div class="info-card">
          <span class="info-icon success">${mdi("shield-lock-outline")}</span>
          <div>
            <strong>Before choosing local</strong>
            <p>Prompts never reach a cloud service, but expect fewer features, slower replies, and a large download. “Check my device” reads this phone's memory and free storage to pick the largest model that fits — then measures real speed on the device once that model has downloaded.</p>
          </div>
        </div>`
      : `<div class="info-card">
          <span class="info-icon">${mdi("key-outline")}</span>
          <div>
            <strong>How your key is handled</strong>
            <p>Stored encrypted on this device and sent straight from your phone to the provider you pick — never through us. Billed at the provider's rates; remove the key anytime.</p>
          </div>
        </div>`;

  return onboardingShell({
    content: `
      <div class="onb-header">
        <div class="eyebrow-row"><span class="dot"></span><span>YOUR AI</span></div>
        <h2 class="onb-title">Choose how your assistant runs</h2>
        <p class="onb-sub">Bring your own key, run a model on-device, or skip it. Saved on this device — change anytime.</p>
      </div>
      <div class="choice-list">${cards}</div>

      ${info}

      <div class="info-card">
        <span class="info-icon">${mdi("hand-coin-outline")}</span>
        <div>
          <strong>We don't earn money from any of them</strong>
          <p>All three options are free to set up, and we make nothing from your choice — no commission, referral fee, or provider payment. Any API usage you pay for goes straight to that provider, not us.</p>
        </div>
      </div>

      <div class="info-card">
        <span class="info-icon">${mdi("fingerprint")}</span>
        <div>
          <strong>We scrub before cloud requests</strong>
          <p>Before cloud requests we scrub common identifiers — emails, phone numbers, links, network addresses, government-ID patterns, and name or address phrases. Best-effort, not a guarantee: cloud AI still means text leaves your phone, so keep anything you need offline out of chat. BYOK keys stay on this device and go only to your provider.</p>
        </div>
      </div>
    `,
    footer: `<button type="button" class="footer-btn" data-action="ai-continue">Continue${mdi("arrow-right")}</button>`,
  });
}

function byokScreen() {
  const providerColors = {
    openai: { bg: "#E8F0FB", fg: "#0E7C66" },
    anthropic: { bg: "#F6EDE4", fg: "#B05A2A" },
    gemini: { bg: "#E8F2FF", fg: "#3B6FE0" },
    openrouter: { bg: "#F1EEFC", fg: "#6B4FD1" },
  };
  const providers = PROVIDERS.map((provider) => `
    <button type="button" class="provider-card ${state.provider === provider.id ? "selected" : ""}" data-action="select-provider" data-value="${provider.id}">
      <span class="provider-avatar" style="background:${providerColors[provider.id].bg};color:${providerColors[provider.id].fg}">${provider.initial}</span>
      <span class="provider-label-wrap">${provider.label}${provider.free ? '<span class="free">FREE · RECOMMENDED</span>' : ""}</span>
      ${state.provider === provider.id ? `<span class="provider-check">${mdi("check")}</span>` : ""}
    </button>`).join("");

  const test = state.testState;
  const testResult = !test
    ? ""
    : test.status === "testing"
      ? `<div class="test-result ok">${mdi("loading")} Testing the connection…</div>`
      : `<div class="test-result ${test.ok ? "ok" : "fail"}">${mdi(test.ok ? "check-circle" : "alert-circle-outline")}<span>${esc(test.message)}</span></div>`;

  const modelHint = state.provider === "openrouter"
    ? "Type openrouter/free for free models — no payment needed."
    : state.provider === "openai"
      ? "e.g. gpt-4o-mini, gpt-4o"
      : state.provider === "anthropic"
        ? "e.g. claude-3-5-haiku-latest, claude-sonnet-4"
        : "e.g. gemini-2.0-flash, gemini-2.5-flash";
  const providerName = PROVIDERS.find((provider) => provider.id === state.provider)?.label ?? "OpenRouter";

  return onboardingShell({
    content: `
      <div class="onb-header">
        <div class="eyebrow-row"><span class="dot"></span><span>BRING YOUR OWN KEY</span></div>
        <h2 class="onb-title">Use your own AI account</h2>
        <p class="onb-sub">Pick a provider and paste your API key. It stays on this device and goes only to that provider — never through us.</p>
      </div>

      <div class="form-section">
        <div class="form-label"><span>Provider</span></div>
        <div class="provider-grid">${providers}</div>
      </div>

      ${state.provider === "openrouter"
        ? `<button type="button" class="guide-link" data-action="toggle-guide">
            ${mdi(state.showGuide ? "chevron-up" : "help-circle-outline")}<span>How to set it up</span>
          </button>
          ${state.showGuide ? `<div class="guide-card">
            <strong class="guide-title">Set up OpenRouter in 5 steps</strong>
            ${OPENROUTER_STEPS.map((step, index) => `<div class="guide-step"><span class="guide-num">${index + 1}</span><span>${step}</span></div>`).join("")}
            <p class="guide-note">Free models allow about 50 requests a day — plenty for daily coaching. No card required.</p>
            <a class="guide-btn" href="https://openrouter.ai/settings/keys" target="_blank" rel="noopener">${mdi("open-in-new")} Open OpenRouter keys page</a>
          </div>` : ""}`
        : ""}

      <div class="form-section">
        <div class="form-label"><span>API key</span></div>
        <label class="key-input">
          ${mdi("key-outline")}
          <input type="${state.showKey ? "text" : "password"}" value="${esc(state.apiKey)}" data-field="apiKey" placeholder="Paste your ${providerName} API key" autocomplete="off" spellcheck="false" aria-label="API key" />
          <button type="button" class="eye-btn" data-action="toggle-key" aria-label="${state.showKey ? "Hide key" : "Show key"}">${mdi(state.showKey ? "eye-off-outline" : "eye-outline")}</button>
        </label>
      </div>

      <div class="form-section">
        <div class="form-label"><span>Model</span></div>
        <input class="text-input" type="text" value="${esc(state.model)}" data-field="model" placeholder="openrouter/free" autocomplete="off" spellcheck="false" aria-label="Model" />
        <p class="form-hint">${modelHint}</p>
      </div>

      <button type="button" class="test-row" data-action="test-key" ${state.apiKey.trim() ? "" : "disabled"}>
        ${mdi("flash-outline")} ${test && test.status === "testing" ? "Testing…" : "Test connection"}
      </button>
      ${testResult}

      <div class="note-card">${mdi("shield-lock-outline")}<span>Your key is stored encrypted in secure storage and sent only to the provider you choose. Before any request, we scrub common personal identifiers — best-effort, not a guarantee. In this browser demo the key is never persisted.</span></div>
    `,
    footer: `<button type="button" class="footer-btn" data-action="save-key" ${state.apiKey.trim() ? "" : "disabled"}>Save &amp; continue${mdi("arrow-right")}</button>`,
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
        <p>Your health data appears on the Overview tab — change anything later in Settings.</p>
        <div class="plan-card">
          <div class="plan-head">${mdi("creation")}<span>Your coach plan</span></div>
          <p class="plan-goals">${labels.length ? labels.join(" + ") : "Your custom plan"}</p>
          <div class="plan-row">${mdi("format-list-checks")}<span>Habits ready in the Journal</span></div>
          <div class="plan-row">${mdi("food-apple-outline")}<span>Nutrition targets under your food log</span></div>
          <div class="plan-row">${mdi("weather-night")}<span>Sleep goal on the Home dial</span></div>
          ${state.aiMode === "none" ? "" : `<div class="plan-row">${mdi("robot-outline")}<span>Ask Coach anything to adjust the plan</span></div>`}
        </div>
      </div>
      <div class="onb-footer" style="padding-left:0;padding-right:0">
        ${footerButton("Get Started", "finish-onboarding", { icon: "" })}
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
        ? `<div class="tab-head"><div><h1>Journal</h1><p class="date">${new Date().toLocaleDateString("en-US", { month: "short", year: "numeric" })}</p></div><div class="tab-head-actions"><button type="button" class="icon-btn" data-action="brief-settings" aria-label="Morning brief settings">${mdi("bell-outline")}</button></div></div>`
        : state.tab === "activity"
          ? `<div class="tab-head"><div><h1>Fitness</h1><p class="date">Last 30 days</p></div></div>`
          : "";

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
        <div class="snapshot-value" style="font-size:16px">${formatDistance(d.distanceKm)}</div>
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

  `;
}

function journalContent() {
  const now = new Date();
  const dayNames = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"];
  const scores = [64, 58, 82, 34, 91, 72, 46];
  const calendar = [];
  const weekStart = new Date(now);
  weekStart.setDate(now.getDate() - now.getDay());
  for (let index = 0; index < 7; index += 1) {
    const day = new Date(weekStart);
    day.setDate(weekStart.getDate() + index);
    const today = day.toDateString() === now.toDateString();
    const future = day > new Date(now.getFullYear(), now.getMonth(), now.getDate());
    calendar.push({
      label: dayNames[day.getDay()],
      date: day.getDate(),
      today,
      score: future ? 0 : scores[index],
    });
  }

  const daytime = [
    { id: "water_goal", emoji: "💧", label: "Glasses of water", type: "counter" },
    { id: "veggies", emoji: "🥬", label: "Veggie servings", type: "counter" },
    { id: "walk", emoji: "🚶", label: "Walks", type: "counter" },
    { id: "sunlight", emoji: "☀️", label: "Morning sunlight", type: "binary" },
    { id: "meditate", emoji: "🧠", label: "Meditation", type: "binary" },
    { id: "read_book", emoji: "📖", label: "Reading", type: "measure" },
    { id: "social", emoji: "💬", label: "Talked to friends/family", type: "binary" },
  ];

  const nighttime = [
    { id: "device_bed", emoji: "📱", label: "No devices in bed", type: "binary" },
    { id: "early_bed", emoji: "🌙", label: "Bed before 10pm", type: "binary" },
    { id: "no_late_food", emoji: "🚫", label: "No food after 8pm", type: "binary" },
  ];

  const habitRow = (habit) => {
    const entry = state.journal.habits[habit.id];
    let control = "";
    if (habit.type === "counter") {
      const pct = Math.min(100, Math.round((entry.value / entry.target) * 100));
      control = `<div class="stepper-row">
        <button type="button" class="stepper-btn" data-action="habit-counter" data-value="${habit.id}" data-delta="-1" aria-label="Decrease ${habit.label}">${mdi("minus")}</button>
        <span class="stepper-track"><span class="stepper-fill" style="width:${pct}%"></span><strong>${entry.value}<small> / ${entry.target}</small></strong></span>
        <button type="button" class="stepper-btn plus" data-action="habit-counter" data-value="${habit.id}" data-delta="1" aria-label="Increase ${habit.label}">${mdi("plus")}</button>
      </div>`;
    } else if (habit.type === "measure") {
      control = `<button type="button" class="measure-pill" data-action="habit-measure" data-value="${habit.id}">
        <strong>${entry.value}</strong><small>${entry.unit}</small>${mdi("pencil-outline")}
      </button>`;
    } else {
      control = `<div class="binary-row">
        <button type="button" class="binary-btn ${entry.state === "no" ? "active-no" : ""}" data-action="habit-binary" data-value="${habit.id}" data-state="no" aria-label="Mark ${habit.label} not done">${mdi("close-thick")}</button>
        <button type="button" class="binary-btn ${entry.state === "yes" ? "active-yes" : ""}" data-action="habit-binary" data-value="${habit.id}" data-state="yes" aria-label="Mark ${habit.label} done">${mdi("check-bold")}</button>
      </div>`;
    }
    return `<div class="entry-row">
      <span class="entry-emoji">${habit.emoji}</span>
      <span class="entry-label">${habit.label}</span>
      ${control}
    </div>`;
  };

  const moodOptions = ["😞", "🙁", "😐", "🙂", "😊"];
  const meals = state.journal.meals;
  const totalCalories = meals.reduce((sum, meal) => sum + meal.calories, 0);
  const totalProtein = meals.reduce((sum, meal) => sum + meal.protein, 0);
  const totalCarbs = meals.reduce((sum, meal) => sum + meal.carbs, 0);
  const totalFat = meals.reduce((sum, meal) => sum + meal.fat, 0);
  const macroCalories = totalProtein * 4 + totalCarbs * 4 + totalFat * 9;
  const macroPct = (grams, perGram) =>
    macroCalories > 0 ? Math.round((grams * perGram * 100) / macroCalories) : 0;
  const proteinPct = macroPct(totalProtein, 4);
  const carbsPct = macroPct(totalCarbs, 4);
  const fatPct = macroPct(totalFat, 9);

  const nightRange = `${now.toLocaleDateString("en-US", { month: "short", day: "numeric" })} – ${new Date(now.getTime() + 86400000).toLocaleDateString("en-US", { month: "short", day: "numeric" })}`;

  return `
    <div class="calendar-strip">
      ${calendar.map((day) => `<div class="calendar-day ${day.today ? "today" : ""} ${day.score > 0 ? "has-score" : ""}">
        <span>${day.label}</span><strong>${day.date}</strong>
        <i class="day-score" style="width:${Math.max(4, day.score)}%"></i>
      </div>`).join("")}
    </div>

    <div class="section-header">
      <p class="section-title inline">Today's entries</p>
      <button type="button" class="edit-habits" data-action="edit-habits">${mdi("pencil-outline")} Edit Habits</button>
    </div>

    <p class="daytime-label">DAYTIME</p>

    <div class="card entries-card">
      ${daytime.map(habitRow).join("")}
      <div class="entry-row">
        <span class="entry-emoji">😊</span>
        <span class="entry-label">Daily mood</span>
        <div class="mood-picker">
          ${moodOptions.map((emoji, index) => `<button type="button" class="mood-option ${state.journal.mood === index ? "active" : ""}" data-action="mood-select" data-value="${index}" aria-label="Mood ${index + 1}">${emoji}</button>`).join("")}
        </div>
      </div>
      <div class="entry-row">
        <span class="entry-emoji">💧</span>
        <span class="entry-label">Hydration</span>
        <button type="button" class="arrow-pill" data-action="hydration" aria-label="Edit hydration">
          <strong>${state.journal.hydration}</strong><small>cups</small>${mdi("chevron-right")}
        </button>
      </div>
    </div>

    <div class="nighttime-header">
      <p class="section-title inline">Nighttime</p>
      <span class="nighttime-date">${nightRange}</span>
    </div>
    <div class="card entries-card">
      ${nighttime.map(habitRow).join("")}
    </div>

    <div class="meals-section">
      <div class="meals-header">
        <p class="section-title inline">Meals</p>
        <button type="button" class="add-meal-btn" data-action="add-meal" aria-label="Add meal">${mdi("plus")}</button>
      </div>
      <p class="food-attribution">Nutrition data from OpenNutrition (https://www.opennutrition.app), licensed under ODbL/DbCL.</p>
      <div class="card meals-card">
        ${meals.map((meal) => `<div class="meal-row">
          <div class="meal-row-left">
            ${mdi("food-apple", "meal-icon")}
            <div class="meal-row-text">
              <strong>${meal.foodName}</strong>
              <small>${meal.time} · ${meal.grams}g</small>
            </div>
          </div>
          <div class="meal-row-right">
            <span class="meal-cals">${meal.calories} cal</span>
            <span class="meal-actions">
              <button type="button" class="meal-action" data-action="meal-edit" data-value="${meal.id}" aria-label="Edit ${meal.foodName}">${mdi("pencil-outline")}</button>
              <button type="button" class="meal-action" data-action="meal-delete" data-value="${meal.id}" aria-label="Delete ${meal.foodName}">${mdi("trash-can-outline")}</button>
            </span>
          </div>
        </div>`).join("")}
      </div>
      <p class="meals-total">Total: ${totalCalories} cal · ${totalProtein.toFixed(1)}g P · ${totalCarbs.toFixed(1)}g C · ${totalFat.toFixed(1)}g F</p>

      <div class="card eating-card">
        <div class="eating-head">
          <span class="eating-icon">${mdi("silverware-fork-knife")}</span>
          <div class="eating-copy"><strong>How you ate</strong><small>A gentle snapshot from your food log</small></div>
          <span class="count-badge">${meals.length} items</span>
        </div>
        <div class="eating-hero">
          <div class="calorie-orb"><strong>${totalCalories.toLocaleString()}</strong><small>cal logged</small></div>
          <div class="eating-rhythm">
            <span class="mini-eyebrow">TODAY'S RHYTHM</span>
            <strong>A nicely spread-out day</strong>
            <p>Your logged meals are spread across morning, midday, and evening.</p>
          </div>
        </div>
        <div class="divider"></div>
        <div class="section-label-row"><span>Macro mix</span><small>calorie share</small></div>
        <div class="macro-stack">
          <i style="flex:${proteinPct};background:#5D8793"></i>
          <i style="flex:${carbsPct};background:#D69A43"></i>
          <i style="flex:${fatPct};background:#C96D63"></i>
        </div>
        <div class="macro-line"><span class="macro-name"><i style="background:#5D8793"></i>Protein</span><span class="macro-track"><i style="width:${proteinPct}%;background:#5D8793"></i></span><b>${totalProtein.toFixed(1)}g</b></div>
        <div class="macro-line"><span class="macro-name"><i style="background:#D69A43"></i>Carbs</span><span class="macro-track"><i style="width:${carbsPct}%;background:#D69A43"></i></span><b>${totalCarbs.toFixed(1)}g</b></div>
        <div class="macro-line"><span class="macro-name"><i style="background:#C96D63"></i>Fat</span><span class="macro-track"><i style="width:${fatPct}%;background:#C96D63"></i></span><b>${totalFat.toFixed(1)}g</b></div>
        <p class="eating-note">A snapshot of your logged meals — not a prescription or a score.</p>
      </div>

      <div class="card goals-card">
        <div class="eating-head">
          <span class="eating-icon">${mdi("target")}</span>
          <div class="eating-copy"><strong>Daily nutrition goals</strong><small>From your coach plan</small></div>
          <button type="button" class="edit-goals" data-action="edit-goals">${mdi("pencil-outline")} Edit</button>
          <span class="hit-badge">2/4 hit</span>
        </div>
        <div class="goal-line"><span class="goal-label"><i style="background:#202126"></i>Calories</span><span class="goal-value"><b>${totalCalories.toLocaleString()}</b> / 2,100 kcal</span><span class="goal-track"><i style="width:${Math.min(100, Math.round((totalCalories / 2100) * 100))}%;background:#202126"></i></span></div>
        <div class="goal-line"><span class="goal-label"><i style="background:#5D8793"></i>Protein</span><span class="goal-value"><b>${totalProtein}</b> / 150 g</span><span class="goal-track"><i style="width:${Math.min(100, Math.round((totalProtein / 150) * 100))}%;background:#5D8793"></i></span></div>
        <div class="goal-line"><span class="goal-label"><i style="background:#D69A43"></i>Carbs</span><span class="goal-value"><b>${totalCarbs}</b> / 230 g</span><span class="goal-track"><i style="width:${Math.min(100, Math.round((totalCarbs / 230) * 100))}%;background:#D69A43"></i></span></div>
        <div class="goal-line"><span class="goal-label"><i style="background:#C96D63"></i>Fat</span><span class="goal-value"><b>${totalFat}</b> / 70 g</span><span class="goal-track"><i style="width:${Math.min(100, Math.round((totalFat / 70) * 100))}%;background:#C96D63"></i></span></div>
        <p class="eating-note">Logged against what you ate today. "Hit" for calories means within ±10% — the others count when you reach 90% of target.</p>
      </div>
    </div>
  `;
}

function activityContent() {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();
  const monthLabel = now.toLocaleDateString("en-US", { month: "short", year: "numeric" });
  const firstWeekday = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const counts = [0, 1, 0, 0, 2, 1, 0, 0, 1, 1, 0, 3, 2, 0, 0, 1, 2, 0, 1, 0, 0, 2, 1, 1, 0, 0, 1, 0, 2, 1, 0];
  const cells = [];
  for (let i = 0; i < firstWeekday; i += 1) cells.push(null);
  for (let day = 1; day <= daysInMonth; day += 1) {
    cells.push({ day, count: counts[(day - 1) % counts.length] ?? 0, today: day === now.getDate() });
  }
  while (cells.length % 7 !== 0) cells.push(null);

  const heatColor = (count) =>
    count === 0 ? "#F0F1F4" : count === 1 ? "#E4F0E5" : count === 2 ? "#BFDCC6" : "#79B88A";

  const chartValues = [0, 0.8, 1.6, 2.2, 2.8, 3.9, 4.6, 5.1, 5.8, 6.2, 6.9, 7.5, 8.1, 8.6, 9.3];
  const chartWidth = 280;
  const chartHeight = 96;
  const maxValue = 10;
  const points = chartValues.map((value, index) => {
    const x = (index / (chartValues.length - 1)) * chartWidth;
    const y = chartHeight - (value / maxValue) * chartHeight;
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  });
  const areaPoints = `0,${chartHeight} ${points.join(" ")} ${chartWidth},${chartHeight}`;

  const workouts = WORKOUTS.map((workout) => ({
    ...workout,
    duration: `${workout.durationMin} min`,
    meta: [
      ["fire", `${workout.calories} cal`],
      ...(workout.distanceKm ? [["map-marker-distance", formatDistance(workout.distanceKm)]] : []),
      ["heart-pulse", `${workout.avgHr} bpm`],
    ],
  }));

  return `
    <div class="card heatmap-card">
      <p class="month-label">${monthLabel}</p>
      <div class="weekday-row">${["S", "M", "T", "W", "T", "F", "S"].map((d) => `<span>${d}</span>`).join("")}</div>
      <div class="heatmap-grid">
        ${cells.map((cell) => cell
          ? `<button type="button" class="heat-cell ${cell.today ? "today" : ""}" style="background:${heatColor(cell.count)}" data-action="fitness-day" data-value="${cell.day}" aria-label="${monthLabel} ${cell.day}: ${cell.count} activities"></button>`
          : `<span class="heat-cell empty"></span>`).join("")}
      </div>
      <div class="legend-row">
        <span class="legend-item"><i style="background:#F0F1F4"></i>No activity</span>
        <span class="legend-item"><i style="background:#E4F0E5"></i>1 activity</span>
        <span class="legend-item"><i style="background:#BFDCC6"></i>2 activities</span>
        <span class="legend-item"><i style="background:#79B88A"></i>3+ activities</span>
      </div>
    </div>

    <div class="card activity-summary">
      <strong class="summary-title">Activity summary</strong>
      <div class="summary-main">
        <div>
          <div class="summary-big">9h 20m</div>
          <div class="summary-range">Sep 24 – Oct 23</div>
        </div>
        <span class="summary-count">12 workouts</span>
      </div>
      <div class="line-chart">
        <span class="axis-top">10</span>
        <span class="axis-bottom">0</span>
        <svg viewBox="0 0 ${chartWidth} ${chartHeight}" preserveAspectRatio="none" role="img" aria-label="Cumulative activity chart">
          <defs>
            <linearGradient id="activityFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stop-color="#C4892A" stop-opacity="0.3" />
              <stop offset="100%" stop-color="#C45C52" stop-opacity="0.04" />
            </linearGradient>
          </defs>
          <polygon points="${areaPoints}" fill="url(#activityFill)" />
          <polyline points="${points.join(" ")}" fill="none" stroke="#C45C52" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" />
        </svg>
      </div>
      <p class="scrub-hint">Touch and hold, then drag to explore</p>
    </div>

    <p class="section-title">Recent workouts</p>
    <div class="workout-carousel">
      ${workouts.map((workout) => `<button type="button" class="workout-tile" data-action="workout" data-value="${workout.id}">
        <span class="workout-band" style="background:${workout.bg}">
          <span class="workout-tile-icon" style="background:${workout.color}1F;color:${workout.color}">${mdi(workout.icon)}</span>
          <span class="workout-tile-date">${workout.date}</span>
        </span>
        <strong class="workout-tile-name">${workout.name}</strong>
        <span class="workout-tile-duration">${workout.duration}</span>
        <span class="workout-tile-meta">${workout.meta.map(([icon, label]) => `<span>${mdi(icon)}${label}</span>`).join("")}</span>
        <svg class="workout-hr" viewBox="0 0 120 24" preserveAspectRatio="none" aria-hidden="true">
          <polyline points="0,18 12,14 24,16 36,9 48,12 60,7 72,11 84,6 96,10 108,5 120,8" fill="none" stroke="#E56F63" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" />
        </svg>
      </button>`).join("")}
    </div>
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
  const asOf = new Date().toLocaleDateString("en-US", { month: "long", day: "numeric" });

  const row = (label, value, unit, icon, accent, points) => `
    <div class="card biomarker-row">
      <span class="biomarker-icon" style="color:${accent}">${mdi(icon)}</span>
      <span class="biomarker-copy"><strong>${label}</strong><small>${value}${unit ? ` ${unit}` : ""}</small></span>
      ${sparkline(accent, points)}
      ${mdi("chevron-right", "biomarker-chevron")}
      <button type="button" class="biomarker-add" data-action="log-biomarker" data-value="${label}" aria-label="Log ${label}">${mdi("plus")}</button>
    </div>`;

  return `
    <div class="card bio-hero">
      <h2 class="bio-title">Physiological Age</h2>
      <div class="bio-date-nav">
        <button type="button" class="bio-date-btn" data-action="bio-date" data-value="-1" aria-label="Previous day">${mdi("chevron-left")}</button>
        <span class="bio-date">As of ${asOf}</span>
        <button type="button" class="bio-date-btn disabled" data-action="bio-date" data-value="1" aria-label="Next day" disabled>${mdi("chevron-right")}</button>
      </div>
      <div class="bio-age">${d.bioAge}</div>
      <span class="bio-label-pill">${d.bioLabel}</span>
      <p class="bio-confidence">${d.bioReliability}% low data reliability · ${d.bioBaselineDays} baseline days</p>
    </div>

    <div class="biomarker-header">
      <strong>Biomarkers</strong>
      <p>Consumer health signals · not a medical measurement</p>
    </div>

    <div class="biomarker-list">
      ${row("Weight", state.weightUnit === "lb" ? d.weightLbs.toFixed(1) : d.weight.toFixed(1), state.weightUnit === "lb" ? "lbs" : "kg", "scale-bathroom", "#5B7BE1", [6, 9, 8, 11, 10, 13, 12, 15])}
      ${row("HRV", Math.round(d.hrv), "ms", "waveform", "#8A72C8", [10, 8, 12, 9, 13, 11, 15, 14])}
      ${row("Resting heart rate", Math.round(d.restingHr), "bpm", "heart-pulse", "#E56F63", [15, 13, 14, 12, 13, 11, 12, 10])}
      ${row("Body fat", d.bodyFat.toFixed(1), "%", "percent-outline", "#D69A43", [14, 13, 13, 12, 12, 11, 11, 10])}
      ${row("Lean body mass", state.weightUnit === "lb" ? d.leanLbs.toFixed(1) : d.leanMass.toFixed(1), state.weightUnit === "lb" ? "lbs" : "kg", "human", "#55A477", [8, 9, 9, 10, 10, 11, 11, 12])}
      ${row("Blood oxygen", Math.round(d.oxygen), "%", "lungs", "#5D8793", [12, 12, 13, 12, 13, 13, 12, 13])}
      ${row("VO₂ max", d.vo2Max.toFixed(1), "mL/kg/min", "run-fast", "#C96D63", [8, 9, 10, 10, 11, 12, 13, 14])}
    </div>
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
    ? "Tell me what you ate and I'll log it for you.\nTry \"I had 2 eggs and a banana\" or ask \"what did I eat today?\""
    : "Ask me anything about your health.\n\nTry \"How did I sleep last night?\" or \"Build me a plan\" or \"Analyze my recovery.\"";
}

function chatScreen() {
  if (state.aiMode === "none") {
    const title = state.chatMode === "food" ? "Food Log" : "Ask AI";
    return `<div class="app"><div class="chat-screen">
      ${statusBar()}
      <div class="chat-head">
        <button type="button" class="back-btn" style="margin:0" data-action="close-chat" aria-label="Close chat">${mdi("arrow-left")}</button>
        <span class="chat-avatar">${mdi("robot-off-outline")}</span>
        <span class="chat-head-copy"><strong>${title}</strong><span>AI is off</span></span>
      </div>
      <div class="chat-off">
        <span class="chat-off-icon">${mdi("robot-off-outline")}</span>
        <strong>AI is off</strong>
        <p>Turn the assistant on in Settings to chat with the coach. Tracking, food search, and the rest of the app keep working without it.</p>
        <button type="button" class="chat-off-btn" data-action="open-ai-from-chat">Enable AI</button>
      </div>
    </div></div>`;
  }

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
      <span class="chat-head-copy"><strong>${state.chatMode === "food" ? "Food Log" : "Ask AI"}</strong>${connection}</span>
    </div>
    <div class="chat-messages">${messages}${typing}</div>
    ${state.messages.length <= 1 ? `<div class="starter-row">${starters.map((starter) => `<button type="button" class="starter-chip" data-action="starter" data-value="${esc(starter)}">${esc(starter)}</button>`).join("")}</div>` : ""}
    <form class="chat-compose" id="chat-form">
      <input type="text" value="${esc(state.chatInput)}" data-field="chatInput" placeholder="${state.chatMode === "food" ? "What did you eat?" : "Ask about your health..."}" autocomplete="off" aria-label="Message" />
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

  if (modal.type === "meal-options") {
    return `<div class="sheet-card" role="dialog" aria-modal="true" aria-labelledby="modal-title">
      <div class="sheet-handle"></div>
      <div class="sheet-header"><h3 id="modal-title">Add a meal</h3><p>How would you like to log it?</p></div>
      <div class="sheet-list">
        <button type="button" class="sheet-option" data-action="meal-manual">
          <span class="sheet-icon" style="background:rgba(91,123,225,.1);color:var(--info)">${mdi("format-list-bulleted")}</span>
          <span><strong>Manual log</strong><small>Search the food database and pick serving size</small></span>
          ${mdi("chevron-right")}
        </button>
        <button type="button" class="sheet-option" data-action="meal-ai">
          <span class="sheet-icon" style="background:rgba(32,33,38,.07);color:var(--ink)">${mdi("robot-outline")}</span>
          <span><strong>AI assistant</strong><small>Describe what you ate and the AI logs it</small></span>
          ${mdi("chevron-right")}
        </button>
        <button type="button" class="sheet-option" data-action="meal-barcode">
          <span class="sheet-icon" style="background:rgba(85,164,119,.1);color:var(--success)">${mdi("barcode-scan")}</span>
          <span><strong>Scan barcode</strong><small>Point the camera at a product's barcode</small></span>
          ${mdi("chevron-right")}
        </button>
      </div>
      <button type="button" class="modal-close" data-action="modal-close">Cancel</button>
    </div>`;
  }

  if (modal.type === "food-units") {
    const item = state.foodDetail;
    if (!item) return "";
    const units = item.units ?? [];
    return `<div class="sheet-card picker-sheet" role="dialog" aria-modal="true" aria-labelledby="modal-title">
      <div class="sheet-handle"></div>
      <div class="sheet-header"><h3 id="modal-title">Choose unit</h3><p>${esc(item.name)}</p></div>
      <div class="sheet-list">
        <button type="button" class="picker-row ${!item.unit ? "active" : ""}" data-action="select-unit" data-value="grams">
          <span>grams</span><small>exact weight</small>${!item.unit ? mdi("check") : ""}
        </button>
        ${units.filter((unit) => unit.label !== "grams").map((unit) => `
          <button type="button" class="picker-row ${item.unit?.label === unit.label ? "active" : ""}" data-action="select-unit" data-value="${unit.label}">
            <span>${unit.label}</span><small>≈ ${unit.grams} g each</small>${item.unit?.label === unit.label ? mdi("check") : ""}
          </button>`).join("")}
      </div>
      <button type="button" class="modal-close" data-action="modal-close">Cancel</button>
    </div>`;
  }

  return "";
}

/* ---------------- events ---------------- */

function handleAction(action, value, delta = 0) {
  switch (action) {
    case "select-device": {
      state.onboarding.device = value;
      if (value === "other") {
        state.screen = "profile";
        showToast("No device selected — you can track manually.");
      } else {
        state.screen = "health";
      }
      render();
      break;
    }
    case "health-connect":
      state.screen = "profile";
      showToast("Health sync is simulated in the demo.");
      break;
    case "health-skip":
      state.screen = "profile";
      showToast("You can connect health data later from the Overview tab.");
      break;
    case "back": {
      back();
      break;
    }
    case "profile-continue":
      if (!isAgeValid(state.onboarding.age)) {
        showToast("Enter an age between 18 and 100 to continue.");
        return;
      }
      if (state.editedFromSettings) {
        state.editedFromSettings = false;
        state.screen = "settings";
      } else {
        state.screen = "ai";
      }
      render();
      break;
    case "select-sex":
      state.onboarding.sex = value;
      render();
      break;
    case "height-unit": {
      const o = state.onboarding;
      if (value === o.heightUnit) break;
      const cm = Number(o.height);
      if (value === "ft" && o.height.trim() && Number.isFinite(cm)) {
        const totalIn = cm / CM_PER_IN;
        let ft = Math.floor(totalIn / 12);
        let inch = Math.round(totalIn - ft * 12);
        if (inch === 12) {
          ft += 1;
          inch = 0;
        }
        o.heightFt = String(ft);
        o.heightIn = String(inch);
      } else if (value === "cm" && (o.heightFt.trim() || o.heightIn.trim())) {
        const inches = Number(o.heightFt || 0) * 12 + Number(o.heightIn || 0);
        o.height = String(Math.round(inches * CM_PER_IN * 10) / 10);
      }
      o.heightUnit = value;
      render();
      break;
    }
    case "weight-unit": {
      const o = state.onboarding;
      if (value === o.weightUnit) break;
      const weight = Number(o.weight);
      if (o.weight.trim() && Number.isFinite(weight)) {
        o.weight = String(Math.round((value === "lb" ? weight * LBS_PER_KG : weight / LBS_PER_KG) * 10) / 10);
      }
      o.weightUnit = value;
      render();
      break;
    }
    case "select-ai":
      state.aiMode = value;
      render();
      break;
    case "ai-continue":
      if (state.aiMode === "local") {
        state.modal = { type: "phone-only", value: "local" };
        render();
      } else if (state.aiMode === "none") {
        if (state.aiReturn === "chat") {
          state.screen = "chat";
        } else if (state.aiReturn === "settings") {
          state.aiReturn = "onboarding";
          state.editedFromSettings = false;
          state.screen = "settings";
        } else {
          state.screen = "goals";
        }
        render();
      } else {
        state.screen = "byok";
        render();
      }
      break;
    case "toggle-guide":
      state.showGuide = !state.showGuide;
      render();
      break;
    case "toggle-key":
      state.showKey = !state.showKey;
      render();
      break;
    case "select-provider":
      if (value !== "openrouter") {
        state.modal = { type: "provider-only" };
        render();
        return;
      }
      state.provider = value;
      state.model = "openrouter/free";
      state.testState = null;
      render();
      break;
    case "test-key":
      testKey();
      break;
    case "save-key":
      if (!state.apiKey.trim()) {
        showToast("Paste an OpenRouter key first, or choose another option.");
        return;
      }
      if (state.aiReturn === "chat") {
        state.screen = "chat";
      } else if (state.editedFromSettings) {
        state.editedFromSettings = false;
        state.screen = "settings";
      } else {
        state.screen = "goals";
      }
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
      state.modal = null;
      state.editedFromSettings = false;
      state.screen = "settings";
      render();
      break;
    case "open-ai-settings":
      state.editedFromSettings = true;
      state.aiReturn = "settings";
      state.screen = "ai";
      render();
      break;
    case "open-ai-from-chat":
      state.aiReturn = "chat";
      state.screen = "ai";
      render();
      break;
    case "open-profile-settings":
      state.editedFromSettings = true;
      state.screen = "profile";
      render();
      break;
    case "open-barcode":
      state.menuOpen = false;
      state.modal = { type: "barcode" };
      render();
      break;
    case "open-food-search":
      state.menuOpen = false;
      state.modal = null;
      state.foodQuery = "";
      state.detailReturn = "tabs";
      state.screen = "foodSearch";
      render();
      break;
    case "modal-close":
      state.modal = null;
      render();
      break;
    case "open-food":
      openFoodFromSearch(value);
      break;
    case "open-food-detail":
      openMealDetail(value);
      break;
    case "open-units":
      state.modal = { type: "food-units" };
      render();
      break;
    case "select-unit":
      selectFoodUnit(value);
      break;
    case "log-food-detail":
      logFoodDetail();
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
      state.workoutId = value;
      state.screen = "workout";
      state.modal = null;
      render();
      break;
    case "biomarker":
      showToast(`${value} · full trends are in the phone app.`);
      break;
    case "open-sleep":
      state.screen = "sleep";
      state.modal = null;
      render();
      break;
    case "open-strain":
      state.screen = "strain";
      state.modal = null;
      render();
      break;
    case "habit-counter": {
      const entry = state.journal.habits[value];
      if (entry) {
        entry.value = Math.max(0, Math.min(entry.target, entry.value + Number(delta)));
        render();
      }
      break;
    }
    case "habit-binary": {
      const entry = state.journal.habits[value];
      if (entry) {
        entry.state = entry.state === value ? "unset" : value;
        render();
      }
      break;
    }
    case "habit-measure": {
      const entry = state.journal.habits[value];
      if (entry) {
        entry.value = (entry.value + 5) % 125;
        render();
      }
      break;
    }
    case "mood-select":
      state.journal.mood = Number(value);
      render();
      break;
    case "hydration":
      state.journal.hydration = (state.journal.hydration + 1) % 13;
      render();
      break;
    case "add-meal":
      state.modal = { type: "meal-options" };
      render();
      break;
    case "meal-manual":
      state.modal = null;
      state.foodQuery = "";
      state.detailReturn = "tabs";
      state.screen = "foodSearch";
      render();
      break;
    case "meal-ai":
      state.modal = null;
      openChat("food");
      break;
    case "meal-barcode":
      state.modal = { type: "barcode" };
      render();
      break;
    case "meal-edit":
      openMealDetail(value);
      break;
    case "toggle-brief":
      state.settings.briefEnabled = !state.settings.briefEnabled;
      state.settings.briefTest = "idle";
      render();
      break;
    case "brief-hour": {
      const hour = state.settings.briefHour + Number(delta);
      state.settings.briefHour = Math.max(5, Math.min(11, hour));
      render();
      break;
    }
    case "brief-minute": {
      const step = Number(delta) * 15;
      state.settings.briefMinute = (state.settings.briefMinute + step + 60) % 60;
      render();
      break;
    }
    case "test-brief":
      state.settings.briefTest = "sent";
      render();
      setTimeout(() => {
        state.settings.briefTest = "idle";
        render();
      }, 2500);
      break;
    case "set-distance-unit":
      state.distanceUnit = value;
      render();
      break;
    case "set-weight-unit":
      state.weightUnit = value;
      render();
      break;
    case "settings-health":
      showToast("Health access is simulated in this demo.");
      break;
    case "meal-delete":
      state.journal.meals = state.journal.meals.filter((meal) => meal.id !== value);
      showToast("Meal removed from today's log.");
      break;
    case "edit-habits":
      showToast("Habit editing is available in the phone app.");
      break;
    case "edit-goals":
      showToast("Nutrition goals can be changed in the phone app.");
      break;
    case "brief-settings":
      showToast("Morning brief settings are available in the phone app.");
      break;
    case "fitness-day":
      showToast(`${value} · sample activity day.`);
      break;
    case "log-biomarker":
      showToast(`Logging ${value} is available in the phone app.`);
      break;
    case "bio-date":
      showToast("Earlier readings are available in the phone app.");
      break;
    case "restart-demo":
      restartDemo();
      break;
    default:
      break;
  }
}

function back() {
  switch (state.screen) {
    case "health":
      state.screen = "device";
      break;
    case "profile":
      if (state.editedFromSettings) {
        state.editedFromSettings = false;
        state.screen = "settings";
      } else {
        state.screen = state.onboarding.device === "other" ? "device" : "health";
      }
      break;
    case "ai":
      if (state.aiReturn === "chat") {
        state.aiReturn = "onboarding";
        state.screen = "chat";
      } else if (state.editedFromSettings) {
        state.editedFromSettings = false;
        state.screen = "settings";
      } else {
        state.screen = "profile";
      }
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
    case "settings":
      state.screen = "tabs";
      break;
    case "sleep":
    case "strain":
    case "workout":
    case "foodSearch":
      state.screen = "tabs";
      break;
    case "foodDetail":
      state.screen = state.detailReturn === "foodSearch" ? "foodSearch" : "tabs";
      break;
    default:
      state.screen = "device";
  }
  state.modal = null;
  render();
}

function openFoodFromSearch(foodId) {
  const food = FOODS.find((item) => item.id === foodId);
  if (!food) return;
  state.foodDetail = {
    id: food.id,
    name: food.name,
    category: food.category,
    per100: food.per100,
    count: food.defaultGrams,
    unit: null,
    units: [{ label: "grams", plural: "grams", grams: 1 }, ...(food.units ?? []).map((unit) => ({ label: unit.plural, plural: unit.plural, grams: unit.grams }))],
    mealId: null,
  };
  state.detailReturn = "foodSearch";
  state.screen = "foodDetail";
  render();
}

function openMealDetail(mealId) {
  const meal = state.journal.meals.find((item) => item.id === mealId);
  if (!meal || !meal.grams) return;
  state.foodDetail = {
    id: `meal-${meal.id}`,
    name: meal.foodName,
    category: "Logged meal",
    per100: {
      calories: (meal.calories / meal.grams) * 100,
      protein: (meal.protein / meal.grams) * 100,
      carbs: (meal.carbs / meal.grams) * 100,
      fat: (meal.fat / meal.grams) * 100,
      fiber: ((meal.fiber ?? 0) / meal.grams) * 100,
    },
    count: meal.grams,
    unit: null,
    units: [{ label: "grams", plural: "grams", grams: 1 }],
    mealId: meal.id,
  };
  state.detailReturn = "tabs";
  state.screen = "foodDetail";
  render();
}

function selectFoodUnit(value) {
  const item = state.foodDetail;
  if (!item) return;
  const currentGrams = foodDetailFor(item).grams;
  if (value === "grams") {
    item.unit = null;
    item.count = currentGrams;
  } else {
    const unit = item.units.find((candidate) => candidate.label === value);
    if (!unit) return;
    item.unit = unit;
    item.count = Math.max(0.01, Math.round((currentGrams / unit.grams) * 100) / 100);
  }
  state.modal = null;
  render();
}

function logFoodDetail() {
  const item = state.foodDetail;
  if (!item) return;
  const { grams, macros } = foodDetailFor(item);
  const now = new Date();
  if (item.mealId) {
    const meal = state.journal.meals.find((entry) => entry.id === item.mealId);
    if (meal) {
      meal.grams = grams;
      meal.calories = macros.calories;
      meal.protein = macros.protein;
      meal.carbs = macros.carbs;
      meal.fat = macros.fat;
      meal.fiber = macros.fiber;
    }
  } else {
    state.journal.meals.push({
      id: `m${Date.now()}`,
      foodName: item.name,
      time: now.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" }),
      grams,
      calories: macros.calories,
      protein: macros.protein,
      carbs: macros.carbs,
      fat: macros.fat,
      fiber: macros.fiber,
    });
  }
  state.foodDetail = null;
  state.screen = "tabs";
  state.tab = "journal";
  render();
  showToast(item.mealId ? "Meal updated." : `${item.name} · ${macros.calories} cal logged.`);
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
  handleAction(target.dataset.action, target.dataset.value, target.dataset.delta);
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
  handleAction(target.dataset.action, target.dataset.value, target.dataset.delta);
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

  if (field === "foodQuery") {
    state.foodQuery = event.target.value;
    render();
    const input = app.querySelector('[data-field="foodQuery"]');
    if (input) {
      input.focus();
      input.setSelectionRange(input.value.length, input.value.length);
    }
    return;
  }

  if (field === "serving") {
    if (state.foodDetail) {
      state.foodDetail.count = event.target.value === "" ? 0 : Number(event.target.value);
    }
    return;
  }

  if (["age", "height", "weight"].includes(field)) {
    const o = state.onboarding;
    if (field === "weight") {
      if (!event.target.value.trim()) {
        o.weight = "";
        return;
      }
      const value = Number(event.target.value);
      if (Number.isFinite(value)) {
        const kg = o.weightUnit === "lb" ? value / LBS_PER_KG : value;
        o.weight = String(Math.round(kg * 10) / 10);
      }
      return;
    }
    o[field] = event.target.value;
    return;
  }

  if (field === "heightFt" || field === "heightIn") {
    const o = state.onboarding;
    o[field] = event.target.value;
    if (o.heightFt.trim() || o.heightIn.trim()) {
      const inches = Number(o.heightFt || 0) * 12 + Number(o.heightIn || 0);
      o.height = String(Math.round(inches * CM_PER_IN * 10) / 10);
    }
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

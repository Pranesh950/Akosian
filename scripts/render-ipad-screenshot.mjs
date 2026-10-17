// Renders a 13" iPad (2064 x 2752) screenshot of the Home screen.
//
// The app is native-only (llama.rn, HealthKit, Health Connect), so there is no
// web target to screenshot. This script recreates the Home screen from the real
// theme tokens, layout values, fonts and icon font in the repo, then captures
// it with headless Chromium.
//
// Usage: node scripts/render-ipad-screenshot.mjs

import { mkdirSync, writeFileSync, existsSync } from "node:fs";
import { execFileSync } from "node:child_process";
import path from "node:path";
import os from "node:os";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const outDir = path.join(root, "screenshots");
mkdirSync(outDir, { recursive: true });

// iPad Pro 13" (M4): 2064 x 2752 physical px @ 2x -> 1032 x 1376 pt.
const W = 1032;
const H = 1376;
const SCALE = 2;

const colors = {
  bg: "#F7F7F9",
  card: "#FFFFFF",
  border: "#E7E8EC",
  surfaceElevated: "#F0F1F4",
  ink: "#202126",
  body: "#666871",
  muted: "#9698A1",
  success: "#55A477",
  warning: "#D69A43",
  danger: "#E56F63",
  info: "#5B7BE1",
  sleep: "#6B83A5",
};

const glyphs = JSON.parse(
  execFileSync(
    "node",
    [
      "-e",
      `process.stdout.write(JSON.stringify(require(${JSON.stringify(
        path.join(
          root,
          "node_modules/@expo/vector-icons/build/vendor/react-native-vector-icons/glyphmaps/MaterialCommunityIcons.json"
        )
      )})))`,
    ],
    { encoding: "utf8" }
  )
);

const icon = (name, size, color, extra = "") => {
  const cp = glyphs[name];
  if (!cp) throw new Error(`Unknown icon: ${name}`);
  return `<span class="mi" style="font-size:${size}px;color:${color};${extra}">${String.fromCodePoint(
    cp
  )}</span>`;
};

// --- BandGauge, mirrored from src/components/BandGauge.tsx ---
const NUM_SEGMENTS = 10;
const polar = (cx, cy, r, deg) => {
  const rad = ((deg - 90) * Math.PI) / 180;
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
};
const describeArc = (cx, cy, r, a0, a1) => {
  const s = polar(cx, cy, r, a0);
  const e = polar(cx, cy, r, a1);
  const large = a1 - a0 <= 180 ? "0" : "1";
  return `M ${s.x} ${s.y} A ${r} ${r} 0 ${large} 1 ${e.x} ${e.y}`;
};

function bandGauge({ score, color, label, size = 160 }) {
  const clamped = Math.max(0, Math.min(100, score));
  const filledSegments = Math.round((clamped / 100) * NUM_SEGMENTS);
  const cx = size / 2;
  const cy = size * 0.4;
  const radius = size * 0.38;
  const strokeWidth = 6;
  const totalArcDegrees = 170;
  const startAngle = 360 - totalArcDegrees / 2;
  const segmentSpan = totalArcDegrees / NUM_SEGMENTS;
  const gap = 2;
  const scoreSize = size >= 140 ? 34 : size >= 120 ? 28 : 24;

  const paths = Array.from({ length: NUM_SEGMENTS })
    .map((_, i) => {
      const segStart = startAngle + i * segmentSpan;
      const segEnd = segStart + segmentSpan - gap;
      if (segEnd <= segStart) return "";
      const isFilled = i < filledSegments;
      return `<path d="${describeArc(cx, cy, radius, segStart, segEnd)}" stroke="${
        isFilled ? color : colors.border
      }" stroke-width="${strokeWidth}" fill="none" stroke-linecap="butt" opacity="${
        isFilled ? 1 : 0.5
      }" />`;
    })
    .join("");

  return `<div class="gauge" style="width:${size}px">
    <svg width="${size}" height="${size * 0.5}" style="display:block">${paths}</svg>
    <div class="gaugeScore" style="color:${color};font-size:${scoreSize}px">${clamped}</div>
    ${label ? `<div class="gaugeLabel">${label}</div>` : ""}
  </div>`;
}

const snapshotCard = ({ iconName, tint, label, value, unit }) => `
  <div class="snapshotCard">
    <div class="snapshotIcon" style="background:${tint}14">${icon(
  iconName,
  15,
  tint
)}</div>
    <div class="snapshotLabel">${label}</div>
    <div class="snapshotValue">${value}</div>
    ${unit ? `<div class="snapshotUnit">${unit}</div>` : ""}
  </div>`;

const vitalCard = ({ iconName, label, value, unit, accent, empty }) => `
  <div class="vitalCard${empty ? " vitalCardEmpty" : ""}">
    <div class="vitalAccent" style="background:${empty ? colors.border : accent}"></div>
    <div class="vitalTop">
      <div class="vitalIconWrap" style="background:${accent}14">${icon(
  iconName,
  15,
  empty ? colors.muted : accent
)}</div>
      <div class="vitalLabel">${label}</div>
    </div>
    <div class="vitalValueRow">
      <div class="vitalValue${empty ? " vitalValueEmpty" : ""}">${value}</div>
      ${!empty && unit ? `<div class="vitalUnit">${unit}</div>` : ""}
    </div>
  </div>`;

const tabItems = [
  { label: "Home", icon: "home", focused: true },
  { label: "Journal", icon: "notebook-outline", focused: false },
  { label: "Fitness", icon: "run", focused: false },
  { label: "Biology", icon: "heart-outline", focused: false },
];

const html = `<!doctype html>
<html>
<head>
<meta charset="utf-8" />
<style>
@font-face { font-family: "Nunito"; font-weight: 400; src: url("../node_modules/@expo-google-fonts/nunito/400Regular/Nunito_400Regular.ttf"); }
@font-face { font-family: "Nunito"; font-weight: 500; src: url("../node_modules/@expo-google-fonts/nunito/500Medium/Nunito_500Medium.ttf"); }
@font-face { font-family: "Nunito"; font-weight: 600; src: url("../node_modules/@expo-google-fonts/nunito/600SemiBold/Nunito_600SemiBold.ttf"); }
@font-face { font-family: "Nunito"; font-weight: 700; src: url("../node_modules/@expo-google-fonts/nunito/700Bold/Nunito_700Bold.ttf"); }
@font-face { font-family: "MaterialCommunityIcons"; src: url("../node_modules/@expo/vector-icons/build/vendor/react-native-vector-icons/Fonts/MaterialCommunityIcons.ttf"); }

* { box-sizing: border-box; margin: 0; padding: 0; }
html, body { width: ${W}px; height: ${H}px; overflow: hidden; }
body {
  background: ${colors.bg};
  font-family: "Nunito", -apple-system, sans-serif;
  color: ${colors.ink};
  -webkit-font-smoothing: antialiased;
}
.mi { font-family: "MaterialCommunityIcons"; line-height: 1; display: inline-block; }

.screen { position: relative; width: ${W}px; height: ${H}px; overflow: hidden; }
.wash {
  position: absolute; top: 0; left: 0; right: 0; height: 280px;
  background: linear-gradient(to bottom, rgba(91,123,225,0.14), rgba(91,123,225,0));
}

/* iOS status bar (24pt safe area on iPad portrait) */
.statusbar {
  height: 24px; display: flex; align-items: center; justify-content: space-between;
  padding: 0 28px 0 34px; position: relative;
}
.statusbar .time { font: 600 14px -apple-system, "Helvetica Neue", sans-serif; letter-spacing: 0.2px; color: ${colors.ink}; }
.statusbar .right { display: flex; align-items: center; gap: 7px; }

.header {
  display: flex; align-items: flex-start; justify-content: space-between;
  padding: 20px 24px 16px 24px;
}
.greeting { font-size: 34px; font-weight: 700; letter-spacing: -1px; line-height: 41px; color: ${colors.ink}; }
.dateText { font-size: 12px; font-weight: 500; letter-spacing: 0.2px; color: ${colors.muted}; margin-top: 2px; }
.headerRight { display: flex; align-items: center; gap: 12px; padding-top: 6px; }
.headerIconButton {
  width: 38px; height: 38px; border-radius: 19px; background: ${colors.card};
  border: 1px solid ${colors.border}; display: flex; align-items: center; justify-content: center;
}
.statusPill {
  display: flex; align-items: center; gap: 6px; padding: 6px 10px; border-radius: 9999px;
  background: ${colors.card}; border: 1px solid ${colors.border};
}
.statusDot { width: 6px; height: 6px; border-radius: 3px; background: ${colors.success}; }
.statusText { font-size: 11px; font-weight: 400; color: ${colors.body}; }

.content { padding: 8px 24px 152px 24px; }

.bandsCard {
  display: flex; align-items: center; justify-content: space-around;
  background: ${colors.card}; border: 1px solid ${colors.border}; border-radius: 30px;
  padding: 24px 16px; margin-bottom: 20px;
  box-shadow: 0 3px 12px rgba(32,33,38,0.055);
}
.gaugeTouchable { padding: 4px; border-radius: 16px; }
.gauge { display: flex; flex-direction: column; align-items: center; }
.gaugeScore { font-weight: 700; letter-spacing: -1.4px; line-height: 1.15; margin-top: -28px; }
.gaugeLabel { font-size: 12px; font-weight: 500; letter-spacing: 0.3px; color: ${colors.body}; margin-top: -2px; }
.sleepGoalCaption { font-size: 11px; color: ${colors.muted}; margin-top: 4px; text-align: center; }
.sleepGoalCaptionHit { color: ${colors.success}; font-weight: 600; }
.ringDivider { width: 0.5px; height: 78px; background: ${colors.border}; }

.sectionTitle { font-size: 16px; font-weight: 600; letter-spacing: -0.1px; margin: 8px 0 12px 0; }

.snapshotRow { display: flex; gap: 12px; margin-bottom: 20px; }
.snapshotCard {
  flex: 1; background: ${colors.card}; border: 1px solid ${colors.border}; border-radius: 16px;
  padding: 16px 12px; box-shadow: 0 2px 7px rgba(32,33,38,0.035);
}
.snapshotIcon {
  width: 28px; height: 28px; border-radius: 8px; display: flex; align-items: center;
  justify-content: center; margin-bottom: 12px;
}
.snapshotLabel { font-size: 11px; color: ${colors.muted}; text-transform: uppercase; margin-bottom: 4px; }
.snapshotValue { font-size: 22px; font-weight: 600; letter-spacing: -0.3px; line-height: 1.25; }
.snapshotUnit { font-size: 11px; color: ${colors.muted}; margin-top: 1px; }

.vitalGrid { display: flex; flex-wrap: wrap; gap: 12px; }
.vitalCard {
  width: 48%; flex-grow: 1; background: ${colors.card}; border: 1px solid ${colors.border};
  border-radius: 16px; padding: 16px; position: relative; overflow: hidden;
  box-shadow: 0 2px 7px rgba(32,33,38,0.035);
}
.vitalCardEmpty { opacity: 0.85; }
.vitalAccent { position: absolute; top: 0; left: 0; right: 0; height: 3px; }
.vitalTop { display: flex; align-items: center; gap: 6px; margin-bottom: 8px; }
.vitalIconWrap {
  width: 26px; height: 26px; border-radius: 8px; display: flex; align-items: center;
  justify-content: center;
}
.vitalLabel { font-size: 11px; color: ${colors.muted}; text-transform: uppercase; }
.vitalValueRow { display: flex; align-items: baseline; gap: 4px; }
.vitalValue { font-size: 30px; font-weight: 700; letter-spacing: -0.6px; line-height: 1.15; }
.vitalValueEmpty { color: ${colors.muted}; }
.vitalUnit { font-size: 12px; font-weight: 500; letter-spacing: 0.2px; color: ${colors.muted}; }

/* Bottom bar */
.tabContainer { position: absolute; left: 0; right: 0; bottom: 0; padding: 8px 16px 32px 16px; }
.tabRow { display: flex; align-items: center; gap: 12px; }
.plusButton {
  width: 68px; height: 68px; border-radius: 34px; background: ${colors.ink};
  display: flex; align-items: center; justify-content: center; flex: none;
  box-shadow: 0 7px 18px rgba(32,33,38,0.14);
}
.tabBar {
  flex: 1; display: flex; height: 80px; border-radius: 26px; background: ${colors.card};
  border: 1px solid ${colors.border}; position: relative; overflow: hidden;
  box-shadow: 0 3px 12px rgba(32,33,38,0.055);
}
.indicator {
  position: absolute; top: 4px; bottom: 4px; background: ${colors.surfaceElevated};
  border-radius: 20px;
}
.tabItem {
  flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: center;
  gap: 5px; padding: 12px 0; z-index: 10;
}
.tabLabel { font-size: 13px; font-weight: 600; }
.tabLabelActive { color: ${colors.ink}; }
.tabLabelInactive { color: ${colors.muted}; }
.homeIndicator {
  position: absolute; left: 50%; transform: translateX(-50%); bottom: 8px;
  width: 140px; height: 5px; border-radius: 3px; background: ${colors.ink}; opacity: 0.9;
}
</style>
</head>
<body>
<div class="screen">
  <div class="wash"></div>

  <div class="statusbar">
    <div class="time">9:41</div>
    <div class="right">
      <svg width="18" height="12" viewBox="0 0 18 12" fill="none">
        <rect x="0" y="8" width="3" height="4" rx="1" fill="${colors.ink}"/>
        <rect x="5" y="6" width="3" height="6" rx="1" fill="${colors.ink}"/>
        <rect x="10" y="3" width="3" height="9" rx="1" fill="${colors.ink}"/>
        <rect x="15" y="0" width="3" height="12" rx="1" fill="${colors.ink}"/>
      </svg>
      <svg width="16" height="12" viewBox="0 0 16 12" fill="none">
        <path d="M8 10.2a1.3 1.3 0 100 2.6 1.3 1.3 0 000-2.6z" fill="${colors.ink}"/>
        <path d="M1.6 5.6a9.2 9.2 0 0112.8 0" stroke="${colors.ink}" stroke-width="1.8" stroke-linecap="round"/>
        <path d="M4.2 8.1a5.6 5.6 0 017.6 0" stroke="${colors.ink}" stroke-width="1.8" stroke-linecap="round"/>
      </svg>
      <svg width="26" height="13" viewBox="0 0 26 13" fill="none">
        <rect x="0.5" y="0.5" width="22" height="12" rx="3.5" stroke="${colors.ink}" stroke-opacity="0.4"/>
        <rect x="2" y="2" width="17" height="9" rx="2" fill="${colors.ink}"/>
        <path d="M24.2 4.2v5.6a3 3 0 000-5.6z" fill="${colors.ink}" fill-opacity="0.45"/>
      </svg>
    </div>
  </div>

  <div class="header">
    <div>
      <div class="greeting">Overview</div>
      <div class="dateText">Today, October 17</div>
    </div>
    <div class="headerRight">
      <div class="headerIconButton">${icon("sync", 18, colors.ink)}</div>
      <div class="headerIconButton">${icon("cog-outline", 20, colors.ink)}</div>
      <div class="statusPill">
        <div class="statusDot"></div>
        <div class="statusText">Health</div>
      </div>
    </div>
  </div>

  <div class="content">
    <div class="bandsCard">
      <div class="gaugeTouchable">
        ${bandGauge({ score: 82, color: colors.sleep, label: "Sleep", size: 130 })}
        <div class="sleepGoalCaption sleepGoalCaptionHit">7h 24m of 8h goal</div>
      </div>
      <div class="ringDivider"></div>
      <div class="gaugeTouchable">
        ${bandGauge({ score: 61, color: colors.danger, label: "Strain", size: 130 })}
      </div>
    </div>

    <div class="sectionTitle">Today</div>
    <div class="snapshotRow">
      ${snapshotCard({
        iconName: "shoe-print",
        tint: colors.success,
        label: "Steps",
        value: "8,432",
        unit: "",
      })}
      ${snapshotCard({
        iconName: "fire",
        tint: colors.warning,
        label: "Active cal",
        value: "512",
        unit: "kcal",
      })}
      ${snapshotCard({
        iconName: "map-marker-distance",
        tint: colors.info,
        label: "Distance",
        value: "6.1 km",
        unit: "",
      })}
    </div>

    <div class="sectionTitle">Vitals</div>
    <div class="vitalGrid">
      ${vitalCard({
        iconName: "waveform",
        label: "HRV",
        value: "58",
        unit: "ms",
        accent: colors.danger,
      })}
      ${vitalCard({
        iconName: "heart-pulse",
        label: "Resting HR",
        value: "54",
        unit: "bpm",
        accent: colors.danger,
      })}
      ${vitalCard({
        iconName: "weather-night",
        label: "Sleep",
        value: "7h 24m",
        unit: "",
        accent: colors.sleep,
      })}
      ${vitalCard({
        iconName: "lungs",
        label: "Resp. rate",
        value: "14.2",
        unit: "rpm",
        accent: colors.sleep,
      })}
      ${vitalCard({
        iconName: "water-outline",
        label: "Blood O₂",
        value: "98",
        unit: "%",
        accent: colors.danger,
      })}
      ${vitalCard({
        iconName: "heart-outline",
        label: "Avg HR",
        value: "71",
        unit: "bpm",
        accent: colors.danger,
      })}
    </div>
  </div>

  <div class="tabContainer">
    <div class="tabRow">
      <div class="plusButton">${icon("plus", 28, "#FFFFFF")}</div>
      <div class="tabBar">
        <div class="indicator" style="left:4px;width:222px"></div>
        ${tabItems
          .map(
            (t) => `<div class="tabItem">
          ${icon(t.icon, 26, t.focused ? colors.ink : colors.muted)}
          <div class="tabLabel ${t.focused ? "tabLabelActive" : "tabLabelInactive"}">${
              t.label
            }</div>
        </div>`
          )
          .join("")}
      </div>
    </div>
  </div>
  <div class="homeIndicator"></div>
</div>
</body>
</html>`;

// Kept next to the PNG so the layout can be opened and tweaked in a browser.
const htmlPath = path.join(outDir, "ipad-13-home.html");
writeFileSync(htmlPath, html);

// The full Chromium build needs libatk/libnss etc. that aren't present in this
// container; the headless shell has no missing shared libraries.
const chrome = path.join(
  os.homedir(),
  ".cache/ms-playwright/chromium_headless_shell-1248/chrome-headless-shell-linux64/chrome-headless-shell"
);
if (!existsSync(chrome)) throw new Error(`Chromium headless shell not found at ${chrome}`);
const outPath = path.join(outDir, "ipad-13-home.png");

execFileSync(
  chrome,
  [
    "--headless",
    "--disable-gpu",
    "--hide-scrollbars",
    "--no-sandbox",
    "--allow-file-access-from-files",
    "--force-device-scale-factor=" + SCALE,
    `--window-size=${W},${H}`,
    "--force-color-profile=srgb",
    `--screenshot=${outPath}`,
    `file://${htmlPath}`,
  ],
  { stdio: "inherit" }
);

console.log(`Wrote ${outPath} (${W * SCALE} x ${H * SCALE})\nMarkup: ${path.relative(root, htmlPath)}`);

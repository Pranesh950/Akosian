// Rebuilds the README hero banner (assets/brand/readme-hero.svg) with the real
// iOS screenshots from screenshots/ embedded in it.
//
// The screenshots are embedded as base64 data URIs because GitHub serves SVGs
// through a proxy that refuses to load relative/external resources — a plain
// href="screen.png" renders as an empty box on github.com.
//
// Each <image> carries a single xlink:href (not href + xlink:href): the two
// attributes would hold the same data URI twice and double the file size, and
// xlink:href is the one every browser and SVG rasterizer accepts.
//
// Usage: node scripts/build-readme-hero.mjs
//
// Source screenshots are iPhone 16 Pro Max captures (1320 x 2868 @3x). Each is
// downscaled in two passes with headless Chromium (the only image resampler
// available here) and written to assets/brand/screens/ so the pipeline is
// reproducible and the small versions can be reused elsewhere.

import { mkdirSync, writeFileSync, readFileSync, existsSync, statSync } from "node:fs";
import { execFileSync } from "node:child_process";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const tmp = path.join(os.tmpdir(), "akosian-hero");
mkdirSync(tmp, { recursive: true });

const CHROME = path.join(
  os.homedir(),
  ".cache/ms-playwright/chromium_headless_shell-1248/chrome-headless-shell-linux64/chrome-headless-shell"
);
if (!existsSync(CHROME)) throw new Error(`Chromium headless shell not found at ${CHROME}`);

// Tab order matches the app's bottom navigation.
const SCREENS = [
  { label: "Overview", file: "screenshots/IMG_7206.png", slug: "overview" },
  { label: "Journal", file: "screenshots/IMG_7207.png", slug: "journal" },
  { label: "Fitness", file: "screenshots/IMG_7208.png", slug: "fitness" },
  { label: "Biology", file: "screenshots/IMG_7209.png", slug: "biology" },
];

// --- banner geometry ------------------------------------------------------
const W = 1600;
const H = 630;
const PHONE_W = 224;
const PHONE_H = 470;
const PHONE_GAP = 20;
const PHONE_TOP = 80;
const BEZEL = 7;
// Screen area keeps the screenshot's own aspect ratio (1320 x 2868).
const SHOT_W = PHONE_W - BEZEL * 2; // 210
const SHOT_H = PHONE_H - BEZEL * 2; // 456
// Embedded at 1.5x the on-canvas size: GitHub renders the 1600-wide banner at
// roughly 1000px, so this is still ~2.4x the pixels actually displayed, and it
// keeps the SVG near 500 KB instead of ~1 MB. (4 screenshots at 2x = ~950 KB.)
const SCALE = 1.5;
const LABEL_Y = PHONE_TOP + PHONE_H + 30;
const PHONES_X = W - 64 - (PHONE_W * SCREENS.length + PHONE_GAP * (SCREENS.length - 1));

/** Resize `src` to exactly width x height with Chromium, in two passes. */
function resize(src, dest, width, height) {
  const midW = Math.min(width * 2, 1320);
  const midH = Math.round((midW * 2868) / 1320);
  const passes = [
    { w: midW, h: midH, input: src },
    { w: width, h: height, input: path.join(tmp, "mid.png") },
  ];
  for (const pass of passes) {
    const page = path.join(tmp, "resize.html");
    writeFileSync(
      page,
      `<!doctype html><meta charset="utf-8"><style>html,body{margin:0;padding:0;overflow:hidden;background:#fff}img{display:block;width:${pass.w}px;height:${pass.h}px}</style><img src="file://${pass.input}">`
    );
    execFileSync(
      CHROME,
      [
        "--headless",
        "--disable-gpu",
        "--hide-scrollbars",
        "--no-sandbox",
        "--allow-file-access-from-files",
        "--force-device-scale-factor=1",
        "--force-color-profile=srgb",
        `--window-size=${pass.w},${pass.h}`,
        `--screenshot=${pass.input === src ? path.join(tmp, "mid.png") : dest}`,
        `file://${page}`,
      ],
      { stdio: ["ignore", "ignore", "ignore"] }
    );
  }
}

const outDir = path.join(root, "assets/brand/screens");
mkdirSync(outDir, { recursive: true });

const embedded = SCREENS.map((screen, index) => {
  const src = path.join(root, screen.file);
  if (!existsSync(src)) throw new Error(`Missing source screenshot: ${screen.file}`);
  const out = path.join(outDir, `${screen.slug}.png`);
  resize(src, out, Math.round(SHOT_W * SCALE), Math.round(SHOT_H * SCALE));
  const b64 = readFileSync(out).toString("base64");
  return {
    ...screen,
    x: PHONES_X + index * (PHONE_W + PHONE_GAP),
    href: `data:image/png;base64,${b64}`,
    bytes: statSync(out).size,
  };
});

const phones = embedded
  .map(
    (s, i) => `    <!-- ${s.label} tab -->
    <g filter="url(#phoneShadow)">
      <rect x="${s.x}" y="${PHONE_TOP}" width="${PHONE_W}" height="${PHONE_H}" rx="32" fill="#15161A"/>
      <clipPath id="screen${i}">
        <rect x="${s.x + BEZEL}" y="${PHONE_TOP + BEZEL}" width="${SHOT_W}" height="${SHOT_H}" rx="25"/>
      </clipPath>
      <image x="${s.x + BEZEL}" y="${PHONE_TOP + BEZEL}" width="${SHOT_W}" height="${SHOT_H}"
             clip-path="url(#screen${i})" preserveAspectRatio="xMidYMid slice"
             xlink:href="${s.href}"/>
    </g>
    <text x="${s.x + PHONE_W / 2}" y="${LABEL_Y}" text-anchor="middle" font-size="15" font-weight="700" fill="#595A61">${s.label}</text>`
  )
  .join("\n");

const svg = `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" role="img" aria-labelledby="title desc">
  <title id="title">Akosian — health should be private and free</title>
  <desc id="desc">A cream and coral banner: Your health. Your phone. Your rules. Free, open source, local-first. Alongside it are four real screenshots from the iOS app — the Overview, Journal, Fitness, and Biology tabs.</desc>
  <defs>
    <linearGradient id="wash" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#FFF9F2"/>
      <stop offset="1" stop-color="#F9E8E2"/>
    </linearGradient>
    <filter id="phoneShadow" x="-20%" y="-20%" width="140%" height="140%">
      <feDropShadow dx="0" dy="10" stdDeviation="16" flood-color="#4A2A25" flood-opacity="0.18"/>
    </filter>
  </defs>
  <rect width="${W}" height="${H}" rx="32" fill="url(#wash)"/>
  <circle cx="1520" cy="80" r="230" fill="#E56F63" opacity=".09"/>
  <circle cx="40" cy="630" r="180" fill="#E56F63" opacity=".07"/>
  <g font-family="Arial, Helvetica, sans-serif">
    <rect x="64" y="58" width="44" height="44" rx="14" fill="#E56F63"/>
    <path d="M76 80h6l4-10 5 20 4-10h6" fill="none" stroke="#FFF" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>
    <text x="122" y="91" font-size="34" font-weight="700" fill="#25272D">Akosian</text>
    <text x="64" y="178" font-size="15" font-weight="700" letter-spacing="3" fill="#9A4942">HEALTH SHOULD BE PRIVATE AND FREE.</text>
    <g font-size="66" font-weight="700" fill="#25272D">
      <text x="60" y="264">Your health.</text>
      <text x="60" y="343">Your phone.</text>
      <text x="60" y="422" fill="#B95147">Your rules.</text>
    </g>
    <text x="64" y="476" font-size="22" fill="#595A61">Sleep. Recovery. Food. Habits. Optional AI.</text>
    <rect x="64" y="516" width="442" height="48" rx="24" fill="#25272D"/>
    <text x="285" y="547" text-anchor="middle" font-size="17" font-weight="700" fill="#FFF9F2">FREE · OPEN SOURCE · LOCAL-FIRST</text>
${phones}
  </g>
</svg>
`;

const svgPath = path.join(root, "assets/brand/readme-hero.svg");
writeFileSync(svgPath, svg);

const kb = (n) => `${(n / 1024).toFixed(0)} KB`;
console.log(`Wrote ${path.relative(root, svgPath)} — ${kb(statSync(svgPath).size)}`);
for (const s of embedded) {
  console.log(`  ${s.label.padEnd(9)} ${path.relative(root, path.join(outDir, s.slug + ".png"))}  ${kb(s.bytes)}`);
}

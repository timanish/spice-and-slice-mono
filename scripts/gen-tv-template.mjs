// Render the TV-menu background template (HTML) to a crisp PNG using Playwright.
//   node scripts/gen-tv-template.mjs
// Output: public/tv-menu/restaurant-template.png (3840x2160, 2x of 1080p)
import { chromium } from "@playwright/test";
import { readFileSync, mkdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Ornate gold corner scrollwork, flipped per corner via CSS in the template.
const SCROLL = `
<svg viewBox="0 0 160 160" fill="none">
  <path d="M14 14 H78" stroke="#FFD700" stroke-width="2.5" stroke-linecap="round"/>
  <path d="M14 14 V78" stroke="#FFD700" stroke-width="2.5" stroke-linecap="round"/>
  <path d="M22 22 H60" stroke="#C8962F" stroke-width="1.1"/>
  <path d="M22 22 V60" stroke="#C8962F" stroke-width="1.1"/>
  <path d="M14 46 C46 46 60 60 60 96 C60 116 50 126 34 122" stroke="#C8962F" stroke-width="2"/>
  <path d="M46 14 C46 46 60 60 96 60 C116 60 126 50 122 34" stroke="#C8962F" stroke-width="2"/>
  <path d="M34 122 c-12 -2 -14 -16 -2 -19 c7 -1 10 8 4 10" stroke="#FFD700" stroke-width="1.6"/>
  <path d="M122 34 c-2 -12 -16 -14 -19 -2 c-1 7 8 10 10 4" stroke="#FFD700" stroke-width="1.6"/>
  <path d="M60 60 q18 5 24 24" stroke="#FFD700" stroke-width="1.1" opacity="0.6"/>
  <circle cx="14" cy="14" r="4.5" fill="#FFD700"/>
  <circle cx="60" cy="60" r="2.6" fill="#FF8C00"/>
  <circle cx="84" cy="84" r="2" fill="#FFD700" opacity="0.7"/>
</svg>`;

let html = readFileSync(
  path.join(__dirname, "tv-menu-template", "restaurant-template.html"),
  "utf8",
).replaceAll("{{SCROLL}}", SCROLL);

const outDir = path.join(__dirname, "..", "public", "tv-menu");
mkdirSync(outDir, { recursive: true });
const out = path.join(outDir, "restaurant-template.png");

const browser = await chromium.launch();
const page = await browser.newPage({
  viewport: { width: 1920, height: 1080 },
  deviceScaleFactor: 2,
});
await page.setContent(html, { waitUntil: "networkidle" });
await page.waitForTimeout(200);
await page.screenshot({ path: out });
console.log("wrote", out);

// --- Demo wordmark logo (transparent PNG) ----------------------------------
const LOGO_HTML = `<!doctype html><html><head><meta charset="utf-8">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link href="https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,700;1,600&display=swap" rel="stylesheet">
<style>
  html,body{margin:0;width:1000px;height:240px;}
  .wrap{width:1000px;height:240px;display:flex;align-items:center;justify-content:center;
    font-family:'Playfair Display',serif;}
  .word{font-weight:700;font-size:118px;line-height:1;color:#C0001A;
    -webkit-text-stroke:2px #FFD700;text-shadow:0 3px 12px rgba(0,0,0,.45);}
  .amp{font-style:italic;font-weight:600;font-size:62px;color:#FFD700;margin:0 20px;
    vertical-align:middle;text-shadow:0 2px 8px rgba(0,0,0,.4);}
</style></head>
<body><div class="wrap">
  <span class="word">Spice</span><span class="amp">&amp;</span><span class="word">Slice</span>
</div></body></html>`;
const logoOut = path.join(outDir, "logo.png");
const logoPage = await browser.newPage({
  viewport: { width: 1000, height: 240 },
  deviceScaleFactor: 2,
});
await logoPage.setContent(LOGO_HTML, { waitUntil: "networkidle" });
await logoPage.waitForTimeout(500); // let the web font load
await logoPage.screenshot({ path: logoOut, omitBackground: true });
console.log("wrote", logoOut);

// --- Demo accent "dish" placeholders (circular, transparent PNGs) ----------
const accentsDir = path.join(outDir, "accents");
mkdirSync(accentsDir, { recursive: true });
const DISHES = [
  { c1: "#E8A33D", c2: "#7a3b12" }, // golden (samosa-ish)
  { c1: "#F2E6CE", c2: "#9c8a63" }, // cream (momo-ish)
  { c1: "#D6452B", c2: "#5e1408" }, // red (curry-ish)
  { c1: "#5BA83F", c2: "#234d16" }, // green (greens)
];
for (let i = 0; i < DISHES.length; i++) {
  const d = DISHES[i];
  const dishHtml = `<!doctype html><html><head><meta charset="utf-8"><style>
    html,body{margin:0;width:400px;height:400px;}
    .p{width:400px;height:400px;display:flex;align-items:center;justify-content:center;}
    .plate{width:360px;height:360px;border-radius:50%;position:relative;overflow:hidden;
      background:radial-gradient(circle at 38% 32%, ${d.c1} 0%, ${d.c2} 72%);
      box-shadow: inset 0 0 40px rgba(0,0,0,.55), inset 0 0 0 14px rgba(20,12,8,.85),
                  0 0 0 6px rgba(255,215,0,.25);}
    .hl{position:absolute;top:46px;left:70px;width:120px;height:70px;border-radius:50%;
      background:radial-gradient(circle, rgba(255,255,255,.38), transparent 70%);filter:blur(4px);}
  </style></head><body><div class="p"><div class="plate"><div class="hl"></div></div></div></body></html>`;
  const dp = await browser.newPage({
    viewport: { width: 400, height: 400 },
    deviceScaleFactor: 2,
  });
  await dp.setContent(dishHtml, { waitUntil: "networkidle" });
  await dp.screenshot({ path: path.join(accentsDir, `dish${i + 1}.png`), omitBackground: true });
}
console.log("wrote", path.join(accentsDir, "dish1..4.png"));

await browser.close();

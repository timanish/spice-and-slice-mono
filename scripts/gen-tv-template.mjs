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
await browser.close();
console.log("wrote", out);

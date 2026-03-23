/**
 * Generate Guildex favicon assets:
 * - public/guildex-mark.png (192x192, used in OG image generation)
 * - public/logo192.png (192x192)
 * - public/logo512.png (512x512)
 * - public/og.png (1200x630 OG placeholder)
 *
 * Uses @resvg/resvg-js (Node binding) if available, otherwise falls back
 * to the pure-JS approach via @resvg/resvg-wasm loaded from local node_modules.
 */

import { writeFile, readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");

// ---------- SVG templates ----------

function makeMarkSvg(size: number) {
  const r = Math.round(size * 0.25);
  const fs = Math.round(size * 0.625);
  return `<svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" xmlns="http://www.w3.org/2000/svg">
  <rect width="${size}" height="${size}" rx="${r}" fill="#0a0a0a"/>
  <text x="50%" y="50%" dominant-baseline="central" text-anchor="middle"
        font-family="system-ui, -apple-system, sans-serif"
        font-weight="700" font-size="${fs}" fill="#6366f1">G</text>
</svg>`;
}

function makeOgSvg() {
  return `<svg width="1200" height="630" viewBox="0 0 1200 630" xmlns="http://www.w3.org/2000/svg">
  <rect width="1200" height="630" fill="#0a0a0a"/>
  <!-- subtle grid -->
  <rect x="0" y="0" width="1200" height="630" fill="url(#grid)" opacity="0.06"/>
  <defs>
    <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
      <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#6366f1" stroke-width="0.5"/>
    </pattern>
  </defs>
  <!-- logo mark -->
  <rect x="80" y="80" width="80" height="80" rx="20" fill="#0a0a0a" stroke="#6366f1" stroke-width="2"/>
  <text x="120" y="120" dominant-baseline="central" text-anchor="middle"
        font-family="system-ui, -apple-system, sans-serif"
        font-weight="700" font-size="50" fill="#6366f1">G</text>
  <!-- wordmark -->
  <text x="80" y="280"
        font-family="system-ui, -apple-system, sans-serif"
        font-weight="700" font-size="80" fill="#ffffff">Guildex</text>
  <text x="80" y="360"
        font-family="system-ui, -apple-system, sans-serif"
        font-weight="400" font-size="36" fill="#9ca3af">The AI Talent Network</text>
  <!-- bottom tagline -->
  <text x="80" y="540"
        font-family="system-ui, -apple-system, sans-serif"
        font-weight="400" font-size="24" fill="#6366f1">guildex.ai</text>
</svg>`;
}

// ---------- PNG rendering via resvg-wasm ----------

let resvgModule: Awaited<ReturnType<typeof import("@resvg/resvg-wasm")["default"]>> | null = null;
let resvgReady = false;

async function ensureResvg() {
  if (resvgReady) return;
  const mod = await import("@resvg/resvg-wasm");
  const wasmPath = path.join(root, "node_modules/@resvg/resvg-wasm/index_bg.wasm");
  const wasm = await readFile(wasmPath);
  await mod.initWasm(new Uint8Array(wasm));
  resvgModule = mod as unknown as typeof resvgModule;
  resvgReady = true;
}

async function svgToPng(svgStr: string): Promise<Buffer> {
  await ensureResvg();
  const { Resvg } = await import("@resvg/resvg-wasm");
  const resvg = new Resvg(svgStr, { fitTo: { mode: "original" } });
  const rendered = resvg.render();
  return Buffer.from(rendered.asPng());
}

async function writePng(svgStr: string, outPath: string) {
  const buf = await svgToPng(svgStr);
  await writeFile(outPath, buf);
  console.log(`✓ wrote ${path.relative(root, outPath)} (${buf.length} bytes)`);
}

// ---------- Main ----------

async function main() {
  const pub = path.join(root, "public");

  await writePng(makeMarkSvg(192), path.join(pub, "guildex-mark.png"));
  await writePng(makeMarkSvg(192), path.join(pub, "logo192.png"));
  await writePng(makeMarkSvg(512), path.join(pub, "logo512.png"));
  await writePng(makeOgSvg(), path.join(pub, "og.png"));

  console.log("✅ All favicon assets generated.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

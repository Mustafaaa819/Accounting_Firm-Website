/**
 * Rasterises scripts/og-default.svg to public/images/og-default.png, 1200x630.
 *
 * Why this exists: Facebook, LinkedIn and Slack do not render an SVG og:image —
 * they fetch it, fail to decode it, and fall back to no card at all. The vector
 * file is the editable source and stays out of public/ so it is never served;
 * this writes the raster that actually ships.
 *
 *   node scripts/build-og-image.mjs
 *
 * Deliberately a manual step, not a build hook: the card changes about once a
 * year, and the raster is checked in. Re-run it after editing the SVG.
 *
 * `sharp` comes in with Astro's image pipeline, so there is nothing extra to
 * install. Its SVG rasteriser uses system fonts — the SVG asks for Georgia and
 * Helvetica/Arial for that reason, rather than the self-hosted webfonts, which
 * it cannot load. Once the real branded card is designed, drop the finished PNG
 * in and delete this.
 */
import { readFile, writeFile } from 'node:fs/promises';
import sharp from 'sharp';

const SOURCE = new URL('./og-default.svg', import.meta.url);
const TARGET = new URL('../public/images/og-default.png', import.meta.url);

const svg = await readFile(SOURCE);

// `density` scales the rasteriser's internal resolution; at the default 72dpi
// the 1200px-wide viewBox renders soft. Rendering at 2x and resizing back down
// is what keeps the serif edges clean.
const png = await sharp(svg, { density: 144 })
  .resize(1200, 630, { fit: 'contain' })
  .png({ compressionLevel: 9 })
  .toBuffer();

await writeFile(TARGET, png);

const { width, height } = await sharp(png).metadata();
console.log(`Wrote public/images/og-default.png — ${width}x${height}, ${png.length} bytes`);

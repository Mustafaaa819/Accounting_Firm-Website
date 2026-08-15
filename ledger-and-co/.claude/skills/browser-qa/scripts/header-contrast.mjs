/**
 * The sticky header is bg-paper/85 + backdrop-blur, so what sits behind it
 * changes what its own text is printed on. audit.mjs cannot see this: it
 * composites backgrounds by walking DOM ancestors, and the navy CTA band that
 * scrolls *under* the header is nowhere in the header's ancestry.
 *
 * So sample real pixels instead — take the composited bar colour straight out
 * of a screenshot at scroll positions where paper vs. ink is behind it, and
 * check the header's own text colours against each.
 */
import { chromium } from 'playwright';
import { PNG } from 'pngjs';
import { readFileSync } from 'node:fs';

const BASE = process.env.QA_BASE_URL ?? 'http://localhost:4331';

const luminance = ({ r, g, b }) => {
  const ch = (v) => { const c = v / 255; return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4); };
  return 0.2126 * ch(r) + 0.7152 * ch(g) + 0.0722 * ch(b);
};
const ratio = (a, b) => {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return Math.round(((hi + 0.05) / (lo + 0.05)) * 100) / 100;
};
const parse = (v) => {
  const m = String(v).match(/rgba?\(([^)]+)\)/);
  const p = m[1].split(/[,\s/]+/).filter(Boolean).map(Number);
  return { r: p[0], g: p[1], b: p[2] };
};

const browser = await chromium.launch();

for (const width of [375, 1440]) {
  const ctx = await browser.newContext({ viewport: { width, height: 812 }, reducedMotion: 'reduce' });
  const page = await ctx.newPage();
  await page.goto(`${BASE}/`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(500);

  // Text colours the header actually paints, read from the live DOM.
  const inks = await page.evaluate(() => {
    const out = {};
    const wordmark = document.querySelector('.wordmark');
    out.wordmark = getComputedStyle(wordmark).color;
    const amp = wordmark.querySelector('span');
    if (amp) out.ampersand = getComputedStyle(amp).color;
    const nav = document.querySelector('.nav-link');
    if (nav) out.navLink = getComputedStyle(nav).color;
    const bars = document.querySelector('.menu-bar');
    if (bars) out.hamburger = getComputedStyle(bars).backgroundColor;
    return out;
  });

  // Scroll positions: top (paper behind) and the navy CTA band behind the bar.
  const positions = await page.evaluate(() => {
    const band = document.querySelector('.cta-band');
    const footer = document.querySelector('[data-site-footer]');
    return {
      top: 0,
      overBand: band ? band.getBoundingClientRect().top + window.scrollY + 120 : null,
      overFooter: footer ? footer.getBoundingClientRect().top + window.scrollY + 120 : null,
    };
  });

  for (const [label, y] of Object.entries(positions)) {
    if (y === null) continue;
    await page.evaluate((to) => window.scrollTo(0, to), y);
    await page.waitForTimeout(600);

    // A point inside the bar with no glyph on it: vertically centred, and
    // horizontally in the gap between the wordmark and the nav/hamburger.
    const probe = await page.evaluate(() => {
      const surface = document.querySelector('.header-surface');
      const r = surface.getBoundingClientRect();
      const wordmark = document.querySelector('.wordmark').getBoundingClientRect();
      return { x: Math.round(wordmark.right + 12), y: Math.round(r.top + r.height / 2) };
    });

    const buf = await page.screenshot({ clip: { x: 0, y: 0, width, height: 120 } });
    const png = PNG.sync.read(buf);
    const idx = (png.width * probe.y + probe.x) << 2;
    const bg = { r: png.data[idx], g: png.data[idx + 1], b: png.data[idx + 2] };

    console.log(`\n${width}px — scrolled to "${label}" (y=${Math.round(y)})`);
    console.log(`  composited bar colour: rgb(${bg.r}, ${bg.g}, ${bg.b})`);
    for (const [name, color] of Object.entries(inks)) {
      const fg = parse(color);
      const value = ratio(fg, bg);
      const floor = name === 'hamburger' ? 3 : 4.5;
      console.log(`    ${name.padEnd(11)} ${color.padEnd(22)} → ${String(value).padStart(6)}:1  ${value >= floor ? 'ok ' : 'LOW'} (floor ${floor})`);
    }
  }

  await ctx.close();
}

await browser.close();

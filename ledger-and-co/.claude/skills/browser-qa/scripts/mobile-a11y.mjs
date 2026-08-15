/**
 * Mobile-width accessibility pass — the part audit.mjs structurally cannot see.
 *
 * audit.mjs skips anything `visibility: hidden` (correctly — hidden things are
 * not on screen) and runs its keyboard pass only at 1440px, where the drawer
 * does not exist. So the drawer's own contents — nav links, the CTA on
 * paper-bright, the footnote — have never had their contrast or their focus
 * rings measured, and neither has any tab stop at a width where the hamburger
 * is the nav.
 *
 * This opens the drawer first, then measures.
 *
 *   node .claude/skills/browser-qa/scripts/mobile-a11y.mjs
 */
import { chromium } from 'playwright';

const BASE = process.env.QA_BASE_URL ?? 'http://localhost:4321';
const WIDTHS = [375, 768];
const ROUTES = ['/', '/services', '/news', '/who-we-are', '/history', '/client-portal', '/contact'];

let failures = 0;
const check = (ok, label, detail = '') => {
  if (!ok) failures += 1;
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${label}${detail ? ` — ${detail}` : ''}`);
};

const HELPERS = `
const parseColor = (value) => {
  const match = String(value).match(/rgba?\\(([^)]+)\\)/);
  if (!match) return null;
  const parts = match[1].split(/[,\\s/]+/).filter(Boolean).map(Number);
  const [r, g, b] = parts;
  return { r, g, b, a: parts.length > 3 ? parts[3] : 1 };
};
const over = (top, bottom) => ({
  r: top.r * top.a + bottom.r * (1 - top.a),
  g: top.g * top.a + bottom.g * (1 - top.a),
  b: top.b * top.a + bottom.b * (1 - top.a),
  a: 1,
});
const luminance = ({ r, g, b }) => {
  const ch = (v) => { const c = v / 255; return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4); };
  return 0.2126 * ch(r) + 0.7152 * ch(g) + 0.0722 * ch(b);
};
const ratio = (a, b) => {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
};
const backdropOf = (element) => {
  const layers = [];
  let node = element;
  while (node) {
    const style = getComputedStyle(node);
    if (style.backgroundImage !== 'none') return { unknown: true };
    const color = parseColor(style.backgroundColor);
    if (color && color.a > 0) { layers.push(color); if (color.a === 1) break; }
    node = node.parentElement;
  }
  let result = { r: 255, g: 255, b: 255, a: 1 };
  for (let i = layers.length - 1; i >= 0; i -= 1) result = over(layers[i], result);
  return result;
};
const describe = (el) => {
  const cls = String(el.className || '').split(/\\s+/).filter(Boolean).slice(0, 2).join('.');
  return el.tagName.toLowerCase() + (el.id ? '#' + el.id : '') + (cls ? '.' + cls : '');
};
const ownText = (el) => Array.from(el.childNodes).filter((n) => n.nodeType === 3)
  .map((n) => n.textContent.trim()).join(' ').trim();
const isVisuallyHidden = (el) => {
  const s = getComputedStyle(el);
  if (s.clipPath && s.clipPath !== 'none') return true;
  if (s.clip && s.clip !== 'auto') return true;
  const r = el.getBoundingClientRect();
  return r.width <= 1 || r.height <= 1;
};
`;

const browser = await chromium.launch();

/* ==========================================================================
   1. The open drawer — contrast, overflow, focus rings.
========================================================================== */

for (const width of WIDTHS) {
  const context = await browser.newContext({ viewport: { width, height: 812 } });
  const page = await context.newPage();
  await page.goto(`${BASE}/`, { waitUntil: 'networkidle' });

  /*
   * Open it from the keyboard, not with a click.
   *
   * The drawer moves focus to its first link programmatically. Chromium only
   * matches :focus-visible on a programmatic focus when the preceding input was
   * itself keyboard — so opening with page.click() leaves the first link
   * legitimately ringless and this script would report a focus bug that no
   * keyboard user can ever hit. Tab to the toggle and press Enter, which is the
   * path the check is actually about.
   */
  for (let i = 0; i < 12; i += 1) {
    await page.keyboard.press('Tab');
    const onToggle = await page.evaluate(() =>
      document.activeElement?.hasAttribute('data-menu-toggle'),
    );
    if (onToggle) break;
  }
  await page.keyboard.press('Enter');
  await page.waitForTimeout(500);

  const open = await page.evaluate(() =>
    document.querySelector('[data-site-header]').hasAttribute('data-menu-open'),
  );
  check(open, `${width}px — drawer open for measurement`);

  // Contrast of everything painted inside the panel, now that it is visible.
  const contrast = await page.evaluate(`(() => {
    ${HELPERS}
    const panel = document.querySelector('[data-menu-panel]');
    const out = [];
    panel.querySelectorAll('*').forEach((el) => {
      const text = ownText(el);
      if (!text || isVisuallyHidden(el)) return;
      const style = getComputedStyle(el);
      if (style.display === 'none' || style.visibility === 'hidden') return;
      if (Number(style.opacity) === 0) return;
      const backdrop = backdropOf(el);
      if (backdrop.unknown) return;
      const raw = parseColor(style.color);
      if (!raw) return;
      const color = raw.a < 1 ? over(raw, backdrop) : raw;
      const size = parseFloat(style.fontSize);
      const weight = Number(style.fontWeight) || 400;
      const large = size >= 24 || (size >= 18.66 && weight >= 700);
      const floor = large ? 3 : 4.5;
      const value = Math.round(ratio(color, backdrop) * 100) / 100;
      out.push({
        selector: describe(el), sample: text.slice(0, 28), ratio: value, floor,
        size: Math.round(size * 10) / 10, weight,
        color: style.color,
        backdrop: 'rgb(' + [backdrop.r, backdrop.g, backdrop.b].map(Math.round).join(', ') + ')',
        pass: value >= floor,
      });
    });
    return out;
  })()`);

  const badContrast = contrast.filter((c) => !c.pass);
  check(
    badContrast.length === 0,
    `${width}px — drawer text meets AA (${contrast.length} pairs)`,
    badContrast.map((c) => `${c.ratio}:1 <${c.floor} ${c.color} on ${c.backdrop} "${c.sample}"`).join('; '),
  );
  const tightest = contrast.slice().sort((a, b) => a.ratio - b.ratio)[0];
  if (tightest) {
    console.log(
      `      tightest in drawer: ${tightest.ratio}:1 (floor ${tightest.floor}) ` +
        `${tightest.color} on ${tightest.backdrop} — ${tightest.size}px/${tightest.weight} "${tightest.sample}"`,
    );
  }

  // The scroll lock swaps the scrollbar for padding; a mistake there shows up
  // as the page suddenly being wider than the viewport.
  const overflow = await page.evaluate(() => ({
    scrollWidth: document.documentElement.scrollWidth,
    clientWidth: document.documentElement.clientWidth,
    panelRight: document.querySelector('[data-menu-panel]').getBoundingClientRect().right,
    panelLeft: document.querySelector('[data-menu-panel]').getBoundingClientRect().left,
  }));
  check(
    overflow.scrollWidth <= overflow.clientWidth + 1,
    `${width}px — no horizontal scroll with the drawer open`,
    `${overflow.scrollWidth} vs ${overflow.clientWidth}`,
  );
  check(
    overflow.panelRight <= width + 1 && overflow.panelLeft >= -1,
    `${width}px — drawer sits inside the viewport`,
    `[${Math.round(overflow.panelLeft)}…${Math.round(overflow.panelRight)}]`,
  );

  // Focus rings on every stop inside the trap.
  const rings = [];
  for (let i = 0; i < 12; i += 1) {
    await page.waitForTimeout(260);
    const stop = await page.evaluate(`(() => {
      ${HELPERS}
      const el = document.activeElement;
      if (!el || el === document.body) return null;
      const style = getComputedStyle(el);
      const outlineWidth = parseFloat(style.outlineWidth) || 0;
      const hasOutline = style.outlineStyle !== 'none' && outlineWidth > 0;
      const hasShadow = style.boxShadow !== 'none';
      const backdrop = backdropOf(el.parentElement || el);
      const outlineColor = parseColor(style.outlineColor);
      const ringRatio = hasOutline && outlineColor && !backdrop.unknown
        ? Math.round(ratio(outlineColor.a < 1 ? over(outlineColor, backdrop) : outlineColor, backdrop) * 100) / 100
        : null;
      return {
        selector: describe(el),
        label: (el.textContent || el.getAttribute('aria-label') || '').trim().slice(0, 28),
        inPanel: !!document.querySelector('[data-menu-panel]').contains(el),
        visibleRing: hasOutline || hasShadow,
        outline: style.outlineStyle + ' ' + style.outlineWidth + ' ' + style.outlineColor,
        ringRatio,
      };
    })()`);
    if (stop) rings.push(stop);
    await page.keyboard.press('Tab');
  }

  const unique = rings.filter((r, i, list) => list.findIndex((o) => o.label === r.label && o.selector === r.selector) === i);
  check(
    unique.every((r) => r.visibleRing),
    `${width}px — every drawer tab stop paints a ring (${unique.length} unique)`,
    unique.filter((r) => !r.visibleRing).map((r) => `${r.selector} "${r.label}"`).join('; '),
  );
  check(
    unique.every((r) => r.ringRatio === null || r.ringRatio >= 3),
    `${width}px — drawer focus rings clear 3:1`,
    unique.filter((r) => r.ringRatio !== null && r.ringRatio < 3).map((r) => `${r.ringRatio}:1 ${r.selector} "${r.label}"`).join('; '),
  );
  check(
    unique.every((r) => r.inPanel),
    `${width}px — no tab stop escaped the panel`,
    unique.filter((r) => !r.inPanel).map((r) => r.selector).join('; '),
  );

  await context.close();
}

/* ==========================================================================
   2. Keyboard pass at mobile width, drawer closed, across every page.
      Same idea as audit.mjs's 1440 pass, at the width where the layout,
      the tap targets and the reachable controls are all different.
========================================================================== */

for (const route of ROUTES) {
  const context = await browser.newContext({
    viewport: { width: 375, height: 812 },
    reducedMotion: 'reduce',
  });
  const page = await context.newPage();
  await page.goto(`${BASE}${route}`, { waitUntil: 'networkidle' });

  await page.keyboard.press('Tab');
  const stops = [];

  for (let i = 0; i < 60; i += 1) {
    await page.waitForTimeout(120);
    const stop = await page.evaluate(`(() => {
      ${HELPERS}
      const el = document.activeElement;
      if (!el || el === document.body) return null;
      if (!window.__first) window.__first = el;
      else if (window.__first === el) return { wrapped: true };
      const style = getComputedStyle(el);
      const outlineWidth = parseFloat(style.outlineWidth) || 0;
      const hasOutline = style.outlineStyle !== 'none' && outlineWidth > 0;
      const backdrop = backdropOf(el.parentElement || el);
      const outlineColor = parseColor(style.outlineColor);
      const rect = el.getBoundingClientRect();
      return {
        selector: describe(el),
        label: (el.textContent || el.getAttribute('aria-label') || '').trim().slice(0, 28),
        visibleRing: hasOutline || style.boxShadow !== 'none',
        ringRatio: hasOutline && outlineColor && !backdrop.unknown
          ? Math.round(ratio(outlineColor.a < 1 ? over(outlineColor, backdrop) : outlineColor, backdrop) * 100) / 100
          : null,
        /*
         * WCAG 2.2 SC 2.5.8 target size, with its exceptions — a bare
         * "box < 24px" test flags every link in a sentence and every item in a
         * tightly-set footer list, none of which the SC is about. A target only
         * fails if it is under 24px AND not inline in a run of text AND close
         * enough to a neighbouring target that their 24px circles overlap.
         */
        tap: (() => {
          const min = Math.min(rect.width, rect.height);
          if (min >= 24) return 24;

          const style2 = getComputedStyle(el);
          const parent = el.parentElement;
          const own = (el.textContent || '').trim();
          const around = parent ? (parent.textContent || '').trim() : '';
          const inline = style2.display === 'inline' && around.length > own.length + 10;
          if (inline) return 24;

          const cx = rect.left + rect.width / 2;
          const cy = rect.top + rect.height / 2;
          const others = Array.from(
            document.querySelectorAll('a[href], button:not([disabled]), input:not([disabled]), select, textarea'),
          );
          const crowded = others.some((o) => {
            if (o === el || el.contains(o) || o.contains(el)) return false;
            const r = o.getBoundingClientRect();
            if (r.width === 0 || r.height === 0) return false;
            return Math.hypot(cx - (r.left + r.width / 2), cy - (r.top + r.height / 2)) < 24;
          });
          return crowded ? Math.round(min) : 24;
        })(),
        outline: style.outlineStyle + ' ' + style.outlineWidth + ' ' + style.outlineColor,
      };
    })()`);
    if (!stop || stop.wrapped) break;
    stops.push(stop);
    await page.keyboard.press('Tab');
  }

  const noRing = stops.filter((s) => !s.visibleRing);
  const dimRing = stops.filter((s) => s.ringRatio !== null && s.ringRatio < 3);
  const smallTap = stops.filter((s) => s.tap > 0 && s.tap < 24);

  check(stops.length > 0, `375px ${route} — reaches focusable elements`, `${stops.length} stops`);
  check(noRing.length === 0, `375px ${route} — every stop paints a ring`, noRing.map((s) => `${s.selector} "${s.label}"`).join('; '));
  check(dimRing.length === 0, `375px ${route} — rings clear 3:1`, dimRing.map((s) => `${s.ringRatio}:1 ${s.selector}`).join('; '));
  check(smallTap.length === 0, `375px ${route} — tap targets ≥24px`, smallTap.map((s) => `${s.tap}px ${s.selector} "${s.label}"`).join('; '));

  await context.close();
}

await browser.close();

console.log(failures === 0 ? '\nALL CHECKS PASSED' : `\n${failures} CHECK(S) FAILED`);
process.exit(failures === 0 ? 0 : 1);

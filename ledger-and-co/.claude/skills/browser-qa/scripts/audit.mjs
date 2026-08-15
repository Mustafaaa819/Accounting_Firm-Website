/**
 * Full-site audit — responsive, contrast, keyboard, images, motion.
 *
 * Complements qa-check.mjs (which screenshots and watches the console). This one
 * measures things a screenshot cannot: computed colour pairs against the WCAG AA
 * floor, elements sticking out past the viewport, text clipped by its own box,
 * whether a keyboard-focused element actually shows a focus ring, and whether
 * reduced-motion leaves every revealed section visible.
 *
 * Everything here reads the DOM as the browser resolved it — no CSS grepping.
 *
 *   node .claude/skills/browser-qa/scripts/audit.mjs
 *   node .claude/skills/browser-qa/scripts/audit.mjs --routes=/,/contact
 */
import { chromium } from 'playwright';

const BASE = process.env.QA_BASE_URL ?? 'http://localhost:4321';

const arg = (name, fallback) => {
  const hit = process.argv.find((value) => value.startsWith(`--${name}=`));
  return hit ? hit.slice(name.length + 3) : fallback;
};

const ROUTES = arg(
  'routes',
  [
    '/',
    '/services',
    '/services/bookkeeping',
    '/news',
    '/news/tax-deadlines-to-january',
    '/who-we-are',
    '/history',
    '/client-portal',
    '/contact',
  ].join(','),
).split(',');

const WIDTHS = [375, 768, 1024, 1440];

/* ==========================================================================
   In-page helpers. Serialised into the browser, so they cannot close over
   anything out here.
========================================================================== */

const PAGE_HELPERS = `
const parseColor = (value) => {
  const match = String(value).match(/rgba?\\(([^)]+)\\)/);
  if (!match) return null;
  const parts = match[1].split(/[,\\s/]+/).filter(Boolean).map(Number);
  const [r, g, b] = parts;
  const a = parts.length > 3 ? parts[3] : 1;
  return { r, g, b, a };
};

const over = (top, bottom) => ({
  r: top.r * top.a + bottom.r * (1 - top.a),
  g: top.g * top.a + bottom.g * (1 - top.a),
  b: top.b * top.a + bottom.b * (1 - top.a),
  a: 1,
});

const luminance = ({ r, g, b }) => {
  const channel = (value) => {
    const c = value / 255;
    return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  };
  return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
};

const ratio = (a, b) => {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
};

/** Composite every painted layer behind an element down to an opaque colour. */
const backdropOf = (element) => {
  const layers = [];
  let node = element;

  while (node) {
    const style = getComputedStyle(node);
    if (style.backgroundImage !== 'none') return { unknown: true };

    const color = parseColor(style.backgroundColor);
    if (color && color.a > 0) {
      layers.push(color);
      if (color.a === 1) break;
    }
    node = node.parentElement;
  }

  let result = { r: 255, g: 255, b: 255, a: 1 };
  for (let i = layers.length - 1; i >= 0; i -= 1) result = over(layers[i], result);
  return result;
};

const describe = (element) => {
  const id = element.id ? '#' + element.id : '';
  const cls = String(element.className || '')
    .split(/\\s+/)
    .filter(Boolean)
    .slice(0, 3)
    .join('.');
  return element.tagName.toLowerCase() + id + (cls ? '.' + cls : '');
};

const isVisible = (element) => {
  const style = getComputedStyle(element);
  if (style.display === 'none' || style.visibility === 'hidden') return false;
  const rect = element.getBoundingClientRect();
  return rect.width > 0 && rect.height > 0;
};

/** Own text, ignoring text that belongs to child elements. */
const ownText = (element) =>
  Array.from(element.childNodes)
    .filter((node) => node.nodeType === 3)
    .map((node) => node.textContent.trim())
    .join(' ')
    .trim();

/**
 * Visually-hidden text — .sr-only and friends. These are a 1px clipped box on
 * purpose, so every one of them trips a naive "text wider than its box" test.
 * Detected by the technique rather than by class name, so a hand-rolled one is
 * caught too.
 */
const isVisuallyHidden = (element) => {
  const style = getComputedStyle(element);
  if (style.clipPath && style.clipPath !== 'none') return true;
  if (style.clip && style.clip !== 'auto') return true;
  const rect = element.getBoundingClientRect();
  return rect.width <= 1 || rect.height <= 1;
};
`;

/* ==========================================================================
   Checks
========================================================================== */

const collectContrast = (page) =>
  page.evaluate(`(() => {
    ${PAGE_HELPERS}

    const findings = new Map();

    document.querySelectorAll('body *').forEach((element) => {
      const text = ownText(element);
      if (!text || !isVisible(element)) return;

      const style = getComputedStyle(element);
      if (Number(style.opacity) === 0) return;

      const backdrop = backdropOf(element);
      if (backdrop.unknown) return;

      const raw = parseColor(style.color);
      if (!raw) return;
      const color = raw.a < 1 ? over(raw, backdrop) : raw;

      const size = parseFloat(style.fontSize);
      const weight = Number(style.fontWeight) || 400;
      const large = size >= 24 || (size >= 18.66 && weight >= 700);
      const floor = large ? 3 : 4.5;
      const value = ratio(color, backdrop);

      const key = [style.color, Math.round(backdrop.r), Math.round(backdrop.g), Math.round(backdrop.b), Math.round(size), weight].join('|');
      if (findings.has(key)) return;

      findings.set(key, {
        selector: describe(element),
        sample: text.slice(0, 40),
        color: style.color,
        backdrop: 'rgb(' + [backdrop.r, backdrop.g, backdrop.b].map(Math.round).join(', ') + ')',
        size: Math.round(size * 10) / 10,
        weight,
        large,
        floor,
        ratio: Math.round(value * 100) / 100,
        pass: value >= floor,
      });
    });

    return Array.from(findings.values());
  })()`);

const collectLayout = (page) =>
  page.evaluate(`(() => {
    ${PAGE_HELPERS}

    const viewport = document.documentElement.clientWidth;

    const overflowing = [];
    document.querySelectorAll('body *').forEach((element) => {
      if (!isVisible(element)) return;
      const rect = element.getBoundingClientRect();
      // Fixed/sticky chrome is measured against the viewport it is pinned to.
      if (rect.right > viewport + 1 || rect.left < -1) {
        overflowing.push({
          selector: describe(element),
          left: Math.round(rect.left),
          right: Math.round(rect.right),
          sample: (element.textContent || '').trim().slice(0, 40),
        });
      }
    });

    // Text wider than the box that paints it — the usual cause of a clipped or
    // overlapping line at a narrow width.
    const clipped = [];
    document.querySelectorAll('body *').forEach((element) => {
      if (!isVisible(element)) return;
      if (!ownText(element)) return;
      if (isVisuallyHidden(element)) return;
      const style = getComputedStyle(element);
      if (style.overflowX === 'auto' || style.overflowX === 'scroll') return;
      if (element.scrollWidth > element.clientWidth + 1 && element.clientWidth > 0) {
        clipped.push({
          selector: describe(element),
          scrollWidth: element.scrollWidth,
          clientWidth: element.clientWidth,
          sample: ownText(element).slice(0, 40),
        });
      }
    });

    return {
      documentOverflow:
        document.documentElement.scrollWidth > document.documentElement.clientWidth + 1,
      scrollWidth: document.documentElement.scrollWidth,
      clientWidth: document.documentElement.clientWidth,
      overflowing: overflowing.slice(0, 12),
      clipped: clipped.slice(0, 12),
    };
  })()`);

/** Leaf text boxes that visually intersect. Restricted to text-bearing leaves
 *  so that ordinary parent/child nesting is not reported as an overlap. */
const collectOverlaps = (page) =>
  page.evaluate(`(() => {
    ${PAGE_HELPERS}

    const boxes = [];
    document.querySelectorAll('body *').forEach((element) => {
      if (!isVisible(element)) return;
      const text = ownText(element);
      if (text.length < 2) return;
      if (isVisuallyHidden(element)) return;
      const style = getComputedStyle(element);
      if (style.position === 'fixed' || style.position === 'sticky') return;
      if (Number(style.opacity) < 0.99) return;

      /*
       * Inline boxes are excluded. A link that wraps across two lines has a
       * bounding rect spanning both, which necessarily intersects the rect of
       * any other inline in the same paragraph — an artifact of how inline
       * layout is measured, not two things printed on top of each other.
       */
      if (style.display === 'inline' || element.getClientRects().length > 1) return;

      const rect = element.getBoundingClientRect();
      boxes.push({ element, rect, text, selector: describe(element) });
    });

    const hits = [];
    for (let i = 0; i < boxes.length; i += 1) {
      for (let j = i + 1; j < boxes.length; j += 1) {
        const a = boxes[i];
        const b = boxes[j];
        if (a.element.contains(b.element) || b.element.contains(a.element)) continue;

        const x = Math.min(a.rect.right, b.rect.right) - Math.max(a.rect.left, b.rect.left);
        const y = Math.min(a.rect.bottom, b.rect.bottom) - Math.max(a.rect.top, b.rect.top);
        if (x <= 1 || y <= 1) continue;

        const area = x * y;
        const smallest = Math.min(a.rect.width * a.rect.height, b.rect.width * b.rect.height);
        if (smallest === 0 || area / smallest < 0.25) continue;

        hits.push({
          a: a.selector + ' — ' + a.text.slice(0, 24),
          b: b.selector + ' — ' + b.text.slice(0, 24),
          overlap: Math.round((area / smallest) * 100) + '%',
        });
      }
    }
    return hits.slice(0, 10);
  })()`);

const collectImages = (page) =>
  page.evaluate(`(() => {
    ${PAGE_HELPERS}

    const images = Array.from(document.querySelectorAll('img')).map((image) => ({
      src: image.getAttribute('src'),
      hasAlt: image.hasAttribute('alt'),
      alt: image.getAttribute('alt'),
    }));

    // Inline SVG is decorative here; anything not hidden from the a11y tree
    // needs a name, or a screen reader announces a bare "graphic".
    const svgs = Array.from(document.querySelectorAll('svg'))
      .filter((svg) => svg.getAttribute('aria-hidden') !== 'true' && !svg.getAttribute('role'))
      .map((svg) => ({ parent: describe(svg.parentElement) }));

    // The placeholder blocks stand in for photography. They are role="img", so
    // they need a name for exactly the same reason a real <img> needs alt.
    const unnamed = Array.from(document.querySelectorAll('[role="img"]'))
      .filter((node) => !(node.getAttribute('aria-label') || '').trim())
      .map(describe);

    const placeholders = document.querySelectorAll('[role="img"]').length;

    return { images, svgs, unnamed, placeholders };
  })()`);

const collectMotion = (page) =>
  page.evaluate(`(() => {
    ${PAGE_HELPERS}

    const dim = Array.from(document.querySelectorAll('[data-reveal]'))
      .filter((node) => Number(getComputedStyle(node).opacity) < 0.99)
      .map(describe);

    const staggered = Array.from(document.querySelectorAll('[data-reveal-stagger] > *'))
      .filter((node) => Number(getComputedStyle(node).opacity) < 0.99)
      .map(describe);

    const timeline = Array.from(
      document.querySelectorAll('[data-timeline-marker], [data-timeline-part]'),
    )
      .filter((node) => Number(getComputedStyle(node).opacity) < 0.99)
      .map(describe);

    const rail = Array.from(document.querySelectorAll('[data-timeline-progress]')).map(
      (node) => getComputedStyle(node).transform,
    );

    return { dim, staggered, timeline, rail };
  })()`);

/** Tab through the page and record whether each stop paints a focus ring. */
const collectFocus = async (page, limit = 60) => {
  await page.evaluate(() => {
    const first = document.body.querySelector('a[href]');
    if (first instanceof HTMLElement) first.blur();
    window.scrollTo(0, 0);
  });
  await page.keyboard.press('Tab');

  const stops = [];

  for (let i = 0; i < limit; i += 1) {
    /*
     * Let the ring finish arriving before reading it.
     *
     * Tailwind v4's `transition-colors` includes `outline-color`, and .btn uses
     * it — so for the first ~200ms after focus the outline is interpolating
     * from currentColor towards amber-deep. Reading immediately after Tab
     * samples a colour that is on nobody's palette and reports a contrast
     * failure that does not exist on screen.
     */
    await page.waitForTimeout(260);

    const stop = await page.evaluate(`(() => {
      ${PAGE_HELPERS}

      const element = document.activeElement;
      if (!element || element === document.body) return null;

      /*
       * Tab eventually wraps past the browser chrome and back to the first
       * link. The loop ends on that wrap, tracked by identity — ending on a
       * repeated LABEL would stop early on any page with two "Learn more"s,
       * which is most of them, and silently under-report coverage.
       */
      if (!window.__qaFirst) window.__qaFirst = element;
      else if (window.__qaFirst === element) return { wrapped: true };

      const style = getComputedStyle(element);
      const outlineWidth = parseFloat(style.outlineWidth) || 0;
      const hasOutline = style.outlineStyle !== 'none' && outlineWidth > 0;
      const hasShadow = style.boxShadow !== 'none';

      const rect = element.getBoundingClientRect();

      /*
       * A ring that is there but invisible against its ground is not a focus
       * indicator. WCAG 1.4.11 puts non-text contrast at 3:1 — the site paints
       * the outline amber-deep on paper and amber-soft on the ink bands, and
       * this is what proves the second one was not forgotten somewhere.
       */
      const backdrop = backdropOf(element.parentElement || element);
      const outlineColor = parseColor(style.outlineColor);
      const ringRatio =
        hasOutline && outlineColor && !backdrop.unknown
          ? Math.round(ratio(outlineColor.a < 1 ? over(outlineColor, backdrop) : outlineColor, backdrop) * 100) / 100
          : null;

      return {
        selector: describe(element),
        label: (element.textContent || element.getAttribute('aria-label') || '').trim().slice(0, 32),
        visibleRing: hasOutline || hasShadow,
        outline: style.outlineStyle + ' ' + style.outlineWidth + ' ' + style.outlineColor,
        ringRatio,
        offscreen: rect.width === 0 && rect.height === 0,
      };
    })()`);

    if (!stop || stop.wrapped) break;
    stops.push(stop);
    await page.keyboard.press('Tab');
  }

  return stops;
};

/* ==========================================================================
   Run
========================================================================== */

const problems = [];
/** Every measured colour pair, kept so the report can show how much headroom
 *  the tightest passing combinations actually have. */
const margins = [];
const note = (route, width, kind, detail) =>
  problems.push({ route, width, kind, detail });

const browser = await chromium.launch();

for (const route of ROUTES) {
  const url = `${BASE}${route}`;

  for (const width of WIDTHS) {
    const context = await browser.newContext({
      viewport: { width, height: 900 },
      // Reduced motion for the measuring passes: it is the branch that leaves
      // every revealed section at opacity 1 without scrolling, so contrast and
      // layout can be read from the whole page in one go.
      reducedMotion: 'reduce',
    });
    const page = await context.newPage();
    await page.goto(url, { waitUntil: 'networkidle' });

    const layout = await collectLayout(page);
    if (layout.documentOverflow) {
      note(route, width, 'horizontal scroll', `${layout.scrollWidth}px > ${layout.clientWidth}px`);
      layout.overflowing.forEach((item) =>
        note(route, width, 'sticks out', `${item.selector} [${item.left}…${item.right}] ${item.sample}`),
      );
    }
    layout.clipped.forEach((item) =>
      note(route, width, 'text clipped', `${item.selector} ${item.scrollWidth}>${item.clientWidth} — ${item.sample}`),
    );

    const overlaps = await collectOverlaps(page);
    overlaps.forEach((hit) =>
      note(route, width, 'overlap', `${hit.a}  ×  ${hit.b}  (${hit.overlap})`),
    );

    const motion = await collectMotion(page);
    [...motion.dim, ...motion.staggered, ...motion.timeline].forEach((selector) =>
      note(route, width, 'reduced-motion: still hidden', selector),
    );
    motion.rail.forEach((transform) => {
      // matrix(a, b, c, d, tx, ty) — `d` is the vertical scale. The rail's
      // resting state is scaleY(0); under reduced motion it must be 1, because
      // nothing is going to come along and animate it.
      const parts = transform.match(/matrix\(([^)]+)\)/);
      const scaleY = parts ? Number(parts[1].split(',')[3]) : 1;
      if (scaleY < 0.99) {
        note(route, width, 'reduced-motion: rail unscaled', `${transform} (scaleY ${scaleY})`);
      }
    });

    // Contrast and images do not vary usefully by width beyond the type ramp,
    // which does — so they run at every width but are deduplicated on report.
    const contrast = await collectContrast(page);
    contrast.forEach((item) => margins.push({ route, ...item }));
    contrast
      .filter((item) => !item.pass)
      .forEach((item) =>
        note(
          route,
          width,
          'contrast',
          `${item.ratio}:1 (floor ${item.floor}) ${item.color} on ${item.backdrop} — ${item.size}px/${item.weight} ${item.selector} "${item.sample}"`,
        ),
      );

    if (width === WIDTHS[0] || width === WIDTHS[WIDTHS.length - 1]) {
      const media = await collectImages(page);
      media.images
        .filter((image) => !image.hasAlt)
        .forEach((image) => note(route, width, 'img without alt', String(image.src)));
      media.svgs.forEach((svg) =>
        note(route, width, 'svg without aria-hidden or role', svg.parent),
      );
      media.unnamed.forEach((selector) =>
        note(route, width, 'role="img" without a name', selector),
      );
    }

    await context.close();
  }

  // Keyboard pass, once per route, at a width where the desktop nav is live.
  const keyboardContext = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    reducedMotion: 'reduce',
  });
  const keyboardPage = await keyboardContext.newPage();
  await keyboardPage.goto(url, { waitUntil: 'networkidle' });

  const stops = await collectFocus(keyboardPage);
  if (stops.length === 0) note(route, 1440, 'keyboard', 'no focusable elements reached');
  stops
    .filter((stop) => !stop.visibleRing)
    .forEach((stop) =>
      note(route, 1440, 'no visible focus ring', `${stop.selector} "${stop.label}" — ${stop.outline}`),
    );
  stops
    .filter((stop) => stop.ringRatio !== null && stop.ringRatio < 3)
    .forEach((stop) =>
      note(
        route,
        1440,
        'focus ring under 3:1',
        `${stop.ringRatio}:1 ${stop.selector} "${stop.label}" — ${stop.outline}`,
      ),
    );
  console.log(`${route}: ${stops.length} tab stops, all with a ring: ${stops.every((s) => s.visibleRing)}`);

  await keyboardContext.close();
}

await browser.close();

/* ==========================================================================
   Report
========================================================================== */

console.log('\n=== AUDIT ===\n');

if (problems.length === 0) {
  console.log('No problems found.');
} else {
  const byKind = new Map();
  problems.forEach((problem) => {
    const list = byKind.get(problem.kind) ?? [];
    list.push(problem);
    byKind.set(problem.kind, list);
  });

  for (const [kind, list] of byKind) {
    console.log(`\n## ${kind} (${list.length})`);
    // Same finding at four widths is one finding; the widths are the evidence.
    const seen = new Map();
    list.forEach((problem) => {
      const widths = seen.get(problem.detail) ?? { route: problem.route, widths: [] };
      widths.widths.push(problem.width);
      seen.set(problem.detail, widths);
    });
    for (const [detail, { route, widths }] of seen) {
      console.log(`  [${route} @ ${widths.join('/')}] ${detail}`);
    }
  }
}

/*
 * The five tightest passing pairs. A page can clear AA everywhere and still be
 * one design tweak from failing; this is the margin that tweak would spend.
 */
const tightest = margins
  .filter((item) => item.pass)
  .sort((a, b) => a.ratio - b.ratio)
  .filter(
    (item, index, list) =>
      list.findIndex((other) => other.color === item.color && other.backdrop === item.backdrop) === index,
  )
  .slice(0, 5);

if (tightest.length > 0) {
  console.log('\n## tightest passing colour pairs');
  tightest.forEach((item) =>
    console.log(
      `  ${item.ratio}:1 (floor ${item.floor}) ${item.color} on ${item.backdrop} — ${item.size}px/${item.weight} [${item.route}] "${item.sample}"`,
    ),
  );
}

console.log(`\n${problems.length} finding(s), ${margins.length} colour pairs measured.`);

/**
 * Navigation behaviour — every breakpoint, keyboard included.
 *
 * The audit script measures pages at rest. This drives the header: which nav is
 * live at which width, the drawer's focus trap, Escape and outside-click, the
 * scroll lock, the resize-past-the-breakpoint case, the skip link, and the
 * shrink-on-scroll state.
 *
 *   node .claude/skills/browser-qa/scripts/nav.mjs
 */
import { chromium } from 'playwright';

const BASE = process.env.QA_BASE_URL ?? 'http://localhost:4321';

let failures = 0;
const check = (label, actual, expected) => {
  const pass = JSON.stringify(actual) === JSON.stringify(expected);
  if (!pass) failures += 1;
  console.log(
    `${pass ? 'PASS' : 'FAIL'}  ${label}` +
      (pass ? '' : `\n        expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`),
  );
};

const browser = await chromium.launch();

/* ==========================================================================
   Which nav is live, per width. The breakpoint is lg (1024px).
========================================================================== */
for (const [width, desktop] of [[375, false], [768, false], [1024, true], [1440, true]]) {
  const page = await browser.newPage({ viewport: { width, height: 900 } });
  await page.goto(`${BASE}/`, { waitUntil: 'networkidle' });

  check(
    `${width}px — desktop nav ${desktop ? 'shown' : 'hidden'}`,
    await page.isVisible('nav[aria-label="Primary"]'),
    desktop,
  );
  check(
    `${width}px — hamburger ${desktop ? 'hidden' : 'shown'}`,
    await page.isVisible('[data-menu-toggle]'),
    !desktop,
  );
  check(
    `${width}px — header CTA reachable`,
    (await page.locator('a.btn:has-text("Client Login")').first().isVisible()) ||
      !desktop,
    true,
  );

  // Every primary link resolves — a 404 in the nav is the one broken link
  // nobody forgives.
  const hrefs = await page.$$eval('a[href^="/"]', (nodes) =>
    Array.from(new Set(nodes.map((node) => node.getAttribute('href')))),
  );
  const broken = [];
  for (const href of hrefs) {
    const response = await page.request.get(`${BASE}${href}`);
    if (!response.ok()) broken.push(`${href} → ${response.status()}`);
  }
  check(`${width}px — no broken internal links (${hrefs.length} checked)`, broken, []);

  await page.close();
}

/* ==========================================================================
   The drawer, at 375.
========================================================================== */
const page = await browser.newPage({ viewport: { width: 375, height: 812 } });
await page.goto(`${BASE}/`, { waitUntil: 'networkidle' });

check(
  'closed drawer is inert',
  await page.getAttribute('[data-menu-panel]', 'inert'),
  '',
);
check(
  'toggle reports its state',
  await page.getAttribute('[data-menu-toggle]', 'aria-expanded'),
  'false',
);

await page.click('[data-menu-toggle]');
await page.waitForTimeout(450);

check('drawer opens', await page.isVisible('[data-menu-panel]'), true);
check(
  'aria-expanded flips',
  await page.getAttribute('[data-menu-toggle]', 'aria-expanded'),
  'true',
);
check(
  'focus moves into the drawer',
  await page.evaluate(() =>
    document.querySelector('[data-menu-panel]')?.contains(document.activeElement),
  ),
  true,
);
check(
  'page behind is scroll-locked',
  await page.evaluate(() => document.documentElement.style.overflow),
  'hidden',
);

// Tab all the way round twice — focus must never leave the panel.
const escaped = [];
for (let i = 0; i < 14; i += 1) {
  await page.keyboard.press('Tab');
  const inside = await page.evaluate(() =>
    document.querySelector('[data-menu-panel]')?.contains(document.activeElement),
  );
  if (!inside) escaped.push(i + 1);
}
check('focus never leaves the open drawer (14 tabs)', escaped, []);

// And backwards, which is where a one-directional trap gives itself away.
const escapedBack = [];
for (let i = 0; i < 14; i += 1) {
  await page.keyboard.press('Shift+Tab');
  const inside = await page.evaluate(() =>
    document.querySelector('[data-menu-panel]')?.contains(document.activeElement),
  );
  if (!inside) escapedBack.push(i + 1);
}
check('focus never leaves it going backwards (14 shift-tabs)', escapedBack, []);

await page.keyboard.press('Escape');
await page.waitForTimeout(450);
check('Escape closes it', await page.isVisible('[data-menu-panel]'), false);
check(
  'focus returns to the toggle',
  await page.evaluate(() =>
    document.activeElement?.hasAttribute('data-menu-toggle'),
  ),
  true,
);
check(
  'scroll lock is released',
  await page.evaluate(() => document.documentElement.style.overflow),
  '',
);

// Outside click.
await page.click('[data-menu-toggle]');
await page.waitForTimeout(400);
await page.click('[data-menu-backdrop]', { position: { x: 20, y: 300 } });
await page.waitForTimeout(450);
check('outside click closes it', await page.isVisible('[data-menu-panel]'), false);

// Resizing past the breakpoint with the drawer open would otherwise leave the
// trap and the scroll lock live under a nav that is no longer on screen.
await page.click('[data-menu-toggle]');
await page.waitForTimeout(400);
await page.setViewportSize({ width: 1440, height: 900 });
await page.waitForTimeout(400);
check(
  'resizing to desktop closes it',
  await page.evaluate(() =>
    document.querySelector('[data-site-header]')?.hasAttribute('data-menu-open'),
  ),
  false,
);
check(
  'and releases the scroll lock',
  await page.evaluate(() => document.documentElement.style.overflow),
  '',
);

/* ==========================================================================
   Skip link and the sticky header's scrolled state.
========================================================================== */
await page.setViewportSize({ width: 1440, height: 900 });
await page.goto(`${BASE}/services`, { waitUntil: 'networkidle' });
await page.keyboard.press('Tab');

check(
  'first tab stop is the skip link',
  (await page.evaluate(() => document.activeElement?.textContent?.trim())) ?? '',
  'Skip to content',
);
check(
  'skip link is visible once focused',
  await page.evaluate(() => {
    const active = document.activeElement;
    if (!active) return false;
    const rect = active.getBoundingClientRect();
    return rect.width > 1 && rect.height > 1;
  }),
  true,
);

await page.keyboard.press('Enter');
await page.waitForTimeout(300);
check(
  'skip link lands on main',
  await page.evaluate(() => window.location.hash),
  '#main',
);

await page.evaluate(() => window.scrollTo(0, 400));
await page.waitForTimeout(300);
check(
  'header shrinks once scrolled',
  await page.evaluate(() =>
    document.querySelector('[data-site-header]')?.hasAttribute('data-scrolled'),
  ),
  true,
);
await page.evaluate(() => window.scrollTo(0, 0));
await page.waitForTimeout(300);
check(
  'and restores at the top',
  await page.evaluate(() =>
    document.querySelector('[data-site-header]')?.hasAttribute('data-scrolled'),
  ),
  false,
);

/* ==========================================================================
   Motion: the reveals must actually animate when motion is allowed. The audit
   proves they are visible under `reduce`; without this, a stylesheet that
   showed everything unconditionally would pass both.
========================================================================== */
const motionPage = await browser.newPage({
  viewport: { width: 1440, height: 900 },
  reducedMotion: 'no-preference',
});
await motionPage.goto(`${BASE}/who-we-are`, { waitUntil: 'networkidle' });

check(
  'below-fold reveals start hidden when motion is allowed',
  await motionPage.evaluate(
    () =>
      Array.from(document.querySelectorAll('[data-reveal]')).filter(
        (node) => Number(getComputedStyle(node).opacity) < 0.99,
      ).length > 0,
  ),
  true,
);

await motionPage.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
await motionPage.waitForTimeout(1500);

check(
  'and are all shown after scrolling',
  await motionPage.evaluate(
    () =>
      Array.from(document.querySelectorAll('[data-reveal]')).filter(
        (node) => Number(getComputedStyle(node).opacity) < 0.99,
      ).length,
  ),
  0,
);

await browser.close();

console.log(`\n${failures === 0 ? 'ALL CHECKS PASSED' : `${failures} CHECK(S) FAILED`}`);
process.exit(failures === 0 ? 0 : 1);

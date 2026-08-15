---
name: browser-qa
description: Use this whenever you are about to claim that a page, component, or interaction "works," "renders correctly," or "is verified" during the ledger-and-co build. Covers visual QA, console/network error checks, reduced-motion behavior, and keyboard/focus interaction testing using a real headless browser (Playwright) — not code inspection, not compiled-CSS grepping. Trigger this after finishing any prompt that touches layout, animation, forms, navigation, or focus management, and before reporting results back to the user.
---

# Browser QA (real browser, not code inspection)

## Why this exists

Every checkpoint in this build so far has been verified by reading compiled CSS, grepping HTML output, or checking that `astro build` exits 0. None of that proves a page actually looks right or that an interaction actually works — it proves the code compiled. A sticky header can shrink correctly in the CSS and still flicker in a real browser. A focus trap can be "verified" by reading the code and still leak focus in practice. Do not report something as verified, correct, or working unless it was actually loaded in a browser and observed.

## What to use

Playwright, run headless via Node, invoked directly — no Chrome extension, no external connection required. This runs entirely inside your own shell.

First time in this project, check whether it's installed:

```
npx playwright --version
```

If missing:

```
npm install -D playwright
npx playwright install chromium
```

## Standard visual + error sweep

For any prompt that changes or adds pages, run the bundled script against the dev server (make sure `npm run dev` is running first):

```
node .claude/skills/browser-qa/scripts/qa-check.mjs --routes=/,/services,/news,/who-we-are,/history,/contact,/client-portal --out=qa-screenshots
```

Adjust `--routes` to whatever pages actually exist at that point in the build — don't include routes that 404 by design yet.

This script, for each route, at four real viewport widths (375 / 768 / 1024 / 1440):
- takes a full-page screenshot
- captures browser console errors and uncaught page errors
- captures any HTTP response ≥400 (broken asset, broken link, missing image)
- takes one additional screenshot with `prefers-reduced-motion: reduce` emulated, to confirm animations are actually suppressed, not just gated in CSS
- does a basic keyboard smoke test (first Tab press lands on a visibly focused element)

**After running it, actually open and look at the screenshots in `qa-screenshots/`** (or read them with an image-capable tool) before reporting anything as correct. The script produces evidence; it does not replace looking at the evidence.

## Two things the standard sweep structurally cannot see

`audit.mjs` composites backgrounds by walking DOM ancestors, and it skips
anything `visibility: hidden`. Two blind spots follow from that, each with its
own script. Run both — a clean `audit.mjs` does not cover them.

```
node .claude/skills/browser-qa/scripts/mobile-a11y.mjs
node .claude/skills/browser-qa/scripts/header-contrast.mjs
```

- **`mobile-a11y.mjs`** — the mobile drawer is `visibility: hidden` until opened,
  so its links, its CTA and its footnote are invisible to the sweep's contrast
  and focus-ring passes. This opens the drawer *from the keyboard* first, then
  measures. Open it with `page.click()` instead and Chromium will not match
  `:focus-visible` on the drawer's programmatic focus, and you will report a
  focus bug that no keyboard user can reach. It also runs the tab sweep at
  375px, where the reachable controls differ from the 1440px pass, and checks
  WCAG 2.2 target size *with* its inline and spacing exceptions — the raw
  "box under 24px" test flags every link in a sentence and is pure noise here.

- **`header-contrast.mjs`** — the header is `bg-paper/85` over `backdrop-blur`,
  so its own text is printed on whatever is scrolled underneath it. That
  content is nowhere in the header's DOM ancestry, so the sweep composites the
  bar against paper and always passes it. This samples real pixels out of a
  screenshot at scroll positions where the navy CTA band and the footer are
  behind the bar, and checks the header's text colours against what is actually
  painted. It is what caught the amber-deep ampersand and active nav link
  sitting at 3.8:1 there while measuring 5.18:1 at rest.

The general lesson: when a surface is translucent, or a component is hidden
until an interaction, computed-style compositing is not evidence. Sample pixels
or drive the interaction first.

## Interaction-specific tests (write these per feature, don't try to generalize)

The sweep above catches layout and error regressions. It does NOT catch things like "does the mobile drawer actually trap focus." For any component with real interaction logic (mobile nav drawer, form validation/submission, any modal), write a small dedicated Playwright test. Template for a focus-trap check:

```js
// Example: verify the mobile nav drawer traps focus and closes correctly.
// Adapt selectors to what actually exists in SiteHeader.astro.
import { chromium } from "playwright";

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 375, height: 812 } });
await page.goto("http://localhost:4321/");

await page.click('[aria-label="Open menu"]'); // adjust selector
const drawerVisible = await page.isVisible('[data-drawer]'); // adjust selector
console.log("Drawer opened:", drawerVisible);

// Tab through the drawer several times, confirm focus never lands
// outside it while it's open.
for (let i = 0; i < 10; i++) {
  await page.keyboard.press("Tab");
  const insideDrawer = await page.evaluate(() => {
    const drawer = document.querySelector('[data-drawer]');
    return drawer ? drawer.contains(document.activeElement) : false;
  });
  console.log(`Tab ${i + 1}: focus inside drawer =`, insideDrawer);
}

await page.keyboard.press("Escape");
const drawerClosedAfterEscape = !(await page.isVisible('[data-drawer]'));
console.log("Drawer closed after Escape:", drawerClosedAfterEscape);

await browser.close();
```

Run ad hoc with `node <scriptfile>.mjs`, or drop it in `.claude/skills/browser-qa/scripts/` if it's worth keeping.

## Reporting rules

When reporting QA results back to the user or in a summary:
- State plainly which parts were actually observed in a browser vs. which were only checked via build/typecheck/grep. Do not blur these together.
- If Playwright isn't installed and you skip this step, say so explicitly — don't silently fall back to code inspection and report it as if it were equivalent.
- Screenshot file paths are not proof by themselves — describe what you actually saw in them (fonts distinct, palette correct, no overlap, animation present/absent as expected).

## Cleanup

`qa-screenshots/` is a working directory, not a deliverable — it's fine to gitignore it or clear it between checkpoints. Add it to `.gitignore` if it isn't already there.

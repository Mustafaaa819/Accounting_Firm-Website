#!/usr/bin/env node
/**
 * browser-qa / qa-check.mjs
 *
 * Real, in-browser verification for the ledger-and-co build. This replaces
 * "I read the compiled CSS and it looked right" with an actual Chromium
 * instance loading the actual pages.
 *
 * Usage:
 *   node .claude/skills/browser-qa/scripts/qa-check.mjs --routes=/,/services,/news
 *   node .claude/skills/browser-qa/scripts/qa-check.mjs --base=http://localhost:4321 --out=qa-out
 *
 * Requires the "playwright" package + chromium browser binary. If missing,
 * run first:
 *   npm install -D playwright
 *   npx playwright install chromium
 */

import { chromium } from "playwright";
import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";

const args = Object.fromEntries(
  process.argv.slice(2).map((a) => {
    const [k, v] = a.replace(/^--/, "").split("=");
    return [k, v ?? true];
  })
);

const BASE_URL = args.base || "http://localhost:4321";
const ROUTES = (args.routes || "/").split(",").map((r) => r.trim());
const OUT_DIR = args.out || "qa-screenshots";

const VIEWPORTS = [
  { name: "mobile-375", width: 375, height: 812 },
  { name: "tablet-768", width: 768, height: 1024 },
  { name: "laptop-1024", width: 1024, height: 800 },
  { name: "desktop-1440", width: 1440, height: 900 },
];

mkdirSync(OUT_DIR, { recursive: true });

const report = {
  baseUrl: BASE_URL,
  routes: ROUTES,
  timestamp: new Date().toISOString(),
  results: [],
};

function slug(route) {
  return route === "/" ? "home" : route.replace(/^\//, "").replace(/\//g, "-");
}

async function checkRoute(browser, route) {
  const routeResult = {
    route,
    consoleErrors: [],
    pageErrors: [],
    failedRequests: [],
    screenshots: [],
  };

  for (const vp of VIEWPORTS) {
    const context = await browser.newContext({
      viewport: { width: vp.width, height: vp.height },
    });
    const page = await context.newPage();

    page.on("console", (msg) => {
      if (msg.type() === "error") {
        routeResult.consoleErrors.push(`[${vp.name}] ${msg.text()}`);
      }
    });
    page.on("pageerror", (err) => {
      routeResult.pageErrors.push(`[${vp.name}] ${err.message}`);
    });
    page.on("response", (res) => {
      if (res.status() >= 400) {
        routeResult.failedRequests.push(
          `[${vp.name}] ${res.status()} ${res.url()}`
        );
      }
    });

    const url = new URL(route, BASE_URL).toString();
    await page.goto(url, { waitUntil: "networkidle", timeout: 30000 });

    // Let fonts/webfonts settle and any entrance animation run once.
    await page.waitForTimeout(600);

    const screenshotPath = path.join(
      OUT_DIR,
      `${slug(route)}__${vp.name}.png`
    );
    await page.screenshot({ path: screenshotPath, fullPage: true });
    routeResult.screenshots.push(screenshotPath);

    // Basic keyboard-accessibility smoke test: tab through the page and
    // confirm each focused element actually has a visible focus outline
    // (not outline: none with nothing replacing it).
    if (vp.name === "desktop-1440") {
      await page.keyboard.press("Tab");
      const firstFocusVisible = await page.evaluate(() => {
        const el = document.activeElement;
        if (!el || el === document.body) return null;
        const style = getComputedStyle(el);
        const hasOutline = style.outlineStyle !== "none" && style.outlineWidth !== "0px";
        const hasBoxShadow = style.boxShadow !== "none";
        return { tag: el.tagName, visible: hasOutline || hasBoxShadow };
      });
      routeResult.firstTabFocusCheck = firstFocusVisible;
    }

    await context.close();
  }

  // Reduced-motion pass — one viewport is enough, this is checking that
  // animations are actually suppressed, not re-screenshotting everything.
  const reducedContext = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    reducedMotion: "reduce",
  });
  const reducedPage = await reducedContext.newPage();
  await reducedPage.goto(new URL(route, BASE_URL).toString(), {
    waitUntil: "networkidle",
  });
  await reducedPage.waitForTimeout(600);
  const reducedShot = path.join(OUT_DIR, `${slug(route)}__reduced-motion.png`);
  await reducedPage.screenshot({ path: reducedShot, fullPage: true });
  routeResult.screenshots.push(reducedShot);
  await reducedContext.close();

  return routeResult;
}

// `--channel=chrome` runs the locally installed Chrome instead of Playwright's
// bundled Chromium — the fallback when the browser download is unavailable.
const browser = await chromium.launch(
  args.channel ? { channel: args.channel } : {},
);
for (const route of ROUTES) {
  console.log(`Checking ${route} ...`);
  const result = await checkRoute(browser, route);
  report.results.push(result);
}
await browser.close();

writeFileSync(
  path.join(OUT_DIR, "report.json"),
  JSON.stringify(report, null, 2)
);

// Human-readable summary to stdout.
console.log("\n=== QA SUMMARY ===");
for (const r of report.results) {
  console.log(`\nRoute: ${r.route}`);
  console.log(`  Console errors: ${r.consoleErrors.length}`);
  r.consoleErrors.forEach((e) => console.log(`    - ${e}`));
  console.log(`  Page errors: ${r.pageErrors.length}`);
  r.pageErrors.forEach((e) => console.log(`    - ${e}`));
  console.log(`  Failed requests (4xx/5xx): ${r.failedRequests.length}`);
  r.failedRequests.forEach((e) => console.log(`    - ${e}`));
  if (r.firstTabFocusCheck) {
    console.log(
      `  First Tab focus visible: ${r.firstTabFocusCheck.visible} (${r.firstTabFocusCheck.tag})`
    );
  }
  console.log(`  Screenshots: ${r.screenshots.length} saved to ${OUT_DIR}/`);
}
console.log(`\nFull report: ${path.join(OUT_DIR, "report.json")}`);
console.log(
  "\nScreenshots were saved, not looked at. Open them yourself or hand them to Claude to actually read before claiming a page is correct."
);

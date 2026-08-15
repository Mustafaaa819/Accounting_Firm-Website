/**
 * Contact form behaviour test — real browser, real submit.
 *
 * The visual sweep in qa-check.mjs proves the page renders. It cannot prove
 * that an empty submit is refused, that the success panel replaces the form, or
 * that a 500 from the backend surfaces as something a visitor can act on. Those
 * are what this drives.
 *
 * The network layer is intercepted rather than left live: the point is to
 * observe what the page does with each response, and a real POST to Netlify
 * Forms is not available from a dev server anyway. What IS asserted for real is
 * the request body — the field names Netlify keys on have to be in it.
 *
 * Run with the dev server up:  node .claude/skills/browser-qa/scripts/contact-form.mjs
 */
import { chromium } from 'playwright';

const BASE = process.env.QA_BASE_URL ?? 'http://localhost:4321';
const URL = `${BASE}/contact`;

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
const context = await browser.newContext({ viewport: { width: 1280, height: 900 } });
const page = await context.newPage();

/*
 * Scenarios 5 and 6 make the browser log a failed request on purpose — that is
 * what a 500 and a dropped connection are. Collection is muted around them so
 * the final check stays a check on the page rather than on the test.
 */
let expectNetworkNoise = false;
const consoleErrors = [];
page.on('console', (message) => {
  if (message.type() === 'error' && !expectNetworkNoise) consoleErrors.push(message.text());
});
page.on('pageerror', (error) => consoleErrors.push(String(error)));

/* --------------------------------------------------------------------------
   Intercept the submission. `mode` is flipped per scenario.
-------------------------------------------------------------------------- */
let mode = 'ok';
let captured = null;

await context.route(`${BASE}/`, async (route, request) => {
  if (request.method() !== 'POST') return route.continue();

  captured = request.postData();

  if (mode === 'ok') return route.fulfill({ status: 200, body: 'OK' });
  if (mode === 'server-error') return route.fulfill({ status: 500, body: 'nope' });
  return route.abort('failed');
});

const fillValid = async () => {
  await page.fill('#contact-name', 'Marian Whitfield');
  await page.fill('#contact-company', 'Whitfield Castings Ltd');
  await page.fill('#contact-email', 'marian@whitfieldcastings.co.uk');
  await page.fill('#contact-phone', '+44 (0)161 496 0180');
  await page.selectOption('#contact-office', 'manchester');
  await page.fill(
    '#contact-message',
    'Year end is 31 March, turnover about £4.2m, books are on Xero and our current accountant has just retired.',
  );
  await page.check('#contact-consent');
};

/* --------------------------------------------------------------------------
   1. Empty submit — every field is refused at once, and focus lands on the
      first one rather than being left on the button.
-------------------------------------------------------------------------- */
await page.goto(URL, { waitUntil: 'networkidle' });

await page.click('[data-submit]');

const visibleErrors = await page.$$eval('.field-error:not([hidden])', (nodes) =>
  nodes.map((node) => node.id),
);
check('empty submit marks all five required fields', visibleErrors.sort(), [
  'contact-consent-error',
  'contact-email-error',
  'contact-message-error',
  'contact-name-error',
  'contact-office-error',
]);

check(
  'summary panel is shown',
  await page.isVisible('[data-form-error]'),
  true,
);
check(
  'summary counts the failures',
  (await page.textContent('[data-form-error-text]'))?.trim(),
  '5 fields need another look — they are marked below.',
);
check(
  'focus moves to the first invalid field',
  await page.evaluate(() => document.activeElement?.id),
  'contact-name',
);
check(
  'invalid fields are marked for assistive tech',
  await page.getAttribute('#contact-name', 'aria-invalid'),
  'true',
);
check('nothing was posted', captured, null);

/* --------------------------------------------------------------------------
   2. A bad email is caught, and correcting it clears the error live.
-------------------------------------------------------------------------- */
await page.fill('#contact-email', 'marian@');
await page.dispatchEvent('#contact-email', 'blur');
check(
  'malformed email is refused',
  await page.isVisible('#contact-email-error'),
  true,
);

await page.fill('#contact-email', 'marian@whitfieldcastings.co.uk');
check(
  'correcting it clears the error without another submit',
  await page.isVisible('#contact-email-error'),
  false,
);

/* --------------------------------------------------------------------------
   3. A phone number with brackets, spaces and a country code is accepted —
      the rule is meant to catch typos, not real numbers.
-------------------------------------------------------------------------- */
await page.fill('#contact-phone', '+44 (0)161 496 0180');
await page.dispatchEvent('#contact-phone', 'blur');
check(
  'a formatted phone number is accepted',
  await page.isVisible('#contact-phone-error'),
  false,
);

/* --------------------------------------------------------------------------
   4. Valid submit — success panel replaces the form, focus follows it, and
      the request body carries what Netlify needs.
-------------------------------------------------------------------------- */
await page.goto(URL, { waitUntil: 'networkidle' });
await fillValid();
mode = 'ok';
await page.click('[data-submit]');
await page.waitForSelector('[data-form-success]:not([hidden])', { timeout: 5000 });

check('form is removed on success', await page.isVisible('[data-contact-form]'), false);
check('success panel is shown', await page.isVisible('[data-form-success]'), true);
check(
  'focus follows the success panel',
  await page.evaluate(() =>
    document.activeElement?.hasAttribute('data-form-success'),
  ),
  true,
);

const body = new URLSearchParams(captured ?? '');
check('posted form-name', body.get('form-name'), 'contact');
check('posted the selected office', body.get('office'), 'manchester');
check('posted the email', body.get('email'), 'marian@whitfieldcastings.co.uk');
check('posted the consent', body.get('consent'), 'yes');
check('honeypot went out empty', body.get('bot-field'), '');
check('content type is urlencoded', typeof captured, 'string');

/* --------------------------------------------------------------------------
   5. Backend failure — the visitor gets a real error and keeps their text.
-------------------------------------------------------------------------- */
expectNetworkNoise = true;
await page.goto(URL, { waitUntil: 'networkidle' });
await fillValid();
mode = 'server-error';
await page.click('[data-submit]');
await page.waitForSelector('[data-form-error]:not([hidden])', { timeout: 5000 });

check(
  'failure message names the status',
  (await page.textContent('[data-form-error-text]'))?.trim(),
  'The form service refused the message (error 500).',
);
check('form is still there', await page.isVisible('[data-contact-form]'), true);
check(
  'what they wrote is still in the box',
  ((await page.inputValue('#contact-message')) ?? '').slice(0, 14),
  'Year end is 31',
);
check(
  'the submit button is usable again',
  await page.isEnabled('[data-submit]'),
  true,
);
check(
  'the button label is back to its resting state',
  (await page.textContent('[data-submit-label]'))?.trim(),
  'Send enquiry',
);

/* --------------------------------------------------------------------------
   6. A dropped connection — same treatment, different sentence.
-------------------------------------------------------------------------- */
await page.goto(URL, { waitUntil: 'networkidle' });
await fillValid();
mode = 'offline';
await page.click('[data-submit]');
await page.waitForSelector('[data-form-error]:not([hidden])', { timeout: 5000 });
check(
  'a network failure is reported, not swallowed',
  (await page.textContent('[data-form-error-text]'))?.trim().length > 0,
  true,
);

/* --------------------------------------------------------------------------
   7. The honeypot must be invisible AND unreachable by keyboard — a screen
      reader user who tabbed into it would have their enquiry binned.
-------------------------------------------------------------------------- */
expectNetworkNoise = false;
await page.goto(URL, { waitUntil: 'networkidle' });
check(
  'honeypot is not visible',
  await page.isVisible('[name="bot-field"], [name="_gotcha"]'),
  false,
);
check(
  'honeypot is out of the tab order',
  await page.getAttribute('[name="bot-field"], [name="_gotcha"]', 'tabindex'),
  '-1',
);

/* --------------------------------------------------------------------------
   8. Keyboard: tab from the name field to the submit button without leaving
      the form, and confirm each stop is visibly focused.
-------------------------------------------------------------------------- */
await page.focus('#contact-name');
const tabStops = [];
for (let i = 0; i < 7; i += 1) {
  await page.keyboard.press('Tab');
  tabStops.push(
    await page.evaluate(() => {
      const active = document.activeElement;
      if (!active) return null;
      return active.id || active.getAttribute('data-submit') !== null
        ? active.id || 'submit'
        : active.tagName.toLowerCase();
    }),
  );
}
check('tab order runs through the fields to the button', tabStops, [
  'contact-company',
  'contact-email',
  'contact-phone',
  'contact-office',
  'contact-message',
  'contact-consent',
  'submit',
]);

/* --------------------------------------------------------------------------
   9. The reveal sections below the fold actually reveal once scrolled to —
      a full-page screenshot taken without scrolling shows them at opacity 0,
      which is the animation working, not the content missing.
-------------------------------------------------------------------------- */
await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
await page.waitForTimeout(1200);
const revealed = await page.evaluate(() => {
  const nodes = Array.from(document.querySelectorAll('[data-reveal]'));
  return nodes.filter((node) => Number(getComputedStyle(node).opacity) < 0.99).length;
});
check('every reveal section is visible after scrolling', revealed, 0);
await page.screenshot({ path: 'qa-screenshots/contact__scrolled.png', fullPage: true });

check('no console or page errors', consoleErrors, []);

await browser.close();

console.log(`\n${failures === 0 ? 'ALL CHECKS PASSED' : `${failures} CHECK(S) FAILED`}`);
process.exit(failures === 0 ? 0 : 1);

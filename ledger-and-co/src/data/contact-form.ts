/**
 * Which backend the contact form posts to.
 *
 * The site is a static build, so the form cannot be handled by the site itself
 * — something off-box has to receive the POST. Two backends are wired, and the
 * page picks between them at BUILD time (not in the browser), so the rendered
 * HTML only ever carries the attributes of the one in use:
 *
 *   1. Netlify Forms — the default, and what you get with no configuration at
 *      all. Netlify's build step scans the deployed HTML for a form carrying
 *      the `netlify` attribute and provisions a handler for it. Nothing to sign
 *      up for, no key, no endpoint. Only works on Netlify.
 *
 *   2. Formspree — the fallback for any other host (Vercel, Cloudflare Pages,
 *      a plain S3 bucket, your friend's shared hosting). Set the endpoint in
 *      `.env` and this module switches the form over:
 *
 *          PUBLIC_FORMSPREE_ENDPOINT=https://formspree.io/f/xxxxxxxx
 *
 * The `PUBLIC_` prefix is Astro's: it is what makes the variable readable from
 * the client bundle. That is fine here — a Formspree form ID is public by
 * design; it is in the markup of every site that uses one. Do not put anything
 * secret behind that prefix.
 */

/** The form's `name`. Netlify keys submissions on it, so it is also the label
 *  the inbox shows in the dashboard. Changing it starts a new, empty inbox. */
export const CONTACT_FORM_NAME = 'contact';

const configured = (import.meta.env.PUBLIC_FORMSPREE_ENDPOINT ?? '').trim();

/*
 * Validated rather than trusted. A half-pasted endpoint ("formspree.io/f/…"
 * without the scheme, or the dashboard URL instead of the form URL) would
 * otherwise build a form that posts into nothing and reports success — the
 * exact failure this whole module exists to avoid. A malformed value falls
 * back to Netlify, which at least fails loudly off-Netlify.
 */
const FORMSPREE_URL = /^https:\/\/formspree\.io\/f\/[A-Za-z0-9]+$/;

export const formspreeEndpoint = FORMSPREE_URL.test(configured) ? configured : '';

export const formBackend: 'netlify' | 'formspree' = formspreeEndpoint
  ? 'formspree'
  : 'netlify';

/** True when something was set but did not look like a Formspree form URL —
 *  surfaced as a build warning rather than silently ignored. */
export const formspreeMisconfigured = configured !== '' && formspreeEndpoint === '';

/**
 * The honeypot: a field the visitor never sees, because anything that fills it
 * in is a bot and the submission is dropped before it reaches the inbox.
 *
 * The two backends look for different names. Netlify takes whatever the form
 * declares in `data-netlify-honeypot`; Formspree only recognises `_gotcha`.
 */
export const honeypotField = formBackend === 'formspree' ? '_gotcha' : 'bot-field';

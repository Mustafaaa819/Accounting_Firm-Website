# Claude Code Build Plan — Accounting Firm Website (Astro + GSAP)

Run these prompts **in order**, one at a time, in a Claude Code session opened at your project folder. Don't paste them all at once — let each one finish, check the result in the browser, then move to the next.

**Stack:** Astro (static site generator, file-based routing, content collections), Tailwind CSS (custom-configured, not default look), GSAP for scroll animation, TypeScript. No WordPress, no PHP, no Docker. Deploys as static files to Netlify/Vercel/Cloudflare Pages.

## Design direction (locked in — don't let Claude Code improvise this away)

Same as before, carried over unchanged. This is what stops the output from looking like every other AI-generated site:

- **Palette:** ink navy (#12203A), warm off-white paper (#F6F3EC), single accent — burnt amber (#C4682B). No gradients. Flat, confident color blocking.
- **Type:** self-hosted Fraunces (serif) for all headings, self-hosted Inter for body text only — never headings. Big type, generous line-height, tight letter-spacing on headings.
- **Layout:** editorial, asymmetric grid — not centered-card-grid-everywhere. Real whitespace. Content-led, not icon-led.
- **Motion:** subtle scroll-reveal via GSAP ScrollTrigger (fade + 8–12px translate, nothing bouncy), a restrained sticky-header shrink, smooth anchor scrolling. No confetti, no spinning icons, no gimmicky parallax.
- **Voice:** specific and dry, not "empowering your financial future." Copy should sound like a real accounting firm, not a SaaS landing page.

---

## Prompt 0 — Project scaffold

```
Scaffold a new Astro project called "ledger-and-co" (working name — accounting firm marketing site) with TypeScript and Tailwind CSS integrated via the official Astro Tailwind integration. Configure tailwind.config with custom design tokens instead of defaults: colors ink navy #12203A, paper #F6F3EC, amber #C4682B; a fluid type scale; a fontFamily config for "display" (Fraunces) and "sans" (Inter). Download and self-host Fraunces and Inter as local font files in public/fonts, set up @font-face in a global stylesheet with font-display: swap, and preload the critical weights in the base layout. Install gsap and @gsap/scrolltrigger. Set up the folder structure: src/layouts (BaseLayout.astro), src/components, src/pages, and src/content with a content.config.ts defining three collections — "services", "team", and "news" — each with a zod schema (services: title, slug, summary, body; team: name, role, bio, photo; news: title, date, excerpt, body). Confirm `npm run dev` runs cleanly with no errors and the fonts load correctly.
```

## Prompt 1 — Global design system

```
Build the global styles and base layout for ledger-and-co. In BaseLayout.astro set up the html head (meta tags, favicon placeholder, font preloads), a global stylesheet with base element styles using the Tailwind tokens from Prompt 0 (links, buttons — one primary filled amber button component and one ghost/outline button component, forms, blockquotes), and 2–3 real reusable layout patterns as Astro components (not a generic 12-col grid): a full-bleed alternating image/text section, an offset two-column section, a dense text-led section. Build a reusable ScrollReveal.astro (or a small client-side script) using GSAP ScrollTrigger that fades and translates elements up 8–12px as they enter viewport, respecting prefers-reduced-motion by disabling the animation and just showing content. Keep GSAP usage minimal and only hydrated where actually needed (Astro islands, not global JS).
```

## Prompt 2 — Header and navigation

```
Build a Header.astro component for ledger-and-co: logo (site name styled as a wordmark for now), primary navigation (Home, Services, News, Who We Are, History, Contact), and a "Client Login" button styled distinctly (amber filled button, not a plain link) that links out to https://start.exactonline.com/docs/CustomerLogin.aspx in a new tab with rel="noopener noreferrer" — this is a real link-out to Exact Online's client login, not a fake login form, do not build a login UI. Make the header sticky with a subtle shrink-on-scroll effect (reduce padding/logo size after ~80px scroll via a small client-side script, animated with CSS transitions). Build a proper mobile nav: full-screen or slide-in overlay menu below a breakpoint, animated hamburger-to-X toggle, traps focus, closes on Escape and outside click. Add a matching Footer.astro with nav links, firm details, and a copyright line in the ink navy palette as a dark footer band.
```

## Prompt 3 — Homepage

```
Build src/pages/index.astro as a real homepage for a mid-size accounting firm, not a generic SaaS layout. Sections in order: (1) an asymmetric hero — large serif headline making a specific claim (e.g. "Accounting, tax, and payroll for businesses that outgrew a spreadsheet," not "empowering your financial future"), a short supporting line, a primary CTA ("Book a consultation") and secondary text link ("See our services"), offset layout not centered; (2) a services overview querying the "services" content collection with astro:content, with a graceful empty state if none exist yet; (3) a "why this firm" section as dense editorial text with a pull-quote-style stat, not icon cards; (4) a compact team teaser linking to the full Who We Are page; (5) a news teaser pulling the 3 most recent entries from the "news" collection; (6) a closing CTA band in ink navy with paper text. Apply the ScrollReveal component from Prompt 1 to each section. Use clearly labeled placeholder image blocks (flat color divs with noted dimensions) instead of stock-photo placeholders — real photography drops in later.
```

## Prompt 4 — Services

```
Populate the "services" content collection with 5 real entries (Bookkeeping, Tax Advisory, Payroll, Audit & Assurance, Business Advisory) as markdown files with actual specific-sounding descriptions, not lorem ipsum. Build src/pages/services/index.astro as an editorial list (not a 3-column icon-card grid) — each service as a horizontal row with description and "Learn more" link, alternating text alignment for rhythm. Build src/pages/services/[slug].astro as a dynamic route rendering each individual service with what's included, who it's for, and a "Get in touch" CTA linking to the contact page (do not reuse the Exact client-login button here — that's for existing clients, not prospects, don't blur the two).
```

## Prompt 5 — News / Insights

```
Populate the "news" content collection with 3–4 realistic accounting-firm articles (e.g. "Key tax deadlines this quarter," "What changed in payroll reporting requirements," a firm announcement) with real dates and full body content. Build src/pages/news/index.astro as an editorial listing — large title, date, short excerpt, no card-grid-with-shadow cliché. Build src/pages/news/[slug].astro for individual articles with readable article width (~65–75ch), consistent typography for headings/blockquotes/lists, a byline area, and a related-posts section (3 other entries) at the bottom.
```

## Prompt 6 — Who We Are / Team

```
Populate the "team" content collection with 4–5 realistic team members (Managing Partner, Head of Tax, Senior Accountant, Payroll Manager, etc. — not "John Doe, CEO") with short specific bios. Build src/pages/who-we-are.astro: an intro section stating the firm's actual positioning (size, specialisms, who they serve — pick something specific, not "we serve all your accounting needs"), followed by the team rendered in an asymmetric grid (not uniform equal-size cards) with name, role, bio, and a photo placeholder.
```

## Prompt 7 — History

```
Build src/pages/history.astro as a vertical timeline of the firm's history from founding to present. Invent a plausible, specific founding story (e.g. "Founded 1998 as a two-person practice," a merger, opening a second office, adopting cloud accounting, current headcount) with 5–7 real-sounding milestones — no "Lorem ipsum 2020: Great things happened." Build this as an animated timeline component: a vertical line with milestone markers, each one animating in via GSAP ScrollTrigger as the user scrolls, alternating left/right on desktop and collapsing to single-column on mobile.
```

## Prompt 8 — Client Portal, Contact, and form handling

```
Build: (1) src/pages/client-portal.astro — a short page explaining that existing clients access their accounts via Exact Online, with the same link-out CTA from Prompt 2 (https://start.exactonline.com/docs/CustomerLogin.aspx, new tab) — no login form, this is a link-out only; (2) src/pages/contact.astro with a real contact form (name, email, phone, message, office selector if relevant) that actually submits somewhere — since this is a static site, wire it to a real static-friendly form handler (Netlify Forms if deploying to Netlify, or Formspree as a fallback that works on any host) with proper client-side validation and a real success/error state, not a form that goes nowhere. Include office address, phone, and email as text (map embed can be a placeholder). Tell me clearly which form backend you wired it to and what I need to do post-deploy to activate it (e.g. Netlify dashboard step, or a Formspree account + endpoint).
```

## Prompt 9 — Responsive, accessibility, and motion QA pass

```
Do a full QA pass across every page built so far in ledger-and-co (index, services index/detail, news index/detail, who-we-are, history, client-portal, contact). Check and fix: responsive behavior at 375px, 768px, 1024px, 1440px (no horizontal scroll, no overlapping text, nav works at all breakpoints); color contrast meets WCAG AA for all text/background combos in the palette; all interactive elements are keyboard-navigable with visible focus states; images have alt attributes (even placeholders); mobile nav traps focus correctly; GSAP animations respect prefers-reduced-motion; `npm run build` completes with no errors or warnings. Report back what you found and fixed.
```

## Prompt 10 — Performance, SEO, and deploy prep

```
Run a final polish pass on ledger-and-co: confirm fonts are self-hosted, preloaded, and not render-blocking; use Astro's built-in <Image /> component for any real images going forward with lazy loading below the fold; add per-page meta titles/descriptions and Open Graph tags via the BaseLayout; generate a sitemap (@astrojs/sitemap integration) and a robots.txt; run `npm run build` and confirm the output in dist/ is clean static output ready for Netlify/Vercel/Cloudflare Pages. Then do a final visual pass comparing every page against the locked design direction at the top of this plan — flag anywhere it drifted toward generic AI-slop patterns (centered hero, icon-card grids, gradient buttons, default Tailwind blue, Inter-for-everything typography) and fix those specifically before calling it done.
```

---

## Notes for you, not for Claude Code

- Run Prompt 0 and actually open localhost in a browser before continuing — confirm fonts loaded and Tailwind tokens are applying, not default Tailwind blue/gray.
- Stop and look after Prompt 3 (homepage). If it already reads as generic, say so and make Claude Code redo it — don't let 6 more prompts compound the same mistake.
- The contact form needs a real backend account (Netlify Forms activates automatically on Netlify deploy; Formspree needs you to sign up and drop in an endpoint) — Prompt 8 will tell you which one it used and what's left for you to do.
- "Client login to Exact" is still just the link-out button — same call as before, still correct for a static site.
- Deliverable is a git repo / dist folder, not a WordPress export anymore — decide how you're handing this to your friend's contact (repo link, deployed URL, or zipped dist/).

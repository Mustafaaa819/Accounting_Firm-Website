# Astro Starter Kit: Minimal

```sh
npm create astro@latest -- --template minimal
```

> 🧑‍🚀 **Seasoned astronaut?** Delete this file. Have fun!

## 🚀 Project Structure

Inside of your Astro project, you'll see the following folders and files:

```text
/
├── public/
├── src/
│   └── pages/
│       └── index.astro
└── package.json
```

Astro looks for `.astro` or `.md` files in the `src/pages/` directory. Each page is exposed as a route based on its file name.

There's nothing special about `src/components/`, but that's where we like to put any Astro/React/Vue/Svelte/Preact components.

Any static assets, like images, can be placed in the `public/` directory.

## 🧞 Commands

All commands are run from the root of the project, from a terminal:

| Command                   | Action                                           |
| :------------------------ | :----------------------------------------------- |
| `npm install`             | Installs dependencies                            |
| `npm run dev`             | Starts local dev server at `localhost:4321`      |
| `npm run build`           | Build your production site to `./dist/`          |
| `npm run preview`         | Preview your build locally, before deploying     |
| `npm run astro ...`       | Run CLI commands like `astro add`, `astro check` |
| `npm run astro -- --help` | Get help using the Astro CLI                     |

## ✉️ Contact form backend

The site is a static build, so the form on `/contact` posts to an off-box
handler. Two are wired; the choice is made at **build time** in
`src/data/contact-form.ts`, and the rendered HTML only ever carries the
attributes of the one in use.

### Default — Netlify Forms (nothing to configure)

With no environment variable set, the form is a Netlify form: `data-netlify` on
the `<form>`, a `form-name` hidden input, and a `bot-field` honeypot.
`netlify.toml` already sets the build command, publish directory and Node
version.

**Post-deploy, once:**

1. Deploy to Netlify. Netlify's post-processing scans the deployed HTML and
   registers the form automatically — but **only on a deploy of a build that
   already contains the form**, so this must be a fresh deploy, not a rollback.
2. Netlify dashboard → **Forms**. A form named `contact` should be listed. If it
   is not, the deploy that published `/contact` predates the form; redeploy.
3. **Forms → Settings → Form notifications → Add notification → Email
   notification.** Without this, submissions are collected but nobody is told.
   Point it at the firm's real mailbox.
4. Send a test enquiry from the live site and confirm it lands in both the
   dashboard and the mailbox.

Free tier is 100 submissions/month. Spam filtering is on by default (the
honeypot plus Akismet).

### Fallback — Formspree (works on any host)

Use this if the site goes to Vercel, Cloudflare Pages, GitHub Pages or plain
static hosting.

1. Sign up at [formspree.io](https://formspree.io) and create a form.
2. Copy its endpoint — the whole URL, e.g. `https://formspree.io/f/xxxxxxxx`.
3. `cp .env.example .env` and set:
   `PUBLIC_FORMSPREE_ENDPOINT=https://formspree.io/f/xxxxxxxx`
4. Set the same variable in the host's build environment, then rebuild. The
   form switches to a Formspree `action`, a `_gotcha` honeypot and a `_subject`
   line; `netlify.toml` can be deleted.
5. Confirm the recipient address on the Formspree form and send a test enquiry.
   Formspree asks you to confirm the first submission by email.

A malformed endpoint is rejected at build time with a `[contact]` warning and
falls back to Netlify, rather than building a form that posts into nothing.

### Testing it

```sh
npx astro dev --background
node .claude/skills/browser-qa/scripts/contact-form.mjs
```

Drives a real browser: validation, focus handling, the submitted request body,
and both end states. Network responses are stubbed — it proves the page's
behaviour, not the account setup, which only a live test enquiry can.

## 👀 Want to learn more?

Feel free to check [our documentation](https://docs.astro.build) or jump into our [Discord server](https://astro.build/chat).

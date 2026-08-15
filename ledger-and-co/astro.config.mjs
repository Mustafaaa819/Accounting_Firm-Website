// @ts-check
import { defineConfig } from 'astro/config';

import tailwindcss from '@tailwindcss/vite';
import sitemap from '@astrojs/sitemap';

// https://astro.build/config
export default defineConfig({
  // PLACEHOLDER — swap for the real production origin. Astro needs this to build
  // absolute URLs for the canonical link and og:url tags in BaseLayout, and the
  // sitemap integration refuses to emit anything without it.
  site: 'https://ledgerandco.example',

  image: {
    // Makes every <Image /> responsive by default: Astro emits a srcset and a
    // sizes attribute, and writes intrinsic width/height so the space is
    // reserved before the file arrives. Set here rather than per call site so a
    // new image cannot be added without it.
    layout: 'constrained',
    objectFit: 'cover',
  },

  integrations: [
    // Every route here is a public marketing page, so nothing is filtered out.
    // If a page ever ships with `noindex` on BaseLayout, add a `filter` here to
    // drop it — a noindex page listed in a sitemap is a contradiction crawlers
    // report. No `lastmod`: it would stamp build time on all ten pages at once,
    // which is worse than omitting it.
    sitemap(),
  ],

  vite: {
    plugins: [tailwindcss()]
  }
});

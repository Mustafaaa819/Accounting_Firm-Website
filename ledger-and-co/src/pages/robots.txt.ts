import type { APIRoute } from 'astro';

/**
 * robots.txt, generated rather than dropped in public/.
 *
 * The Sitemap: line has to be an absolute URL, and the production origin is
 * still a placeholder in astro.config.mjs. Building it from `site` means the
 * day that placeholder is replaced, this file follows — a static public/
 * robots.txt would keep pointing at ledgerandco.example and nobody would
 * notice until a crawler did.
 *
 * `@astrojs/sitemap` always emits sitemap-index.xml as the entry point, even
 * for a site this small, and that index is what belongs here.
 */
export const GET: APIRoute = ({ site }) => {
  if (!site) {
    throw new Error(
      'robots.txt needs `site` set in astro.config.mjs to write an absolute Sitemap: URL.',
    );
  }

  const body = `# https://www.robotstxt.org/robotstxt.html
User-agent: *
Allow: /

Sitemap: ${new URL('sitemap-index.xml', site).href}
`;

  return new Response(body, {
    headers: { 'Content-Type': 'text/plain; charset=utf-8' },
  });
};

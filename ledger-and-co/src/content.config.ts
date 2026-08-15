import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
// Astro 7 deprecates the `z` re-export from `astro:content`. Import zod directly
// instead — it must stay on the v4 line that Astro itself compiles schemas with,
// or the schema types won't line up with `defineCollection`.
import { z } from 'zod';

/**
 * Content collections for Ledger & Co.
 *
 * A note on `body`: for the Markdown-backed collections (services, news) the body
 * is the Markdown content of the file itself, not a frontmatter key. Astro exposes
 * it as `entry.body` (raw) and via `render(entry)` (compiled), so declaring a
 * `body: z.string()` in the schema would force authors to duplicate the article
 * inside frontmatter. `team.bio` is different — it is a short one-paragraph string,
 * so it stays a validated frontmatter field.
 */

const services = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/services' }),
  schema: z.object({
    title: z.string(),
    // Explicit so the URL survives a file rename; the loader's `id` would not.
    slug: z.string(),
    summary: z.string(),
    // Reading order on /services. The sequence is editorial — the work a client
    // buys first sits at the top — so it can't be derived from the title, and
    // alphabetical would open the list on Audit.
    order: z.number(),
    // "Who it's for", one paragraph. A string rather than a list of segments:
    // the qualifier ("turning over roughly £500k to £20m") is the useful part,
    // and a bulleted list of company types would read as a filter, not advice.
    audience: z.string(),
    // "What's included" — the scope lines. Kept in frontmatter rather than as a
    // Markdown list in the body so the detail page can lay them out as ruled
    // rows; `min(1)` because a service page with no scope is a stub.
    included: z.array(z.string()).min(1),
  }),
});

const team = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/team' }),
  schema: z.object({
    name: z.string(),
    role: z.string(),
    // Seniority, and with it the layout. The glob loader reads files in
    // filename order, which would put the newest joiner first and hand them
    // the lead slot on /who-we-are. Alphabetical by surname is no better —
    // it is a bench, not an index. Same reasoning as `services.order`.
    order: z.number(),
    bio: z.string(),
    // Path under /public. Swap to `image()` from the schema context once the
    // headshots live in src/assets and should go through Astro's image pipeline.
    photo: z.string(),
  }),
});

const news = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/news' }),
  schema: z.object({
    title: z.string(),
    // Same reasoning as `services.slug`: the route is built from this, not from
    // the loader's `id`, so the files can keep their `2026-` sort prefix in the
    // editor without dragging a year into every published URL.
    slug: z.string(),
    // `z.coerce.date()` so an unquoted YAML date and an ISO string both parse.
    date: z.coerce.date(),
    excerpt: z.string(),
    // Byline. Required: a practice publishes technical guidance under a named
    // person's judgement, and an unattributed "what changed in payroll" note is
    // worth less than one signed by the partner who has to defend it. `role`
    // sits beside the name because the name alone means nothing to a first-time
    // reader — it is what tells them whether to trust the piece.
    author: z.string(),
    authorRole: z.string(),
    // The kicker above the headline on both the listing and the article — "Tax",
    // "Payroll", "Firm news". Free text rather than an enum: the set is small
    // now, but locking it down would mean a schema change to publish a piece on
    // a subject the practice has not written about before.
    topic: z.string(),
  }),
});

export const collections = { services, team, news };

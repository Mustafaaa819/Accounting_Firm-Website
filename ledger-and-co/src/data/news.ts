/**
 * Shared helpers for the news collection.
 *
 * Both /news and /news/[slug] format the same dates and sort the same list, and
 * they must not drift — a listing that says "05 Aug 2026" over an article that
 * says "4 August 2026" is the kind of bug nobody notices until a client does.
 */

/**
 * Every formatter is pinned to UTC on purpose.
 *
 * `z.coerce.date()` parses the bare `2026-08-04` in frontmatter as UTC
 * midnight. Formatting that in a build machine's local timezone renders it as
 * the 3rd anywhere west of Greenwich, so the published date would depend on
 * where the site happened to be built. Pinning to UTC makes the frontmatter
 * date and the rendered date the same date, everywhere.
 */
const LONG = new Intl.DateTimeFormat('en-GB', {
  day: 'numeric',
  month: 'long',
  year: 'numeric',
  timeZone: 'UTC',
});

/** Two-digit day so the dates stack into a true column beside the headlines. */
const SHORT = new Intl.DateTimeFormat('en-GB', {
  day: '2-digit',
  month: 'short',
  year: 'numeric',
  timeZone: 'UTC',
});

/** "4 August 2026" — for the article byline. */
export const formatLong = (date: Date): string => LONG.format(date);

/** "04 Aug 2026" — for the listing column. */
export const formatShort = (date: Date): string => SHORT.format(date);

/** The `datetime` attribute value for `<time>`; must be a machine date, not prose. */
export const machineDate = (date: Date): string => date.toISOString().slice(0, 10);

/**
 * Sort comparator, newest first. Passed to `.sort()` rather than applied here so
 * the caller keeps control of the array it owns.
 */
export const byNewest = (
  a: { data: { date: Date } },
  b: { data: { date: Date } },
): number => b.data.date.valueOf() - a.data.date.valueOf();

/**
 * Rough reading time in minutes from the raw Markdown body.
 *
 * 220 wpm is the usual figure for considered non-fiction, and the Markdown
 * syntax left in the count (`##`, `-`, link brackets) is noise small enough at
 * this length not to move the rounded minute. Floored at 1 so a short firm
 * announcement never reads "0 min".
 */
export function readingTime(body: string | undefined): number {
  const words = (body ?? '').trim().split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.round(words / 220));
}

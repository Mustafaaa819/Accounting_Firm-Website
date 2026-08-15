/**
 * The practice's history, as data.
 *
 * PLACEHOLDER firm particulars — the same status as the footer's address block
 * and the figures column on /who-we-are. Every number here is load-bearing:
 * the headcount and client count at the end of this array are the ones those
 * two pages print, and the dates are the ones the team bios and the Manchester
 * announcement in /news refer back to. Change one and check the others.
 *
 * Kept in src/data rather than a content collection because there is exactly
 * one consumer (/history) and no editorial workflow around it — a collection
 * would buy a schema and a loader for a list that changes once a year.
 */

export interface MilestoneStat {
  label: string;
  /** Rendered with `.nums`, so these stack into a column across the cards. */
  value: string;
}

export interface Milestone {
  /** Display year. Kept short — it is set at display size beside the rail. */
  year: string;
  /** Machine date for `<time datetime>`; a year alone is valid ISO 8601. */
  datetime: string;
  title: string;
  /** One paragraph. Long enough to say something, short enough to read stood up. */
  body: string;
  /**
   * Headcount and client count at that point, so the growth is checkable down
   * the page rather than asserted once at the end. Both are quoted on every
   * milestone on purpose: a gap in the column would read as a bad year rather
   * than as missing data.
   */
  stats: [MilestoneStat, MilestoneStat];
}

export const milestones: Milestone[] = [
  {
    year: '1998',
    datetime: '1998',
    title: 'Two people, one borrowed desk',
    body: 'Amara Oyelaran left the group financial controller’s chair at a listed packaging business and started the practice on the first floor above a locksmith on Leather Lane, with Stephen Rowe — eleven years in the tax department of a Croydon firm — on the other side of a desk they had been lent. Nine of the first eleven clients had been suppliers or customers of the group she had just left. Fee income that first year was £61,000. Six of those eleven are still with us.',
    stats: [
      { label: 'People', value: '2' },
      { label: 'Clients', value: '11' },
    ],
  },
  {
    year: '2003',
    datetime: '2003-03',
    title: 'Registered to carry out audit work',
    body: 'Audit registration came through from the ICAEW in March. The first opinion we signed was on a corrugated-packaging manufacturer in Kent turning over £4.2 million, and the stock count took two of us two days in an unheated warehouse between Christmas and the new year. That is still roughly how audit works here, and audit is now about a third of the practice’s fee income.',
    stats: [
      { label: 'People', value: '9' },
      { label: 'Clients', value: '48' },
    ],
  },
  {
    year: '2009',
    datetime: '2009',
    title: 'The recession changed how we charge',
    body: 'Eleven clients went into administration between October 2008 and the end of 2009, and four more we resigned from because they could not pay. Nobody here was made redundant; the two partners took nothing for the first quarter of 2009, which is the only reason that sentence is true. We came out of it having changed one thing for good: every engagement since has been quoted as a written scope at a fixed fee, agreed before the work starts. Billing by the hour rewards the slowest way of doing the job.',
    stats: [
      { label: 'People', value: '14' },
      { label: 'Clients', value: '71' },
    ],
  },
  {
    year: '2014',
    datetime: '2014',
    title: 'Off the desktop ledger, onto the cloud',
    body: 'We moved the first forty clients onto cloud bookkeeping in 2014 and finished the last stubborn one in 2016 — a haulage business whose ledger lived on a machine under the transport manager’s desk. The software was never the point. The point was that a client’s numbers stopped being something we saw once a year in a carrier bag, and started being something we could look at on a Tuesday in March and ring them about. When Making Tax Digital for VAT arrived in 2019 it was, for our clients, a Tuesday.',
    stats: [
      { label: 'People', value: '19' },
      { label: 'Clients', value: '96' },
    ],
  },
  {
    year: '2017',
    datetime: '2017',
    title: 'We stopped sending the tax work out',
    body: 'For nineteen years the R&D claims and the share-scheme work went to a firm in the City who did it well and charged accordingly. Tom Whitfield joined from a Big Four transactions tax team that summer and we stopped. Thirty-one R&D claims went out in the first full year, all of them written by the person who would answer for them if HMRC asked. Stephen Rowe stepped back to consultancy the same year and retired properly in 2019.',
    stats: [
      { label: 'People', value: '21' },
      { label: 'Clients', value: '124' },
    ],
  },
  {
    year: '2021',
    datetime: '2021',
    title: 'Payroll stopped being a favour',
    body: 'Payroll had grown up as something we did for audit clients who asked nicely, which is a bad way to run a service that has to be right on a fixed day every month. Priya Raghunathan came in to run it as a department, and rebuilt auto-enrolment around a client with 340 staff across four pension schemes — a process that has held for every client since. The same year Daniel Osei took over the owner-managed business portfolio in London.',
    stats: [
      { label: 'People', value: '22' },
      { label: 'Clients', value: '151' },
    ],
  },
  {
    year: '2026',
    datetime: '2026-05',
    title: 'A second office, on Booth Street',
    body: 'A third of our clients are outside the South East and about half of those are within an hour of Manchester, which we had been serving over video calls for six years. Booth Street opened in May with four people in it — three who asked to move, one new client manager — and two more join them in September. Daniel Osei leads it. London is unchanged and is not shrinking: the three who moved were replaced.',
    stats: [
      { label: 'People', value: '26' },
      { label: 'Clients', value: '180' },
    ],
  },
];

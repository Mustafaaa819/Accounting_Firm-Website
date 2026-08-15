/**
 * The firm's offices, in one place.
 *
 * PLACEHOLDER particulars — every address, number and mailbox below is invented
 * and has to be swapped for the real ones before launch. They live here rather
 * than in the three components that print them (SiteFooter, /contact, and the
 * closing bands) because a phone number that is right in the footer and stale
 * on the contact page is worse than one that is wrong in both.
 *
 * Order matters: the first entry is the head office and is what the footer and
 * any single-office context prints.
 */
export interface Office {
  /** Machine value — also the submitted value of the contact form's selector. */
  id: string;
  city: string;
  /** Printed under the city, e.g. "Head office". */
  role: string;
  /** Street lines, printed one per line inside an <address>. */
  lines: string[];
  phone: string;
  phoneHref: string;
  email: string;
  /** Opening hours, as one line of prose. */
  hours: string;
  /** One sentence of orientation — what a visitor needs that a map will not tell them. */
  directions: string;
}

export const offices: Office[] = [
  {
    id: 'london',
    city: 'London',
    role: 'Head office',
    lines: ['14 Bishopsgate Court', 'London EC2N 4BQ', 'United Kingdom'],
    phone: '+44 20 7123 4567',
    phoneHref: 'tel:+442071234567',
    email: 'london@ledgerandco.example',
    hours: 'Monday to Friday, 9am–5.30pm',
    directions:
      'Four minutes from Liverpool Street, on the courtyard behind the churchyard. The entrance is the black door beside the sandwich shop — press 3 for reception.',
  },
  {
    id: 'manchester',
    city: 'Manchester',
    role: 'Opened 2026',
    lines: ['3 Booth Street', 'Manchester M2 4AW', 'United Kingdom'],
    phone: '+44 161 496 0180',
    phoneHref: 'tel:+441614960180',
    email: 'manchester@ledgerandco.example',
    hours: 'Monday to Friday, 9am–5.30pm',
    directions:
      'Two minutes from St Peter’s Square, between Cross Street and Albert Square. Second floor; the lift is past the reception desk on the left.',
  },
];

/** The head office. Used wherever there is only room to print one. */
export const headOffice = offices[0];

/**
 * The general mailbox, for anyone who does not know which office they want.
 * Deliberately not one of the per-office addresses — this one is monitored by
 * the front desk in both.
 */
export const GENERAL_EMAIL = 'hello@ledgerandco.example';

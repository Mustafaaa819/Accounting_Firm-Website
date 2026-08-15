/**
 * Site navigation, shared by SiteHeader and SiteFooter.
 *
 * One array rather than two copies: the header and the footer must never drift,
 * and the mobile drawer renders the same list a third time.
 */
export interface NavLink {
  href: string;
  label: string;
}

/**
 * `Who We Are` points at /who-we-are, which is where the page was built — the
 * collection is still called `team`, but the route is named for the visitor
 * rather than for the data. Change the href here, not in the components, if the
 * page moves again.
 */
export const primaryNav: NavLink[] = [
  { href: '/', label: 'Home' },
  { href: '/services', label: 'Services' },
  { href: '/news', label: 'News' },
  { href: '/who-we-are', label: 'Who We Are' },
  { href: '/history', label: 'History' },
  { href: '/contact', label: 'Contact' },
];

/**
 * Exact Online's hosted client portal. This is a genuine link-out to a
 * third-party system — the site never collects credentials itself, so there is
 * no login form anywhere in this codebase and there should not be one.
 */
export const CLIENT_LOGIN_URL =
  'https://start.exactonline.com/docs/CustomerLogin.aspx';

/**
 * Marks the current page for `aria-current` and the active-link rule.
 * `/` has to match exactly, or it would light up on every route.
 */
export function isCurrentPath(pathname: string, href: string): boolean {
  const path = pathname.replace(/\/+$/, '') || '/';
  if (href === '/') return path === '/';
  return path === href || path.startsWith(`${href}/`);
}

/**
 * Run a navigation inside a view transition when the browser supports one.
 *
 * The map's "zoom into a region" effect is entirely this plus a shared
 * `view-transition-name` on the card and the region header (see
 * `viewTransitionName` below). Browsers without the API — and anyone who has
 * asked for reduced motion — get a plain instant navigation, which is a clean
 * fallback rather than a broken one.
 */
type StartViewTransition = (callback: () => void) => { finished: Promise<void> };

export function withTransition(navigate: () => void): void {
  const start = (document as Document & { startViewTransition?: StartViewTransition }).startViewTransition;
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  if (!start || reduced) {
    navigate();
    return;
  }
  start.call(document, navigate);
}

/**
 * The shared name that ties a region's map card to that region's page header.
 * Must be a valid CSS custom-ident, so slugs are prefixed rather than used raw.
 */
export function viewTransitionName(slug: string): string {
  return `region-${slug}`;
}

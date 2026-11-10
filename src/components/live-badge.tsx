/** A visible text label as well as a dot, so live state never depends on color. */
export function LiveBadge() {
  return <span className="live-badge"><span className="live-badge-dot" aria-hidden="true" />LIVE</span>;
}

const DAY_MS = 24 * 60 * 60 * 1000;

// "new today" = first seen within the last 24 hours.
export function isNewToday(firstSeenAt, now = Date.now()) {
  if (!firstSeenAt) return false;
  const t = new Date(firstSeenAt).getTime();
  if (Number.isNaN(t)) return false;
  return now - t < DAY_MS;
}

export function relativeDay(value) {
  if (!value) return '';
  const t = new Date(value).getTime();
  if (Number.isNaN(t)) return '';
  const days = Math.floor((Date.now() - t) / DAY_MS);
  if (days <= 0) return 'today';
  if (days === 1) return '1d ago';
  if (days < 30) return `${days}d ago`;
  return new Date(t).toISOString().slice(0, 10);
}

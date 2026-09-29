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

// The moment itself, for a line that has to tell two events on the same day
// apart: a version list, or "Applied" on a chat card. "30 Sep, 2:05 pm", in
// the person's own time zone. Written out by hand rather than through Intl,
// whose month names and spaces differ from one ICU build to the next.
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export function shortStamp(value) {
  if (!value) return '';
  const t = new Date(value);
  if (Number.isNaN(t.getTime())) return '';
  const hour = t.getHours();
  const minute = String(t.getMinutes()).padStart(2, '0');
  return `${t.getDate()} ${MONTHS[t.getMonth()]}, ${hour % 12 || 12}:${minute} ${hour < 12 ? 'am' : 'pm'}`;
}

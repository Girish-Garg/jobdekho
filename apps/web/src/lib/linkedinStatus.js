import { refreshedAgo } from './refreshStatus.js';

const MINUTE_MS = 60 * 1000;
const HOUR_MS = 60 * MINUTE_MS;

// "Fri 3 Oct", in the person's own time zone. Written out by hand rather
// than through Intl, for the reason time.js gives.
const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export function shortDay(value) {
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '';
  return `${DAYS[d.getDay()]} ${d.getDate()} ${MONTHS[d.getMonth()]}`;
}

const until = (at, now) => {
  const gap = Math.max(0, Date.parse(at) - now);
  return gap < HOUR_MS ? `${Math.max(1, Math.round(gap / MINUTE_MS))} min` : `${Math.round(gap / HOUR_MS)} h`;
};

// The line under Include LinkedIn: where the server's guard stands (see its
// api/scrape.js: `linkedin` is { lastSweepAt, pausedUntil, nextAfter }), or
// that it is off. `paused` marks the one state worth the person's notice.
export function linkedinStatus(on, status, now = Date.now()) {
  if (!on) return { text: 'Off', paused: false };
  if (!status) return { text: '', paused: false };
  if (status.pausedUntil) {
    return { text: `Paused until ${shortDay(status.pausedUntil)}: LinkedIn refused the last read`, paused: true };
  }
  if (!status.lastSweepAt) return { text: 'Not read yet: the next refresh reads it', paused: false };
  const read = `Read ${refreshedAgo(status.lastSweepAt, now)}`;
  if (!status.nextAfter) return { text: `${read}, next with the next refresh`, paused: false };
  return { text: `${read}, next after ${until(status.nextAfter, now)}`, paused: false };
}

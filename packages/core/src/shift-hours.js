// The working hours a line states ("Shift timings: 2 PM to 11 PM IST"),
// when they fall where a fresher would want to know: into the night, late
// into the evening, or before seven in the morning. Daytime hours ("9:30
// AM to 6:30 PM", "General shift") are what everyone expects, and say
// nothing worth a line of their own.
const ZONE = '(?:\\s*(?:IST|EST|EDT|PST|PDT|CST|CDT|GMT|BST|CET|ET|PT))?'
const RANGE = `\\b(\\d{1,2})(?:[:.](\\d{2}))?\\s*(am|pm|noon)?${ZONE}\\s*(?:-|\u2013|\u2014|to|till|until)\\s*(\\d{1,2})(?:[:.](\\d{2}))?\\s*(am|pm|noon)\\b`

function hourOf(h, minutes, meridiem) {
  if (/noon/i.test(meridiem)) return 12 + minutes / 60
  return (Number(h) % 12) + (/pm/i.test(meridiem) ? 12 : 0) + minutes / 60
}

function clock(hour) {
  const h = Math.floor(hour) % 24
  const m = Math.round((hour - Math.floor(hour)) * 60)
  const shown = h % 12 === 0 ? 12 : h % 12
  return `${shown}${m ? `:${String(m).padStart(2, '0')}` : ''} ${h < 12 ? 'AM' : 'PM'}`
}

// A start with no AM or PM of its own takes the end's ("1-10 PM"), unless
// that would put it after the end: then it is the morning before a PM end
// ("11 - 8 pm") or the evening before an AM one ("10 - 6 am"). A span
// shorter than three hours (a call, an event) or longer than thirteen (a
// typing slip, "12 AM to 9 PM") is not a working day, and reads as nothing.
function hoursOf(m) {
  const end = hourOf(m[4], Number(m[5] ?? 0), m[6])
  let start = hourOf(m[1], Number(m[2] ?? 0), m[3] || m[6])
  if (!m[3] && start > end) start = start - 12 >= 0 ? start - 12 : start + 12
  const span = end < start ? end + 24 - start : end - start
  if (span < 3 || span > 13) return null
  return { start, end, text: `${clock(start)} to ${clock(end)}` }
}

// Every working day a line states, in its order: [{ start, end, text }] in
// hours from midnight. "12 PM to 9 PM and / or 2 PM to 11 PM" is two.
export function statedHours(line) {
  return [...String(line ?? '').matchAll(new RegExp(RANGE, 'gi'))].map(hoursOf).filter(Boolean)
}

// 'Night shift', 'Late shift', 'Early shift', or null for daytime hours.
// `night` is the line naming a night shift itself, which a range ending
// at 1 AM would otherwise read only as late.
export function hoursKind({ start, end }, { night = false } = {}) {
  const overnight = end < start
  if (night || (overnight && end > 1) || start >= 20 || start < 4) return 'Night shift'
  if (overnight || end >= 21) return 'Late shift'
  if (start < 7) return 'Early shift'
  return null
}

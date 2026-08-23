// Text repairs for rows the adapters can no longer reach. A posting that has
// scrolled off the pages a source lists is never re-fetched, so whatever the
// old parser wrote is what it keeps unless it is fixed here.

// Old Internshala snippets open by repeating the card header:
// "<title> <company> Actively hiring <location> <stipend> <duration>".
const STALE_HEADER = /^.*?Actively hiring\s*/s

export function cleanSnippet(row) {
  const text = row.descriptionSnippet || ''
  if (!/Actively hiring/.test(text)) return text
  let out = text.replace(STALE_HEADER, '')
  for (const part of [row.location, row.stipend, row.duration]) {
    if (part) out = out.replace(part, ' ')
  }
  return out.replace(/\s+/g, ' ').trim()
}

// "₹ 3,00,000 - 4,50,000 ₹ 3,00,000 - 4,50,000 /year" - the old parser read both
// halves of a responsive card. The second copy is kept: it carries the unit.
export function cleanStipend(value) {
  const parts = String(value || '').split('₹').map((s) => s.trim()).filter(Boolean)
  if (parts.length !== 2 || !parts[1].startsWith(parts[0])) return value
  return `₹ ${parts[1]}`
}

// Internshala encodes the listing category in the URL. For an orphaned row that
// is the only surviving evidence of what the card said.
export function levelFromUrl(row) {
  if (row.source !== 'internshala') return null
  return /\/internship\//.test(row.url || '') ? 'internship' : null
}

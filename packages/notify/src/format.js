// Widening a filter can make thousands of already-stored postings look new in a
// single run. Past this many, the chat is unreadable, so the rest become a count.
export const MAX_ALERTS = 30

export function formatPosting(p) {
  const level = p.level && p.level !== 'mid' ? ` [${p.level}]` : ''
  const loc = p.location ? ` - ${p.location}` : ''
  return `NEW: ${p.title}${level}\n${p.company}${loc}\n${p.url}`
}

export function formatOverflow(count) {
  return `...and ${count} more. Open the dashboard to see the rest.`
}

export function formatBatch(items) {
  return items.map(formatPosting).join('\n\n')
}

export function chunk(arr, size) {
  const out = []
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size))
  return out
}

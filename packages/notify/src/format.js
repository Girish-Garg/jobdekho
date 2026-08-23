// Widening a filter can make thousands of already-stored postings look new in a
// single run. Past this many, the chat is unreadable, so the rest become a count.
export const MAX_ALERTS = 30

// Telegram's sendMessage rejects the whole request over this many characters.
// A fixed postings-per-message count is a guess at what fits; measuring the
// actual formatted length is what a longer format string cannot silently break.
export const TELEGRAM_MESSAGE_LIMIT = 4096

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

// Packs postings into groups that each format (via formatBatch's "\n\n" join)
// to under the Telegram limit, instead of guessing a fixed count per message.
// A single posting that alone exceeds the limit still goes out alone: there is
// no smaller unit to split it into, so it is sent as the best available effort.
export function packBatches(items, limit = TELEGRAM_MESSAGE_LIMIT) {
  const batches = []
  let current = []
  let length = 0
  for (const item of items) {
    const size = formatPosting(item).length
    const withItem = current.length === 0 ? size : length + 2 + size
    if (current.length > 0 && withItem > limit) {
      batches.push(current)
      current = [item]
      length = size
    } else {
      current.push(item)
      length = withItem
    }
  }
  if (current.length > 0) batches.push(current)
  return batches
}

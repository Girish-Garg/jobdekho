export function formatPosting(p) {
  const loc = p.location ? ` - ${p.location}` : ''
  return `NEW: ${p.title}\n${p.company}${loc}\n${p.url}`
}

export function formatBatch(items) {
  return items.map(formatPosting).join('\n\n')
}

export function chunk(arr, size) {
  const out = []
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size))
  return out
}

export function dedupe(postings, existingIds) {
  const seen = new Set(existingIds)
  const byId = new Map()
  const fresh = []
  for (const post of postings) {
    if (byId.has(post.id)) continue
    byId.set(post.id, post)
    if (!seen.has(post.id)) fresh.push(post)
  }
  return { all: [...byId.values()], fresh }
}

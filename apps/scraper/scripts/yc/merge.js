// Verified YC boards into config/companies.json: a new board is added with
// the company's name and a "YC <batch>" tag; a board already listed keeps its
// entry and gains the tag. The same board is the same provider and slug,
// whatever the case: Ashby answers to "Deepgram" and "deepgram" alike.
const keyOf = (entry) => `${entry.provider}:${String(entry.slug ?? entry.url ?? '').toLowerCase()}`

export function mergeCandidates(config, candidates) {
  const providers = [...(config.providers || [])]
  const index = new Map(providers.map((entry, i) => [keyOf(entry), i]))
  const added = []
  const tagged = []
  for (const { entry, name, batch } of candidates) {
    const tag = `YC ${batch}`
    const at = index.get(keyOf(entry))
    if (at !== undefined) {
      const tags = providers[at].tags || []
      if (!tags.includes(tag)) {
        providers[at] = { ...providers[at], tags: [...tags, tag] }
        tagged.push(providers[at])
      }
      continue
    }
    const next = { ...entry, company: name, tags: [tag] }
    index.set(keyOf(next), providers.length)
    providers.push(next)
    added.push(next)
  }
  return { config: { ...config, providers }, added, tagged }
}

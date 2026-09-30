// A config entry may carry tags that belong on every posting its board sends
// ("YC W21", for a Y Combinator company found by apps/scraper/scripts/yc).
// They join each raw posting's own tags, so they reach the store through
// normalize() like any tag a board sets, without every provider knowing
// about them. The adapter object itself is kept (its fetch is wrapped in
// place), because the run reads what an adapter sets on itself during a
// fetch: a note, whether it listed everything.
export function withTags(adapter, tags) {
  const extra = (Array.isArray(tags) ? tags : []).map(String).filter(Boolean)
  if (!extra.length) return adapter
  const inner = adapter.fetch.bind(adapter)
  adapter.fetch = async (http, context) =>
    (await inner(http, context)).map((raw) => ({ ...raw, tags: [...new Set([...(raw.tags || []), ...extra])] }))
  return adapter
}

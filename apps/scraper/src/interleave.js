// The config lists sources grouped by platform: 55 Greenhouse boards, then
// the Lever ones, and so on. Taken in that order, the pool's 8 workers would
// all queue on one host (see the sources' host-gate.js) while every other
// host sat idle. Taking one source from each group in turn keeps them on
// different hosts. Only the order of the work changes: the run still reports
// its sources in the config's order.
//
// An adapter may name the host it lives on (`hostKey`, as Workday's does, one
// per data centre); otherwise the platform in its name stands for it.
export const groupOf = (adapter) => adapter?.hostKey || String(adapter?.name ?? '').split(':')[0]

// The indexes of `adapters`, round-robin across their groups.
export function interleave(adapters) {
  const groups = new Map()
  adapters.forEach((adapter, i) => {
    const key = groupOf(adapter)
    if (!groups.has(key)) groups.set(key, [])
    groups.get(key).push(i)
  })
  const queues = [...groups.values()]
  const longest = Math.max(0, ...queues.map((queue) => queue.length))
  const order = []
  for (let round = 0; round < longest; round++) {
    for (const queue of queues) if (round < queue.length) order.push(queue[round])
  }
  return order
}

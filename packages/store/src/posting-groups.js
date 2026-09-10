import { groupOrder } from './posting-order.js'

// One role listed in six cities is six real postings, not a duplicate to
// delete. The grid shows the best of each and says how many there are, so the
// count has to come from the whole matching set rather than from one page,
// which is why this runs over the filtered rows and before any slicing.
// Falling back to the id matters: a row with no groupKey must be its own
// group, or every unkeyed row collapses into a single group of thousands.
//
// groupSourceCount is the ghost "blast" signal and counts distinct SOURCES,
// not rows. groupCount cannot carry it: an employer hiring in six offices is
// six rows on one board, while the same role reprinted on six boards is the
// thing worth flagging, and only the source count tells those apart.
export function withGroupWindows(rows) {
  const groups = new Map()
  for (const row of rows) {
    const key = row.groupKey ?? row.id
    if (!groups.has(key)) groups.set(key, [])
    groups.get(key).push(row)
  }
  const out = []
  for (const members of groups.values()) {
    members.sort(groupOrder)
    const groupSourceCount = new Set(members.map((row) => row.source)).size
    members.forEach((row, i) => {
      out.push({ ...row, groupCount: members.length, groupRank: i + 1, groupSourceCount })
    })
  }
  return out
}

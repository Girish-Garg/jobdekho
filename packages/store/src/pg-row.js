import { toIso } from './timestamp.js'

// A Postgres export arrives with the column names the schema used, plus the
// legacy `status` column the dashboard never read (a posting's status is per
// user and lives in statuses.json). Only the names change: the values are
// already what the corpus stores. The timestamps are re-canonicalised so the
// string ordering every sort relies on (see timestamp.js) holds for rows
// that arrived from outside rather than through toRow().
const TIMESTAMPS = ['postedAt', 'firstSeenAt', 'lastSeenAt']
const DROPPED = new Set(['status'])

const camel = (name) => name.replace(/_([a-z])/g, (_, c) => c.toUpperCase())

export function fromPgRow(exported) {
  const row = {}
  for (const [key, value] of Object.entries(exported)) {
    if (DROPPED.has(key)) continue
    row[camel(key)] = value
  }
  for (const key of TIMESTAMPS) row[key] = toIso(row[key])
  return row
}

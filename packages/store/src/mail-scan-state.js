import { toIso } from './timestamp.js'

// Where the mail scan has got to (see the server's mail-scan/run.js), in
// mail-scan.json: when the first scan finished, when the last one did, and
// the ids of the mails already read, so a scan that looks back over days it
// has seen (it always takes two days of overlap) reads none of them twice.
// Only ids: nothing a mail said is kept here.
//
//   { firstAt, lastAt, seen: [messageId], found, unsure }
const MAX_SEEN = 20000

export function getScanState(store, userId) {
  const record = store.mailScan.get(userId)
  return {
    firstAt: toIso(record?.firstAt) ?? null,
    lastAt: toIso(record?.lastAt) ?? null,
    seen: Array.isArray(record?.seen) ? record.seen : [],
    found: Number.isInteger(record?.found) ? record.found : 0,
    unsure: Number.isInteger(record?.unsure) ? record.unsure : 0,
  }
}

//   scan: { at, seen: [ids read this time], found, unsure }
export function noteScan(store, userId, scan) {
  const state = getScanState(store, userId)
  const seen = [...new Set([...state.seen, ...scan.seen])].slice(-MAX_SEEN)
  store.mailScan.set(userId, {
    firstAt: state.firstAt ?? toIso(scan.at),
    lastAt: toIso(scan.at),
    seen,
    found: state.found + (scan.found ?? 0),
    unsure: scan.unsure ?? 0,
  })
}

// "Scan all my mail again": forget where it got to, so the next scan reads
// the whole mailbox; what is already in the Tracker stays, and no mail is
// added twice (each line knows its mail).
export const resetScan = (store, userId) => store.mailScan.remove(userId)

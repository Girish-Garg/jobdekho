// One JSON document per line. A single JSON array would have to be parsed
// whole before the first row is usable and cannot be inspected with grep or
// head; a line per posting can, and it is what a database export already
// looks like, so the corpus and the import share one reader.
//
// A line that does not parse throws rather than being skipped. Every write
// through atomic-write.js leaves the file whole, so a broken line means
// someone edited it by hand, and dropping their postings silently would hide
// the mistake instead of pointing at it.
export function parseNdjson(text) {
  const rows = []
  for (const line of text.split('\n')) {
    if (line.trim() === '') continue
    rows.push(JSON.parse(line))
  }
  return rows
}

export function toNdjson(rows) {
  return rows.map((row) => `${JSON.stringify(row)}\n`).join('')
}

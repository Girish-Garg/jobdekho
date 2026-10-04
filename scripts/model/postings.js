import { readFileSync, statSync } from 'node:fs'
import { basename, join } from 'node:path'
import { tagRow } from '@jobdekho/core/retag.js'
import { companyKey } from '@jobdekho/core/company-key.js'
import { dataHome } from '@jobdekho/server/cli/data-home.js'

// The postings the models learn from: the maintainer's own scrapes of
// public job boards, read and never written. With no files named, the
// corpus the app itself keeps on this machine.
export const defaultFiles = () => [join(dataHome(), 'postings.ndjson')]

function rowsOf(file) {
  const rows = []
  for (const line of readFileSync(file, 'utf8').split('\n')) {
    if (!line.trim()) continue
    try {
      rows.push(JSON.parse(line))
    } catch {
      // A torn last line of a file being written is skipped, not fatal.
    }
  }
  return rows
}

// Every distinct posting, tagged by today's step 1 rules: by id, the
// earlier file winning, then by ad, since the same ad copied under another
// id or company would otherwise sit on both sides of a split.
//
//   postings: [{ id, source, title, company, companyKey, description,
//                level, levelTag }]
//   files:    [{ file, date, rows, added }] for the metrics
export function loadPostings(paths) {
  const byId = new Map()
  const files = []
  for (const path of paths) {
    const rows = rowsOf(path)
    let added = 0
    for (const row of rows) {
      if (row?.id && !byId.has(row.id)) {
        byId.set(row.id, row)
        added += 1
      }
    }
    files.push({ file: basename(path), date: statSync(path).mtime.toISOString().slice(0, 10), rows: rows.length, added })
  }
  const byAd = new Map()
  for (const raw of byId.values()) {
    const row = tagRow(raw)
    const key = row.adKey ?? `id:${row.id}`
    if (byAd.has(key)) continue
    byAd.set(key, {
      id: row.id, source: row.source ?? '', title: row.title ?? '', company: row.company ?? '',
      companyKey: companyKey(row.company), description: row.descriptionText || '',
      level: row.level ?? null, levelTag: row.levelTag ?? null,
    })
  }
  return { postings: [...byAd.values()], files }
}

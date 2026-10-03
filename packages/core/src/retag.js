import { TAGS_VERSION } from './tag.js'
import { tagsFor } from './tagging.js'
import { storedBoard } from './board-fields.js'
import { withTitleLevel } from './posting-features.js'

// A stored posting tagged by today's rules, from what it kept: its title,
// its text, the board's own fields, and its pay field when that came from
// the board. Pay a description stated (payTag.from 'text') is read again
// from that description rather than kept as if the board had given it.
export function tagRow(row) {
  const board = storedBoard(row)
  const tagged = tagsFor({
    title: row.title ?? '',
    description: row.descriptionText || '',
    company: row.company ?? '',
    source: row.source ?? '',
    board,
    location: row.location ?? '',
    tags: row.tags ?? [],
    experience: row.experience ?? null,
    experienceYears: row.experienceYears ?? null,
    stipend: row.payTag?.from === 'text' ? null : row.stipend ?? null,
  })
  return { ...row, board, ...tagged, features: withTitleLevel(row.features, row.title) }
}

// Only rows tagged under an older version, so calling this on every load
// costs a version check once the corpus is current. A row the rules cannot
// read (a hand-edited file) loads as it was rather than failing the corpus.
export function retagged(row) {
  if (!row || row.tagsVersion === TAGS_VERSION) return row
  try {
    return tagRow(row)
  } catch {
    return row
  }
}

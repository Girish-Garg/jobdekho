import { TAGS_VERSION } from './tag.js'
import { tagsFor } from './tagging.js'
import { storedBoard } from './board-fields.js'
import { withTitleLevel } from './posting-features.js'
import { levelEstimateFields } from './model/estimate-fields.js'
import { shippedModel } from './model/weights.js'

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
  return { ...row, board, ...tagged, features: withTitleLevel(row.features, row.title, row.company ?? '') }
}

// Only rows tagged under an older version of the rules, or estimated by an
// older level model, so calling this on every load costs a version check or
// two once the corpus is current; with no level model shipped, a current
// row is never touched. A newer model alone only estimates again: the
// rules' tags it would leave as they are. A row the rules cannot read (a
// hand-edited file) loads as it was rather than failing the corpus.
export function retagged(row, levelModel = shippedModel('level')) {
  if (!row) return row
  const tagsCurrent = row.tagsVersion === TAGS_VERSION
  if (tagsCurrent && (!levelModel || row.modelVersion === levelModel.version)) return row
  try {
    if (!tagsCurrent) return tagRow(row)
    const posting = { title: row.title ?? '', company: row.company ?? '', description: row.descriptionText || '' }
    return { ...row, ...levelEstimateFields(posting, row.levelTag ?? null, levelModel) }
  } catch {
    return row
  }
}

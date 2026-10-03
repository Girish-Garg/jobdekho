import { tag } from './tag.js'
import { boardTypeEvidence } from './board-fields.js'

// Internship or job, as a tag. An internship level, whatever decided it, is
// an internship: "Architecture Internship" filed in a board's list of jobs
// is still an internship, and a type that disagreed with its own level
// would gate the fit one way and show a chip the other. Otherwise the
// board's filing stands, and with no filing the type is unknown; the stored
// `type` then reads 'job', which holds nothing back.
export function typeTag({ level = null, board = null, source = '' } = {}) {
  if (level?.value === 'internship') return tag('internship', level.from, level.evidence)
  if (board?.type === 'job') return tag('job', 'board', boardTypeEvidence(board, source))
  return null
}

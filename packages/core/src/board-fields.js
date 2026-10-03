import { WORK_MODES } from './work-mode.js'

// What the board itself declared about a posting, kept on the stored row so
// that tagging it again later starts from the same evidence:
//
//   { type: 'internship' | 'job' | null, employment: string | null,
//     workMode: 'remote' | 'hybrid' | 'onsite' | null }
//
// `type` is how the board filed it (a list of internships, an employment
// type of Intern or Full-time); `employment` is the board's own words for
// that, when it gave any.
export function boardOf(raw) {
  const type = raw?.level === 'internship' ? 'internship' : ['internship', 'job'].includes(raw?.type) ? raw.type : null
  return {
    type,
    employment: typeof raw?.employment === 'string' && raw.employment.trim() ? raw.employment.trim() : null,
    workMode: WORK_MODES.includes(raw?.workMode) ? raw.workMode : null,
  }
}

const sourceOf = (row) => String(row?.source || '').split(':')[0]

// Rows stored before the board's word was kept still show it where the
// board's own list put it: Internshala's and Unstop's first tag is the list
// a posting came from, and Instahyre's internship links say so. Unstop's
// type is the fallback, as rows from before its tags were kept say nothing else.
const firstTag = (row) => (['internship', 'job'].includes(row.tags?.[0]) ? row.tags[0] : null)
const LISTED = {
  internshala: firstTag,
  unstop: (row) => firstTag(row) ?? (['internship', 'job'].includes(row.type) ? row.type : null),
  instahyre: (row) => (/-internship-at-/.test(row.url || '') ? 'internship' : 'job'),
}

export function storedBoard(row) {
  if (row?.board) return boardOf({ ...row.board, level: null })
  const listed = LISTED[sourceOf(row)]
  return { type: listed ? listed(row) : null, employment: null, workMode: null }
}

const NAMES = { internshala: 'Internshala', unstop: 'Unstop', instahyre: 'Instahyre', linkedin: 'LinkedIn' }

// Enum spellings ("FullTime", "full_time") read as words on a hover.
const spelled = (words) => words.replace(/[_/]+/g, ' ').replace(/([a-z])([A-Z])/g, '$1 $2').trim()

// The hover's words for the board's filing: its employment type as written,
// or the list it sat in.
export function boardTypeEvidence(board, source) {
  if (board.employment) return `Employment type: ${spelled(board.employment)}`
  const name = NAMES[String(source || '').split(':')[0]] ?? 'The board'
  return board.type === 'internship' ? `${name} lists it as an internship` : `${name} lists it as a job`
}

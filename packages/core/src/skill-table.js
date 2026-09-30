import { WEB_SKILLS } from './skill-table-web.js'
import { BACKEND_SKILLS } from './skill-table-backend.js'
import { DATA_SKILLS } from './skill-table-data.js'
import { OPS_SKILLS } from './skill-table-ops.js'

// The four domain tables as one index. The fit score reads skills out of
// postings through it, and the resume check reads spellings from it, so the
// two can never disagree about what "React" is.
export const SKILLS = new Map([...WEB_SKILLS, ...BACKEND_SKILLS, ...DATA_SKILLS, ...OPS_SKILLS]
  .map(([id, label, aliases, meta = {}]) => [id, {
    id, label, aliases,
    // A variant implies what it is a variant of, so kindOf joins implies.
    implies: [...(meta.kindOf ? [meta.kindOf] : []), ...(meta.implies ?? [])],
    kindOf: meta.kindOf ?? null,
    near: meta.near ?? {},
    generic: meta.generic ?? 1,
  }]))

// Plain spellings: the string aliases and the { text } of the others.
export const spellings = (skill) => skill.aliases.map((a) => (typeof a === 'string' ? a : a.text)).filter(Boolean)

export const SPELLING_ID = new Map([...SKILLS.values()].flatMap((s) => [s.id, ...spellings(s)].map((w) => [w, s.id])))

const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
// Word edges only where the alias has a word character there, so "c++" is
// found in "C++," and ".net" is not found inside "ASP.NET" (which has its own
// alias).
const edged = (a) => (/^\w/.test(a) ? '(?<!\\w)' : '(?<![\\w.])') + esc(a) + (/\w$/.test(a) ? '(?!\\w)' : '')

const plain = [...SKILLS.values()].flatMap((s) => s.aliases.filter((a) => typeof a === 'string').map((a) => [a, s.id]))

// Every plain alias in one pass, longest first: at any position the longest
// spelling wins, so "react native" is read before "react" and "java script"
// before "java". One alternation instead of a pass per alias is what keeps
// reading a whole corpus inside a scrape's budget.
export const PLAIN_RE = new RegExp(plain.sort((a, b) => b[0].length - a[0].length).map(([a]) => edged(a)).join('|'), 'gi')
export const PLAIN_ID = new Map(plain)

// The { re } aliases run after the plain pass, on what it left, because each
// is a short form of a spelling the plain pass already consumed ("JS" after
// "Node.js", "Go" after "Golang").
export const SPECIAL = [...SKILLS.values()].flatMap((s) => s.aliases
  .filter((a) => typeof a !== 'string' && a.re)
  .map((a) => ({ id: s.id, re: new RegExp(a.re.source, a.re.flags.includes('g') ? a.re.flags : `${a.re.flags}g`) })))

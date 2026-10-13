// One planned entry's bullets, read against the entry it claims to reword.
// The model says which of the entry's numbered bullets each rewording came
// from and which it dropped (see resume-tailor-prompt.js); what is kept here
// is the person's own TEXT for each, never the number, so a profile edited
// after the tailoring cannot point a choice at the wrong bullet.
//
//   bullets  the reworded bullets, as they will print
//   was      for each of them, the person's own bullets it reworded; empty
//            when the model did not say, and then nothing is shown beside it
//   dropped  the person's own bullets the resume leaves out
const MAX_BULLETS = 20
const MAX_BULLET = 400

const clean = (value) => (typeof value === 'string' ? value.trim().slice(0, MAX_BULLET) : '')

// Two spellings of one bullet: case, spacing and a closing full stop apart.
const same = (text) => String(text).toLowerCase().replace(/\s+/g, ' ').replace(/[.\s]+$/, '').trim()

// The model counts from 1; a number the entry has no bullet for is dropped.
function positions(value, count) {
  const list = Array.isArray(value) ? value : [value]
  const found = list.filter((n) => Number.isInteger(n) && n >= 1 && n <= count).map((n) => n - 1)
  return [...new Set(found)]
}

// A bullet given as plain text, the shape plans had before bullets were
// numbered, is paired only when it is one of the entry's own, word for word.
function kept(item, own) {
  if (typeof item !== 'string') return { text: clean(item?.text), from: positions(item?.from, own.length) }
  const at = own.findIndex((bullet) => same(bullet) === same(item))
  return { text: clean(item), from: at === -1 ? [] : [at] }
}

// A dropped bullet named by its number or, as plans once did, by its text.
// Text that is not one of the entry's own bullets names nothing.
function droppedAt(value, own) {
  const list = Array.isArray(value) ? value : []
  const found = list.map((item) => (typeof item === 'string' ? own.findIndex((bullet) => same(bullet) === same(item)) : positions(item, own.length)[0] ?? -1))
  return [...new Set(found.filter((at) => at !== -1))]
}

// { bullets, was, dropped } for one planned entry. When every rewording
// names its source, the entry's bullets no rewording names ARE left out,
// whether or not the model said so: that is what the resume will do, so it
// is what the person is shown. Otherwise only what the model listed counts.
export function readBullets(raw, original) {
  const own = (original.bullets ?? []).map(String)
  const list = (Array.isArray(raw?.bullets) ? raw.bullets : []).slice(0, MAX_BULLETS)
    .map((item) => kept(item, own)).filter((item) => item.text)
  const named = new Set(list.flatMap((item) => item.from))
  const paired = list.length > 0 && list.every((item) => item.from.length)
  const left = paired ? own.map((_, at) => at) : droppedAt(raw?.dropped, own)
  return {
    bullets: list.map((item) => item.text),
    was: list.map((item) => item.from.map((at) => own[at])),
    dropped: left.filter((at) => !named.has(at)).sort((a, b) => a - b).map((at) => own[at]),
  }
}

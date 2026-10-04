// The words both small models read. Training (scripts/model) and inference
// call these same functions, and the shipped weights were learned on their
// output: changing what they return changes every feature the weights know,
// so a change here needs the models trained again. model-tokens.test.js
// pins the output so such a change cannot slip through unnoticed.

// Words too common to say anything about a level or a section.
export const STOP = new Set(('the and for with to of in a an or is are on at be as this that from by it its our your you we '
  + 'will can may has have had not but if into about more most other such than then there these those through also been '
  + 'being do does each its just only own same so some too very all any who what which when where how their they them us').split(' '))

// Lower case, letters and digits with the + and # of C++ and C#. A bare
// number says nothing a model should learn ("5+" is a requirement the rules
// read, "2026" a year), so numbers alone are dropped; "l2" and "ic3" stay.
export const words = (text) => (String(text || '').toLowerCase().match(/[\p{L}\p{N}][\p{L}\p{N}+#]*/gu) || [])
  .filter((w) => !/^\d+\+?$/.test(w))

export const content = (text) => words(text).filter((w) => !STOP.has(w))

// Adjacent pairs, so "mentor engineers" and "junior engineers" differ.
export function pairs(list) {
  const out = []
  for (let i = 0; i + 1 < list.length; i++) out.push(`${list[i]} ${list[i + 1]}`)
  return out
}

// Where one unit of a description ends and the next begins: a sentence end
// before a capital, a bullet mark (dash, star, dot, and the en and em dashes
// some boards use, by code point), or "1." style numbering. The groups keep
// the separator, so a unit knows whether a bullet opened it.
const EDGE = /((?<=[.!?…])\s+(?=[A-Z(•*-])|\s+[-*•▪●\u2013\u2014]\s+|\s+\d{1,2}[.)]\s+)/
const BULLET = /^(?:[-*•▪●\u2013\u2014]|\d{1,2}[.)])\s*/

// A description as units in reading order: [{ text, bullet }]. A stored
// list item starts with "- "; a flattened body keeps its bullets inline.
export function units(text) {
  const out = []
  for (const line of String(text || '').split('\n').map((l) => l.trim()).filter(Boolean)) {
    const parts = line.split(EDGE)
    for (let i = 0; i < parts.length; i += 2) {
      const raw = parts[i].trim()
      // A sentence end leaves only spaces between units; a bullet or a
      // number leaves its mark.
      const bullet = BULLET.test(raw) || (i > 0 && /\S/.test(parts[i - 1]))
      const unit = raw.replace(BULLET, '').trim()
      if (unit.length > 1) out.push({ text: unit, bullet })
    }
  }
  return out
}

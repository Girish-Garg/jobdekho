import { content, pairs } from './tokens.js'

// What the section model reads of one line of a description: its own words,
// its first word ("Design", "Bachelor's", "We"), its length, whether it is a
// list item, where in the posting it sits, and its neighbours' words. It is
// trained with the headings taken out (scripts/model/section-data.js), so
// none of this is a heading; it is how the lines under one read.
//
// `lines` are a posting's lines in order, a list item starting with "- ".
const LIST = /^- /

const lengthBucket = (n) => (n < 4 ? 'xs' : n < 9 ? 's' : n < 20 ? 'm' : n < 40 ? 'l' : 'xl')

function neighbour(features, line, tag) {
  if (line === undefined) {
    features.set(`${tag}:#edge`, 0.3)
    return
  }
  const near = new Set(content(line.replace(LIST, '')))
  const value = 0.5 / Math.sqrt(near.size || 1)
  for (const w of near) features.set(`${tag}:${w}`, value)
}

// Map of feature name to value. "w:" the line's words and pairs, "f:" its
// first word, "p:" and "n:" the lines before and after it.
export function lineFeatures(lines, i) {
  const features = new Map()
  const own = content(lines[i].replace(LIST, ''))
  const names = new Set([...own, ...pairs(own)].map((w) => `w:${w}`))
  const value = 1 / Math.sqrt(names.size || 1)
  for (const name of names) features.set(name, value)
  if (own[0]) features.set(`f:${own[0]}`, 0.5)
  features.set(`len:${lengthBucket(own.length)}`, 0.5)
  if (LIST.test(lines[i])) features.set('list', 0.5)
  features.set(`pos:${Math.min(9, Math.floor((10 * i) / lines.length))}`, 0.5)
  neighbour(features, lines[i - 1], 'p')
  neighbour(features, lines[i + 1], 'n')
  return features
}

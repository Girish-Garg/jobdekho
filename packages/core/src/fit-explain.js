import { skillLabel } from './skill-find.js'
import { askedPhrase } from './experience-fit.js'

// Why a posting scored what it did, in the person's words rather than as a
// number: an opaque score is not trustworthy enough to sort a job hunt by.
// `why` is the structured form the fit card lays out (skills held, close and
// missing, the years asked, the place); `reasons` is the same judgement as
// short phrases, kept for every reader that knew only those; `gates` is each
// multiplier with its phrase.
const SHOWN = { has: 6, close: 3, missing: 4 }

const label = (item) => (item.literal ? item.id : skillLabel(item.id))
const names = (items, n) => items.slice(0, n).map(label).join(', ')

function structured(cov, gates, features) {
  return {
    has: (cov?.has ?? []).slice(0, SHOWN.has).map((h) => ({ skill: label(h), where: h.where })),
    close: (cov?.close ?? []).slice(0, SHOWN.close).map((c) => ({ skill: label(c), via: skillLabel(c.via) })),
    missing: (cov?.missing ?? []).slice(0, SHOWN.missing).map((m) => ({ skill: label(m), where: m.where })),
    asked: features.band
      ? { min: features.band[0], max: features.band[1], from: features.from, phrase: askedPhrase(features) }
      : null,
    place: gates.place.why,
  }
}

function phrases(cov, title, gates, why) {
  const out = []
  if (why.has.length) out.push(`has ${names(cov.has, 4)}`)
  if (why.close.length) out.push(`close: ${why.close.map((c) => `${c.skill} (you know ${c.via})`).join(', ')}`)
  if (why.missing.length) out.push(`missing ${names(cov.missing, 3)}`)
  if (title?.changedBy) out.push(`a ${title.changedBy} role, not the kind you want`)
  else if (title && title.value >= 0.5) out.push('close to a title you want')
  // Held back first, then the one good word the level can say. An ad that
  // never states its years is left to the gate line: as a reason it would
  // read like a fault of the person's.
  for (const [name, g] of Object.entries(gates)) {
    if (g.value < 1 && g.why && !(name === 'level' && !why.asked)) out.push(g.why)
  }
  if (gates.level.value === 1 && gates.level.why) out.push(gates.level.why)
  return out
}

export function explainFit({ cov, title, gates, features }) {
  const why = structured(cov, gates, features)
  return {
    reasons: phrases(cov, title, gates, why),
    why,
    gates: Object.entries(gates).map(([gate, g]) => ({ gate, value: g.value, why: g.why })),
  }
}

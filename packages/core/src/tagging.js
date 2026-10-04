import { TAGS_VERSION } from './tag.js'
import { levelTag } from './level.js'
import { typeTag } from './employment.js'
import { workModeTag } from './work-mode.js'
import { payFields } from './pay.js'
import { cautionOf, fewDetails } from './caution.js'
import { adKey } from './ad-key.js'
import { levelEstimateFields } from './model/estimate-fields.js'

// Every tag a posting carries, decided one way whether it is scraped now
// (normalize.js) or tagged again from what a stored row kept (retag.js):
//
//   level, levelTag        'senior' | null, and its tag (see tag.js)
//   levelEstimate          the small model's range when level is null, or
//                          null; modelVersion the model that looked
//                          (see model/estimate-fields.js)
//   type, typeTag          'internship' | 'job', and its tag or null
//   workMode, workModeTag  'remote' | 'hybrid' | 'onsite' | null, and its tag
//   stipend, stipendMin, currency, payTag   the pay fields and where pay came from
//   caution                [{ code, reason, evidence }], red flags only
//   fewDetails             a very thin full text
//   adKey                  the ad's text without its company's name, hashed
//   tagsVersion            TAGS_VERSION
//
// The plain values are what the filters and today's web app read; the tags
// carry the evidence. An unknown type reads 'job': it is the value that
// holds nothing back.
//
// `p` is { title, description, company, source, board, location, tags,
// experience, experienceYears, stipend }, with `board` from board-fields.js
// and `stipend` the board's own pay field.
export function tagsFor(p) {
  const level = levelTag(p)
  const type = typeTag({ level, board: p.board, source: p.source })
  const workMode = workModeTag(p)
  return {
    level: level?.value ?? null,
    levelTag: level,
    ...levelEstimateFields(p, level),
    type: type?.value ?? 'job',
    typeTag: type,
    workMode: workMode?.value ?? null,
    workModeTag: workMode,
    ...payFields(p),
    caution: cautionOf(p),
    fewDetails: fewDetails(p),
    adKey: adKey(p.description, p.company),
    tagsVersion: TAGS_VERSION,
  }
}

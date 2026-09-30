import { normalizeProfile } from './profile.js'
import { heldSkills, holdingOf } from './skill-hold.js'
import { wantedTitles } from './title-match.js'
import { wantedPlaces } from './place-fit.js'
import { flatRarity } from './skill-rarity.js'

// Everything about the person that the scorer needs, worked out once per
// request rather than once per posting: the skills they hold (with implied
// ones and near credit), the titles they want as folded words, their places,
// years and degree. `rarity` weighs a job's skills; the store passes one
// measured on the corpus, and without it every skill weighs the same.
export function fitContext(profile, rarity = flatRarity) {
  const p = normalizeProfile(profile)
  const { held, literals } = heldSkills(p.skills)
  return {
    skills: p.skills.length > 0,
    held,
    literals,
    holds: holdingOf(held),
    titles: wantedTitles(p.titles),
    years: p.years,
    degree: p.degree,
    places: wantedPlaces(p.locations),
    rarity,
  }
}

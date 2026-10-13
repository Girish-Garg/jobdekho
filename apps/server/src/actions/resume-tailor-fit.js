import { skillRegex } from '@jobdekho/core/fit-dimensions.js'
import { spellingsOf } from '@jobdekho/core/skill-find.js'
import { SKILL_TERMS } from './skill-terms.js'
import { jdText } from './resume-tailor-prompt.js'

// What a tailored resume that runs past one page could do without, least
// useful for this job first, for the person to pick from (the review
// screen's "Fit on one page"). Content goes before layout: tightening the
// spacing is offered last, as one more choice, never made for them.
//
//   [{ key, label, why, patch }]
//
// `patch` is the change to the plan's choices that makes the cut (see
// resume/plan-patch.js). Everything here is read off the plan and the
// record alone, so the list is the same each time the screen opens,
// whatever is already ticked.
const MAX_BULLETS = 4
const LABEL = 70
const SECTIONS = [['achievements', 'Achievements'], ['certifications', 'Certifications']]

const short = (text) => (text.length > LABEL ? `${text.slice(0, LABEL).trimEnd()}...` : text)
const named = (entry) => entry.title || 'Untitled'

// The skills the posting names: the fact check's vocabulary plus whatever
// the model listed, each kept only if the posting's own text has it.
function askedTerms(plan, jd) {
  const listed = [...(plan.keywords?.used ?? []), ...(plan.keywords?.missing ?? [])].map((term) => String(term).toLowerCase().trim())
  return [...new Set([...SKILL_TERMS, ...listed])].filter((term) => term && skillRegex(term).test(jd))
}

const names = (text, terms) => terms.some((term) => spellingsOf(term).some((spelling) => skillRegex(spelling).test(text)))

// Bullets that name nothing the posting asks for, from the entry the plan
// ranked last upward. An entry always keeps one bullet, and with no skill
// named by the posting there is nothing to judge a bullet by.
function bulletCuts(plan, terms) {
  if (!terms.length) return []
  const entries = [...(plan.sections?.experience ?? []), ...(plan.sections?.projects ?? [])].reverse()
  return entries.flatMap((entry) => {
    const idle = entry.bullets.map((text, at) => ({ text, at })).filter((bullet) => !names(bullet.text.toLowerCase(), terms))
    return idle.reverse().slice(0, entry.bullets.length - 1).map((bullet) => ({
      key: `bullet:${entry.id}:${bullet.at}`, label: `Bullet: ${short(bullet.text)}`,
      why: `In ${named(entry)}, names nothing this job asks for`, patch: { cut: { [entry.id]: [bullet.at] } },
    }))
  }).slice(0, MAX_BULLETS)
}

const projectCut = (project, why) => ({ key: `entry:${project.id}`, label: `Project: ${named(project)}`, why, patch: { flipped: [project.id] } })

export function fitCuts(profile, plan, posting) {
  const terms = askedTerms(plan, jdText(posting ?? {}).toLowerCase())
  const picked = plan.sections?.projects ?? []
  const sections = SECTIONS.map(([key, title]) => ({ key, title, ids: (profile[key] ?? []).map((entry) => entry.id) }))
  return [
    ...(plan.leftOut?.fill ?? []).map((project) => projectCut(project, 'Not picked for this job')),
    ...sections.filter(({ ids }) => ids.length).map(({ key, title, ids }) => ({
      key: `section:${key}`, label: `Section: ${title}`, why: ids.length === 1 ? 'One entry' : `${ids.length} entries`, patch: { flipped: ids },
    })),
    ...bulletCuts(plan, terms),
    ...(picked.length > 1 ? [projectCut(picked.at(-1), 'The least related project picked')] : []),
    { key: 'compact', label: 'Compact layout', why: 'Tighter spacing, nothing removed', patch: { compact: true } },
  ]
}

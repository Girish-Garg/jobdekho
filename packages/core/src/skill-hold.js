import { SKILLS } from './skill-table.js'
import { canonicalSkill } from './skill-find.js'
import { skillRegex } from './fit-dimensions.js'

// Implied skills count a little less than listed ones: a React developer
// almost certainly writes JavaScript, but did not say so.
const IMPLIED = 0.8

// The person's skills as table ids with a strength (1 listed, 0.8 implied,
// followed to the end so Next.js reaches React and React reaches CSS), plus
// the skills the table does not know, kept as typed with today's matcher.
export function heldSkills(profileSkills = []) {
  const held = new Map()
  const literals = []
  for (const skill of profileSkills) {
    const id = canonicalSkill(skill)
    if (id) held.set(id, 1)
    else literals.push({ text: skill, re: skillRegex(String(skill).toLowerCase()) })
  }
  const queue = [...held.keys()]
  while (queue.length) {
    for (const implied of SKILLS.get(queue.shift())?.implies ?? []) {
      if (held.has(implied)) continue
      held.set(implied, IMPLIED)
      queue.push(implied)
    }
  }
  return { held, literals }
}

// How much of skill `id` the person has, and through which listed skill when
// the credit is only a near one ("close: Next.js, you know React"). Memoised
// per request: a feed asks about the same hundred skills thousands of times.
export function holdingOf(held) {
  const memo = new Map()
  return (id) => {
    if (memo.has(id)) return memo.get(id)
    let out = { value: held.get(id) ?? 0, via: null }
    if (!out.value) {
      for (const [have, strength] of held) {
        if (strength < 1) continue
        const w = SKILLS.get(have)?.near?.[id] ?? SKILLS.get(id)?.near?.[have] ?? 0
        if (w > out.value) out = { value: w, via: have }
      }
    }
    memo.set(id, out)
    return out
  }
}

import { memoryLines } from '../chat/memory-prompt.js'
import { memoriesForCheck } from '../memory/picker.js'

// The saved preferences an action is written with (see packages/store/src/
// memory.js): those for everywhere and those for the action's own kind of
// document (`memoryScope` in index.js), none when the person switched memory
// off or the action names no scope. Read through the dashboard; a dashboard
// that predates memory (only seen in tests) reads as nothing saved.
//
// 'check' is not a place a memory is kept: the fake check, the one action
// that searches the web, takes only the memories about checking a job (see
// memory/picker.js), whatever place they were kept under.
export async function actionMemory(dashboard, userId, scope) {
  if (!scope || typeof dashboard?.getMemory !== 'function') return []
  const { enabled, items } = await dashboard.getMemory(userId)
  if (!enabled) return []
  if (scope === 'check') return memoriesForCheck(items)
  return items.filter((item) => item.scope === 'everywhere' || item.scope === scope)
}

// After the facts, never among them: a preference shapes how the record is
// used, but nothing in it is a fact the document may claim.
export function memoryNote(items = []) {
  if (!items.length) return ''
  return '\nThis person\'s saved preferences, each written or approved by them. Follow them where they fit the rules above. '
    + 'They are preferences, not facts: never take an employer, a title, a skill, a date or a number from them.\n'
    + `${memoryLines(items)}\n`
}

// The check's own note, after the posting: what the person asked every
// check to look into. They may add checks, never skip one, and since this
// call searches, their words are what to look for, never what to search.
export function checkNote(items = []) {
  if (!items.length) return ''
  return '\nThis person\'s saved preferences about checking jobs, each written or approved by them. Follow them where they fit the checks above: '
    + 'they may ask you to look into more, never to skip a check, and each extra check they ask for gets its own entry in "checks". '
    + 'Search for what they ask you to check, never with their words themselves, and never take a fact about this job from them.\n'
    + `${memoryLines(items)}\n`
}

import { memoryLines } from '../chat/memory-prompt.js'

// The saved preferences an action is written with (see packages/store/src/
// memory.js): those for everywhere and those for the action's own kind of
// document (`memoryScope` in index.js), none when the person switched memory
// off or the action names no scope. Read through the dashboard; a dashboard
// that predates memory (only seen in tests) reads as nothing saved.
export async function actionMemory(dashboard, userId, scope) {
  if (!scope || typeof dashboard?.getMemory !== 'function') return []
  const { enabled, items } = await dashboard.getMemory(userId)
  return enabled ? items.filter((item) => item.scope === 'everywhere' || item.scope === scope) : []
}

// After the facts, never among them: a preference shapes how the record is
// used, but nothing in it is a fact the document may claim.
export function memoryNote(items = []) {
  if (!items.length) return ''
  return '\nThis person\'s saved preferences, each written or approved by them. Follow them where they fit the rules above. '
    + 'They are preferences, not facts: never take an employer, a title, a skill, a date or a number from them.\n'
    + `${memoryLines(items)}\n`
}

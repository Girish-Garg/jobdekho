// The setup checks write their details as sentences a person reads once, on
// a first run, so a list of names reads as English ("A, B and C") rather
// than as a comma-joined array, and a count agrees with its noun.
export function listed(items, joiner = 'and') {
  if (items.length < 3) return items.join(` ${joiner} `)
  return `${items.slice(0, -1).join(', ')} ${joiner} ${items.at(-1)}`
}

export const counted = (n, one, many = `${one}s`) => `${n} ${n === 1 ? one : many}`

// "Claude Code from https://claude.ai/code", the form every install sentence
// in the API already uses (see ai/select.js), so the setup check and a
// failed call name the same place to get each AI from.
export const installFrom = (provider) => `${provider.label} from ${provider.install}`

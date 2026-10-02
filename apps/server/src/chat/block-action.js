import { compactKey } from '@jobdekho/core/company-key.js'
import { labelForBlock } from './action-label.js'

// More than a person would block in one go: past this the button's label
// would be a list nobody reads before pressing it.
export const MAX_BLOCK = 10

// The store's own cap on a name (see blocked-companies.js).
const MAX_NAME = 200

// A block action names the companies to hide for good, as strings, trimmed.
// Each has to have letters or digits to be known by, and two spellings of
// one company (one key) count once, so the label names each company the
// click blocks exactly once. A name that matches no posting yet is kept: it
// blocks whatever arrives under it later. Nothing usable left is no action.
export function validateBlock(raw) {
  const byKey = new Map()
  for (const value of Array.isArray(raw?.companies) ? raw.companies : []) {
    const name = typeof value === 'string' ? value.trim().slice(0, MAX_NAME) : ''
    const key = compactKey(name)
    if (key && !byKey.has(key)) byKey.set(key, name)
  }
  const companies = [...byKey.values()].slice(0, MAX_BLOCK)
  return companies.length ? { type: 'block', companies, label: labelForBlock(companies) } : null
}

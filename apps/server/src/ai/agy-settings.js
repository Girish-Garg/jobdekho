import { readFileSync } from 'node:fs'
import { homedir } from 'node:os'
import { join } from 'node:path'

// Antigravity keeps one global settings file. Its project settings are global
// too (~/.gemini/config/projects/, not the working directory), so a call
// cannot drop a settings file of its own into the scratch directory the way
// the empty cwd shuts Claude Code's project settings out. The file is read
// here, never written: what it grants, it grants to every headless call on
// the machine, and JobDekho does not get to decide that for the person.
export const agySettingsPath = (home = homedir()) => join(home, '.gemini', 'antigravity-cli', 'settings.json')

// A missing or unreadable file is the good case: nothing is pre-allowed.
function readSettings(path) {
  try {
    return JSON.parse(readFileSync(path, 'utf8'))
  } catch {
    return null
  }
}

// The rule families that hand a headless call something it could act with,
// as agy 1.1.22 names them. With none of these allowed, headless mode
// auto-denies every permission-gated tool. Each call also runs an agent that
// is not offered them at all (see agy-agent.js); this is the line behind it,
// for a run where agy did not find that agent and fell back to its default.
const GATED = /^\s*(command|read_file|url|browser|mcp)\s*\(/

// Strings are what the CLI documents. A rule in any other shape is one whose
// reach cannot be read, and the promise is not worth guessing about.
const grants = (rule) => typeof rule !== 'string' || GATED.test(rule)
const describe = (rule) => (typeof rule === 'string' ? rule.trim() : JSON.stringify(rule))

export function agyAllowRules(settings) {
  const allow = settings?.permissions?.allow
  const rules = Array.isArray(allow) ? allow : allow == null ? [] : [allow]
  return rules.filter(grants).map(describe)
}

// Null when the install may be used; otherwise the sentence detect.js
// reports in place of a version, so the person sees why from the browser.
export function agyUnusable({ home } = {}) {
  const path = agySettingsPath(home)
  const rules = agyAllowRules(readSettings(path))
  if (!rules.length) return null
  return `Antigravity is installed, but ${path} pre-approves tools for every headless call `
    + `(${rules.join(', ')} under permissions.allow), so JobDekho will not hand it your resume. `
    + 'Remove those rules to use it here.'
}

import { describe, it, expect } from 'vitest'
import { aiCheck } from '@jobdekho/server/setup/ai-check.js'
import { webCheck } from '@jobdekho/server/setup/web-check.js'
import { localCheck } from '@jobdekho/server/setup/local-check.js'
import { latexCheck } from '@jobdekho/server/setup/latex-check.js'
import { profileCheck } from '@jobdekho/server/setup/profile-check.js'
import { postingsCheck } from '@jobdekho/server/setup/postings-check.js'
import { setupChecks } from '@jobdekho/server/setup/checks.js'
import { listed, counted } from '@jobdekho/server/setup/words.js'
import { OLLAMA, CLAUDE } from '@jobdekho/server/ai/providers.js'
import { NOT_RUNNING } from '@jobdekho/server/ai/ollama-origin.js'

// Detection rows the way ai/detect.js writes them. Every one is a literal
// here: nothing in this file probes a real CLI, PATH or model server.
const CLAUDE_ROW = {
  id: 'claude', label: 'Claude Code', install: 'https://claude.ai/code', policies: ['none', 'web'], models: [],
  present: true, path: '/bin/claude', runs: true, version: '2.1.281', error: null,
}
const AGY_ROW = {
  id: 'agy', label: 'Antigravity', install: 'https://antigravity.google', policies: ['none', 'web'], models: [],
  present: true, path: '/bin/agy', runs: true, version: '1.2.14', error: null,
}
const OLLAMA_ROW = {
  id: 'ollama', label: 'Ollama', install: 'https://ollama.com', policies: ['none', 'web'], local: true, webHint: null,
  present: true, path: '/bin/ollama', runs: true, version: '0.32.12', error: null,
  models: [{ id: 'qwen3:4b', tools: true }, { id: 'llama3.2:3b', tools: false }],
}
// Not on PATH: detection still lists the policies the registry gives it.
const absent = (row) => ({ ...row, present: false, path: null, runs: false, version: null, error: null, models: [] })
const SIGN_IN = 'Sign in with "ollama signin" in a terminal to let Ollama search the web; it needs a free ollama.com account.'
const GATED = 'Antigravity is installed, but /home/me/settings.json pre-approves tools for every headless call '
  + '(read_file(*) under permissions.allow), so JobDekho will not hand it your resume. Remove those rules to use it here.'
const stuckAgy = { ...AGY_ROW, runs: false, version: null, error: GATED }
const stoppedOllama = { ...OLLAMA_ROW, runs: false, version: null, models: [], policies: ['none'], error: NOT_RUNNING }
const unsearchingOllama = { ...OLLAMA_ROW, policies: ['none'], webHint: SIGN_IN }
const NOTHING = [absent(CLAUDE_ROW), absent(AGY_ROW), absent(OLLAMA_ROW)]

describe('words', () => {
  it('lists names as English and agrees counts with their noun', () => {
    expect(listed(['A'])).toBe('A')
    expect(listed(['A', 'B'], 'or')).toBe('A or B')
    expect(listed(['A', 'B', 'C'])).toBe('A, B and C')
    expect(counted(1, 'skill')).toBe('1 skill')
    expect(counted(3, 'skill')).toBe('3 skills')
  })
})

describe('the AI check', () => {
  it('is ok when one AI runs, and says the sign-in is only known on the first call', () => {
    const check = aiCheck([CLAUDE_ROW, absent(AGY_ROW), absent(OLLAMA_ROW)])
    expect(check).toEqual({
      id: 'ai', label: 'An AI to answer with', state: 'ok',
      detail: 'Claude Code runs here; whether you are signed in shows on the first AI call.', fix: null,
    })
  })

  it('names every AI that runs', () => {
    expect(aiCheck([CLAUDE_ROW, AGY_ROW, OLLAMA_ROW]).detail).toMatch(/^Claude Code, Antigravity and Ollama run here;/)
  })

  it('is missing with all three install links when nothing is installed', () => {
    const check = aiCheck(NOTHING)
    expect(check.state).toBe('missing')
    expect(check.detail).toBe('No AI was found on this computer.')
    expect(check.fix).toBe('Install Claude Code from https://claude.ai/code, Antigravity from https://antigravity.google '
      + 'or Ollama from https://ollama.com with a model pulled, then restart JobDekho.')
  })

  // A detection that found nothing at all still names every choice, from
  // the registry rather than the rows.
  it('offers every AI from the registry when detection gave no rows', () => {
    expect(aiCheck([]).fix).toMatch(/Claude Code from .* Antigravity from .* Ollama from https:\/\/ollama\.com/)
  })

  it('passes on why an installed AI cannot answer, and offers the ones not installed', () => {
    const check = aiCheck([absent(CLAUDE_ROW), stuckAgy, stoppedOllama])
    expect(check.state).toBe('missing')
    expect(check.detail).toBe(`${GATED} ${NOT_RUNNING}`)
    expect(check.fix).toBe('Fix that and press Check again, or install Claude Code from https://claude.ai/code, then restart JobDekho.')
  })

  it('asks only for the fix when every AI is installed but none can answer', () => {
    const check = aiCheck([{ ...CLAUDE_ROW, runs: false, error: 'Claude Code could not run.' }, stuckAgy, stoppedOllama])
    expect(check.fix).toBe('Fix that, then press Check again.')
  })
})

describe('the web search check', () => {
  it('is ok when a running AI can search, and names it', () => {
    const check = webCheck([CLAUDE_ROW, absent(AGY_ROW), unsearchingOllama])
    expect(check).toMatchObject({ id: 'web', label: 'Web search', state: 'ok', fix: null })
    expect(check.detail).toBe('Claude Code can search the web, for "Is this job real?" and for chat questions that need it.')
  })

  // Absent, Claude Code's row still lists 'web' among its policies.
  it('does not count an AI that is not running', () => {
    expect(webCheck([absent(CLAUDE_ROW), stuckAgy]).state).toBe('optional')
  })

  it('is optional, never missing, and gives Ollama\'s own line on how to let it search', () => {
    const check = webCheck([absent(CLAUDE_ROW), absent(AGY_ROW), unsearchingOllama])
    expect(check.state).toBe('optional')
    expect(check.detail).toMatch(/No AI here can search the web right now/)
    expect(check.fix).toBe(SIGN_IN)
  })

  it('passes on why an installed searcher is stuck', () => {
    expect(webCheck([absent(CLAUDE_ROW), stuckAgy, absent(OLLAMA_ROW)]).fix).toBe(GATED)
  })

  it('offers the AIs that search once installed, leaving out Ollama, whose search waits on a sign-in', () => {
    const check = webCheck(NOTHING)
    expect(check.state).toBe('optional')
    expect(check.fix).toBe('Install Claude Code from https://claude.ai/code or Antigravity from https://antigravity.google, '
      + 'which search the web, then restart JobDekho.')
  })
})

describe('the Ollama check', () => {
  it('is ok when Ollama answers, with how many models it has', () => {
    const check = localCheck([CLAUDE_ROW, OLLAMA_ROW])
    expect(check).toMatchObject({ id: 'ollama', label: 'Ollama on this computer', state: 'ok', fix: null })
    expect(check.detail).toBe('Ollama runs here with 2 models, so it answers without your prompt leaving this computer.')
  })

  it('is optional when installed but not answering, with detection\'s sentence as the fix', () => {
    const check = localCheck([stoppedOllama])
    expect(check.state).toBe('optional')
    expect(check.detail).toBe('Ollama is installed but cannot answer yet.')
    expect(check.fix).toBe(NOT_RUNNING)
  })

  it('is optional when not installed, offering it in the registry\'s own words', () => {
    for (const rows of [NOTHING, []]) {
      const check = localCheck(rows)
      expect(check.state).toBe('optional')
      expect(check.fix).toBe(OLLAMA.offer)
    }
  })

  it('is left out when no AI in the registry runs on this computer', () => {
    expect(localCheck(NOTHING, [CLAUDE])).toBeNull()
  })
})

describe('the LaTeX check', () => {
  it('is ok with the pdflatex it found', () => {
    expect(latexCheck('C:\\MiKTeX\\pdflatex.exe')).toEqual({
      id: 'latex', label: 'PDF making', state: 'ok',
      detail: 'LaTeX was found at C:\\MiKTeX\\pdflatex.exe, so documents turn into PDFs.', fix: null,
    })
  })

  it('is missing without one, says documents still work as source, and how to install it', () => {
    const check = latexCheck(null)
    expect(check.state).toBe('missing')
    expect(check.detail).toMatch(/still work as LaTeX source/)
    expect(check.fix).toBe('Install MiKTeX from https://miktex.org/download on Windows, '
      + 'or TeX Live from https://tug.org/texlive elsewhere, then restart JobDekho.')
  })
})

describe('the profile check', () => {
  const FIX = 'Open Profile and upload a resume, or fill it in by hand.'

  it('is missing with no profile at all', () => {
    expect(profileCheck(null)).toEqual({
      id: 'profile', label: 'Your profile', state: 'missing',
      detail: 'No profile yet, so postings are listed newest first rather than by fit.', fix: FIX,
    })
  })

  it('is missing when the profile has nothing to rank by', () => {
    const check = profileCheck({ skills: [], titles: [], years: null, locations: ['pune'], degree: 'btech' })
    expect(check.state).toBe('missing')
    expect(check.detail).toMatch(/no skills, target titles or years/)
    expect(check.fix).toBe(FIX)
  })

  it('is ok, and says what it ranks against', () => {
    const check = profileCheck({ skills: ['react', 'node'], titles: ['frontend developer'], years: 3 })
    expect(check).toMatchObject({ state: 'ok', fix: null })
    expect(check.detail).toBe('Postings are ranked against your 2 skills, 1 target title and 3 years of experience.')
  })

  it('is ok with a target title alone', () => {
    expect(profileCheck({ skills: [], titles: ['data analyst'], years: null }).detail)
      .toBe('Postings are ranked against your 1 target title.')
  })
})

describe('the postings check', () => {
  const NOW = Date.parse('2026-09-30T12:00:00Z')
  const run = (startedAt) => ({ id: startedAt, startedAt, sourceResults: [], newCount: 0 })
  const FIX = 'Refresh postings from the Postings page, or run "npm run scrape" in a terminal.'

  it('is missing when nothing was ever scraped', () => {
    expect(postingsCheck({ sources: [], runs: [], now: NOW })).toEqual({
      id: 'postings', label: 'Postings', state: 'missing', detail: 'No postings are stored yet.', fix: FIX,
    })
  })

  it('is missing when the last refresh kept nothing, and says when it ran', () => {
    const check = postingsCheck({ sources: [], runs: [run('2026-09-30T08:00:00Z')], now: NOW })
    expect(check.state).toBe('missing')
    expect(check.detail).toBe('No postings are stored; the last refresh, today, kept none.')
  })

  it('is ok with the stored count and how long ago the latest run was', () => {
    const sources = [{ name: 'greenhouse', count: 1000 }, { name: 'lever', count: 234 }]
    const runs = [run('2026-09-28T09:00:00Z'), run('2026-09-20T09:00:00Z')]
    expect(postingsCheck({ sources, runs, now: NOW })).toEqual({
      id: 'postings', label: 'Postings', state: 'ok', detail: '1,234 postings stored, last refreshed 2 days ago.', fix: null,
    })
  })

  it('reads yesterday as yesterday, and picks the latest run by its date, not its line', () => {
    const runs = [run('2026-09-29T09:00:00Z'), run('2026-09-01T09:00:00Z'), { id: 'x', startedAt: 'not a date' }]
    expect(postingsCheck({ sources: [{ name: 'a', count: 1 }], runs, now: NOW }).detail)
      .toBe('1 posting stored, last refreshed yesterday.')
  })

  it('leaves the refresh out when no run is on record', () => {
    expect(postingsCheck({ sources: [{ name: 'a', count: 5 }], runs: [], now: NOW }).detail).toBe('5 postings stored.')
  })
})

describe('setupChecks', () => {
  it('lists the four required checks first, then the two optional ones', () => {
    const checks = setupChecks({ rows: NOTHING })
    expect(checks.map((c) => c.id)).toEqual(['ai', 'latex', 'profile', 'postings', 'web', 'ollama'])
    expect(checks.map((c) => c.state)).toEqual(['missing', 'missing', 'missing', 'missing', 'optional', 'optional'])
    for (const check of checks) expect(Object.keys(check).sort()).toEqual(['detail', 'fix', 'id', 'label', 'state'])
  })

  it('is all ok on a machine with everything in place', () => {
    const checks = setupChecks({
      rows: [CLAUDE_ROW, AGY_ROW, OLLAMA_ROW], latexPath: '/usr/bin/pdflatex',
      profile: { skills: ['sql'] }, sources: [{ name: 'a', count: 3 }], runs: [],
    })
    expect(checks.every((c) => c.state === 'ok' && c.fix === null)).toBe(true)
  })
})

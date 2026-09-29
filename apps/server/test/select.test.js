import { describe, it, expect, vi } from 'vitest'
import { pickProvider, createSelector } from '@jobdekho/server/ai/select.js'
import { CLAUDE, AGY } from '@jobdekho/server/ai/providers.js'

// Detection rows as detect.js reports them.
const row = (provider, over = {}) => ({
  id: provider.id, label: provider.label, install: provider.install, policies: provider.policies,
  present: false, path: null, runs: false, version: null, error: null, ...over,
})
const ready = (provider) => row(provider, { present: true, path: `/bin/${provider.binary}`, runs: true, version: '1.0' })
const stuck = (provider, error) => row(provider, { present: true, path: `/bin/${provider.binary}`, error })
const absent = (provider) => row(provider)

const GATE = 'Antigravity is installed, but C:\\home\\settings.json pre-approves tools for every headless call '
  + '(read_file(*) under permissions.allow), so JobDekho will not hand it your resume. Remove those rules to use it here.'
const BROKEN = 'Claude Code is installed at /bin/claude but could not run: libnode.so: cannot open shared object file'

function thrown(fn) {
  try { fn() } catch (err) { return err }
  throw new Error('expected a throw')
}

describe('pickProvider', () => {
  it('prefers Claude Code whenever it is installed and runs', () => {
    expect(pickProvider([ready(CLAUDE), ready(AGY)], 'none')).toBe(CLAUDE)
    expect(pickProvider([ready(CLAUDE), ready(AGY)], 'web')).toBe(CLAUDE)
    expect(pickProvider([ready(CLAUDE), absent(AGY)], 'none')).toBe(CLAUDE)
  })

  it('uses Antigravity for a no-tools action when Claude Code is absent or will not run', () => {
    expect(pickProvider([absent(CLAUDE), ready(AGY)], 'none')).toBe(AGY)
    expect(pickProvider([stuck(CLAUDE, BROKEN), ready(AGY)], 'none')).toBe(AGY)
  })

  // Antigravity searches under 'web' through an agent of its own (see
  // agy-agent.js), so it takes a web action when Claude Code cannot.
  it('uses Antigravity for a web action when Claude Code is absent or will not run', () => {
    expect(pickProvider([absent(CLAUDE), ready(AGY)], 'web')).toBe(AGY)
    expect(pickProvider([stuck(CLAUDE, BROKEN), ready(AGY)], 'web')).toBe(AGY)
  })

  // A CLI that does not honour the policy is not named as something to
  // install, however it is doing.
  it('names only the CLIs that honour the policy when none is installed', () => {
    const noWeb = { ...absent(AGY), policies: ['none'] }
    const err = thrown(() => pickProvider([absent(CLAUDE), noWeb], 'web'))
    expect(err.kind).toBe('not_found')
    expect(err.status).toBe(503)
    expect(err.provider).toBe('claude')
    expect(err.message).toBe(
      'Claude Code is not installed, or is not on the PATH JobDekho was started with. '
      + 'Install it from https://claude.ai/code, then restart JobDekho.',
    )
  })

  it('names both CLIs and both links when neither is installed and either would do', () => {
    const err = thrown(() => pickProvider([absent(CLAUDE), absent(AGY)], 'none'))
    expect(err.kind).toBe('not_found')
    expect(err.message).toBe(
      'Neither Claude Code nor Antigravity is installed, or on the PATH JobDekho was started with. '
      + 'Install Claude Code from https://claude.ai/code or Antigravity from https://antigravity.google, then restart JobDekho.',
    )
  })

  it('names both CLIs for a web action too, since either can search', () => {
    const err = thrown(() => pickProvider([absent(CLAUDE), absent(AGY)], 'web'))
    expect(err.message).toMatch(/^Neither Claude Code nor Antigravity is installed/)
    expect(err.message).toMatch(/claude\.ai\/code.*antigravity\.google/)
  })

  // The person has that CLI; the fix is on their machine, not a second install.
  it('repeats detection\'s own sentence for a capable CLI that is installed but stuck', () => {
    const gated = thrown(() => pickProvider([absent(CLAUDE), stuck(AGY, GATE)], 'none'))
    expect(gated.kind).toBe('not_found')
    expect(gated.message).toBe(GATE)
    const both = thrown(() => pickProvider([stuck(CLAUDE, BROKEN), stuck(AGY, GATE)], 'none'))
    expect(both.message).toBe(BROKEN)
  })

  it('repeats a stuck Antigravity\'s own sentence for a web action as well', () => {
    const err = thrown(() => pickProvider([absent(CLAUDE), stuck(AGY, GATE)], 'web'))
    expect(err.message).toBe(GATE)
  })

  it('throws on a policy nobody knows, as a bug rather than a sentence', () => {
    expect(() => pickProvider([ready(CLAUDE), ready(AGY)], 'all')).toThrow(/unknown tool policy/)
  })
})

describe('pickProvider with a preference', () => {
  it('honours an explicit preference over the default order', () => {
    expect(pickProvider([ready(CLAUDE), ready(AGY)], 'none', [], 'agy')).toBe(AGY)
  })

  it('falls back to the default order when the preferred CLI is not eligible', () => {
    expect(pickProvider([absent(CLAUDE), ready(AGY)], 'none', [], 'claude')).toBe(AGY)
    expect(pickProvider([ready(CLAUDE), ready(AGY)], 'none', ['agy'], 'agy')).toBe(CLAUDE)
  })

  it('honours a preference for Antigravity on a web action', () => {
    expect(pickProvider([ready(CLAUDE), ready(AGY)], 'web', [], 'agy')).toBe(AGY)
  })

  // A CLI that cannot honour the policy is not in the eligible set at all,
  // preferred or not.
  it('never lets a preference reach a CLI that cannot honour the policy', () => {
    const noWeb = { ...ready(AGY), policies: ['none'] }
    expect(pickProvider([ready(CLAUDE), noWeb], 'web', [], 'agy')).toBe(CLAUDE)
  })

  it('treats no preference the same as before the feature existed', () => {
    expect(pickProvider([ready(CLAUDE), ready(AGY)], 'none')).toBe(CLAUDE)
  })
})

describe('createSelector', () => {
  it('asks the shared detector each time and answers with the provider itself', async () => {
    const detect = vi.fn(async () => [absent(CLAUDE), ready(AGY)])
    const select = createSelector(detect)
    expect(await select('none')).toBe(AGY)
    expect(await select('web')).toBe(AGY)
    expect(detect).toHaveBeenCalledTimes(2)
  })

  it('asks the preference callback on every call and honours it when eligible', async () => {
    const detect = vi.fn(async () => [ready(CLAUDE), ready(AGY)])
    const getPreferred = vi.fn(async () => 'agy')
    const select = createSelector(detect, getPreferred)
    expect(await select('none')).toBe(AGY)
    expect(getPreferred).toHaveBeenCalledTimes(1)
  })

  it('defaults to no preference, same fallback order as before', async () => {
    const detect = vi.fn(async () => [ready(CLAUDE), ready(AGY)])
    expect(await createSelector(detect)('none')).toBe(CLAUDE)
  })
})

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

  // Antigravity honours 'none' by auto-denying every tool; a browser for it
  // would mean a permanent allow-rule in the person's own config.
  it('never uses Antigravity for a web action, and says why with the link to what would work', () => {
    const err = thrown(() => pickProvider([absent(CLAUDE), ready(AGY)], 'web'))
    expect(err.kind).toBe('not_found')
    expect(err.status).toBe(503)
    expect(err.provider).toBe('claude')
    expect(err.message).toBe(
      'This action needs a CLI that can browse, and Antigravity\'s headless mode cannot be given web access '
      + 'without permanent allow-rules in its own config. '
      + 'Claude Code is not installed, or is not on the PATH JobDekho was started with. '
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

  it('names only Claude Code, and the reason, when neither is installed and the action needs a browser', () => {
    const err = thrown(() => pickProvider([absent(CLAUDE), absent(AGY)], 'web'))
    expect(err.message).toMatch(/^This action needs a CLI that can browse/)
    expect(err.message).toMatch(/Claude Code is not installed.*claude\.ai\/code/)
    expect(err.message).not.toMatch(/antigravity\.google/)
  })

  // The person has that CLI; the fix is on their machine, not a second install.
  it('repeats detection\'s own sentence for a capable CLI that is installed but stuck', () => {
    const gated = thrown(() => pickProvider([absent(CLAUDE), stuck(AGY, GATE)], 'none'))
    expect(gated.kind).toBe('not_found')
    expect(gated.message).toBe(GATE)
    const both = thrown(() => pickProvider([stuck(CLAUDE, BROKEN), stuck(AGY, GATE)], 'none'))
    expect(both.message).toBe(BROKEN)
  })

  it('ignores a stuck Antigravity for a web action, since it could not have helped', () => {
    const err = thrown(() => pickProvider([absent(CLAUDE), stuck(AGY, GATE)], 'web'))
    expect(err.message).toMatch(/needs a CLI that can browse/)
    expect(err.message).not.toMatch(/pre-approves/)
  })

  it('throws on a policy nobody knows, as a bug rather than a sentence', () => {
    expect(() => pickProvider([ready(CLAUDE), ready(AGY)], 'all')).toThrow(/unknown tool policy/)
  })
})

describe('createSelector', () => {
  it('asks the shared detector each time and answers with the provider itself', async () => {
    const detect = vi.fn(async () => [absent(CLAUDE), ready(AGY)])
    const select = createSelector(detect)
    expect(await select('none')).toBe(AGY)
    await expect(select('web')).rejects.toMatchObject({ kind: 'not_found' })
    expect(detect).toHaveBeenCalledTimes(2)
  })
})

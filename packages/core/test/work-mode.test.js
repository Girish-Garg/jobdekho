import { describe, it, expect } from 'vitest'
import { classifyWorkMode, WORK_MODES } from '@jobdekho/core/work-mode.js'

describe('classifyWorkMode', () => {
  it('reads the plain cases', () => {
    expect(classifyWorkMode('Work from home')).toBe('remote')
    expect(classifyWorkMode('Remote')).toBe('remote')
    expect(classifyWorkMode('Worldwide')).toBe('remote')
    expect(classifyWorkMode('Bengaluru, India')).toBe('onsite')
    expect(classifyWorkMode('Gurgaon (Hybrid)')).toBe('hybrid')
  })

  // Both words appear together often, and the hybrid one is the binding claim.
  it('prefers hybrid when a posting says both', () => {
    expect(classifyWorkMode('Remote (Hybrid)')).toBe('hybrid')
    expect(classifyWorkMode('Hybrid - work from home 2 days')).toBe('hybrid')
  })

  it('falls back to onsite when nothing is stated', () => {
    expect(classifyWorkMode('')).toBe('onsite')
    expect(classifyWorkMode(undefined)).toBe('onsite')
  })

  it('reads tags when the location is silent', () => {
    expect(classifyWorkMode('', ['Engineering', 'Remote'])).toBe('remote')
  })

  it('only ever returns a known mode', () => {
    for (const loc of ['', 'Pune', 'Remote', 'Hybrid', 'anywhere']) {
      expect(WORK_MODES).toContain(classifyWorkMode(loc))
    }
  })
})

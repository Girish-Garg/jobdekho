import { describe, it, expect } from 'vitest'
import { classifyWorkMode, workModeTag, boardWorkMode, WORK_MODES } from '@jobdekho/core/work-mode.js'

describe('classifyWorkMode', () => {
  it('reads the plain cases', () => {
    expect(classifyWorkMode('Work from home')).toBe('remote')
    expect(classifyWorkMode('Remote')).toBe('remote')
    expect(classifyWorkMode('Worldwide')).toBe('remote')
    expect(classifyWorkMode('Gurgaon (Hybrid)')).toBe('hybrid')
    expect(classifyWorkMode('Office - India - Hyderabad (On-site)')).toBe('onsite')
  })

  // Both words appear together often, and the hybrid one is the binding claim.
  it('prefers hybrid when a posting says both', () => {
    expect(classifyWorkMode('Remote (Hybrid)')).toBe('hybrid')
    expect(classifyWorkMode('Hybrid - work from home 2 days')).toBe('hybrid')
  })

  // A city is not evidence of an office: no default.
  it('says nothing when nothing is stated', () => {
    expect(classifyWorkMode('Bengaluru, India')).toBeNull()
    expect(classifyWorkMode('')).toBeNull()
    expect(classifyWorkMode(undefined)).toBeNull()
  })

  it('reads a tag that is itself a work mode', () => {
    expect(classifyWorkMode('', ['Engineering', 'Remote'])).toBe('remote')
    expect(classifyWorkMode('Noida', ['Software', 'onsite'])).toBe('onsite')
    expect(classifyWorkMode('Pune', ['Office/Site only'])).toBe('onsite')
    expect(classifyWorkMode('', ['Full Time - Remote'])).toBe('remote')
    expect(classifyWorkMode('', ['Fulltime- Office'])).toBe('onsite')
    expect(classifyWorkMode('', ['remote_local'])).toBe('remote')
  })

  // "Distributed Systems" made Mumbai jobs remote.
  it('never reads a skill tag as a work mode', () => {
    expect(classifyWorkMode('Mumbai', ['backend', 'distributed systems', 'java'])).toBeNull()
    expect(classifyWorkMode('Delhi', ['Remote Sensing', 'Hybrid Cloud'])).toBeNull()
  })

  it('only ever returns a known mode or nothing', () => {
    for (const loc of ['', 'Pune', 'Remote', 'Hybrid', 'anywhere']) {
      const mode = classifyWorkMode(loc)
      expect(mode === null || WORK_MODES.includes(mode)).toBe(true)
    }
  })
})

describe('workModeTag', () => {
  it('takes a workplace field the board states before anything else', () => {
    expect(workModeTag({ board: { workMode: 'hybrid' }, location: 'Remote' }))
      .toMatchObject({ value: 'hybrid', from: 'board', evidence: 'Workplace type: Hybrid' })
    expect(boardWorkMode({ location: 'Remote - India' })).toMatchObject({ value: 'remote', from: 'board', evidence: 'Location says Remote - India' })
  })

  it('reads the title next, only where the mode stands apart', () => {
    expect(workModeTag({ title: 'Lead Engineer - Electronics - Hybrid' })).toMatchObject({ value: 'hybrid', from: 'title' })
    expect(workModeTag({ title: 'Data Analyst Intern | Remote | Freshers Welcome' })).toMatchObject({ value: 'remote', from: 'title' })
    expect(workModeTag({ title: 'Remote Sensing Scientist' })).toBeNull()
    expect(workModeTag({ title: 'Hybrid Cloud Engineer' })).toBeNull()
    expect(workModeTag({ title: 'Onsite Coordinator' })).toBeNull()
  })

  it('reads an explicit statement in the description last', () => {
    expect(workModeTag({ location: 'Chennai, India', description: 'Workplace type: Hybrid Working' }))
      .toMatchObject({ value: 'hybrid', from: 'text', evidence: 'Says "Workplace type: Hybrid"' })
  })

  it('is null when nothing states the mode', () => {
    expect(workModeTag({ location: 'Bengaluru, India', title: 'Engineer', description: 'Build services.' })).toBeNull()
  })
})

import { describe, it, expect } from 'vitest'
import { createHostGate, hostKey } from '@jobdekho/sources/host-gate.js'
import { ruleFor, RULES } from '@jobdekho/sources/host-rules.js'

// A clock the test moves by hand: waiting advances it, so no test sleeps.
function fakeClock() {
  let t = 1000
  return { now: () => t, wait: async (ms) => { t += ms } }
}

describe('hostKey', () => {
  it('queues Workday tenants by data centre and everything else by host', () => {
    expect(hostKey('https://nvidia.wd5.myworkdayjobs.com/wday/cxs/nvidia/x/jobs')).toBe('workday:wd5')
    expect(hostKey('https://Adobe.WD5.myworkdayjobs.com/x')).toBe('workday:wd5')
    expect(hostKey('https://boards-api.greenhouse.io/v1/boards/a/jobs')).toBe('boards-api.greenhouse.io')
    expect(hostKey('not a url')).toBe('')
  })
})

describe('ruleFor', () => {
  it('gives platform APIs, Workday, LinkedIn and plain pages their own pace', () => {
    expect(ruleFor('boards-api.greenhouse.io')).toBe(RULES.api)
    expect(ruleFor('acme.recruitee.com')).toBe(RULES.api)
    expect(ruleFor('workday:wd1')).toBe(RULES.workday)
    expect(ruleFor('www.linkedin.com')).toBe(RULES.linkedin)
    expect(ruleFor('careers.example.com')).toBe(RULES.page)
  })
})

describe('createHostGate', () => {
  it('spaces two starts on one host by the rule gap, and lets other hosts go at once', async () => {
    const clock = fakeClock()
    const gate = createHostGate({ ruleFor: () => ({ inFlight: 5, gapMs: 1000 }), ...clock })
    const starts = []
    const go = async (url) => { const leave = await gate.enter(url); starts.push([url, clock.now()]); leave(200) }
    await go('https://a.example/1')
    await go('https://a.example/2')
    await go('https://b.example/1')
    expect(starts).toEqual([['https://a.example/1', 1000], ['https://a.example/2', 2000], ['https://b.example/1', 2000]])
  })

  it('keeps no more than inFlight requests open on one host', async () => {
    const gate = createHostGate({ ruleFor: () => ({ inFlight: 1, gapMs: 0 }), ...fakeClock() })
    const first = await gate.enter('https://a.example/1')
    let second = null
    const waiting = gate.enter('https://a.example/2').then((leave) => { second = leave })
    await Promise.resolve()
    expect(second).toBeNull()
    first(200)
    await waiting
    expect(typeof second).toBe('function')
  })

  it('refuses a host for the rest of the run once it answers 429, queued requests included', async () => {
    const gate = createHostGate({ ruleFor: () => ({ inFlight: 1, gapMs: 0 }), ...fakeClock() })
    const first = await gate.enter('https://a.example/1')
    const queued = gate.enter('https://a.example/2')
    first(429)
    await expect(queued).rejects.toThrow(/^HTTP 429 for https:\/\/a\.example\/2/)
    await expect(gate.enter('https://a.example/3')).rejects.toThrow(/HTTP 429/)
    expect(gate.refused('https://a.example/4')).toBe(true)
    const other = await gate.enter('https://b.example/1')
    expect(typeof other).toBe('function')
  })

  it('counts a request as finished only once, however often leave is called', async () => {
    const gate = createHostGate({ ruleFor: () => ({ inFlight: 1, gapMs: 0 }), ...fakeClock() })
    const leave = await gate.enter('https://a.example/1')
    leave(200)
    leave(0)
    const next = await gate.enter('https://a.example/2')
    let third = null
    gate.enter('https://a.example/3').then((l) => { third = l })
    await Promise.resolve()
    expect(third).toBeNull()
    next(200)
  })
})

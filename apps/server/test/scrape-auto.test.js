import { describe, it, expect, vi } from 'vitest'
import { isDue, startAutoRefresh, FIRST_CHECK_MS, CHECK_EVERY_MS } from '@jobdekho/server/scrape/auto.js'

const NOW = Date.parse('2026-09-30T12:00:00.000Z')
const HOUR = 60 * 60 * 1000
const ago = (ms) => new Date(NOW - ms).toISOString()
const run = (at, { sources = 3, failed = [] } = {}) => ({ at, fresh: 1, sources, failed })

describe('isDue', () => {
  it('is due when nothing has ever run', () => {
    expect(isDue(null, NOW)).toBe(true)
  })

  it('is due once the last run is a day old, and not before', () => {
    expect(isDue(run(ago(23 * HOUR)), NOW)).toBe(false)
    expect(isDue(run(ago(24 * HOUR)), NOW)).toBe(true)
    expect(isDue(run(ago(30 * HOUR)), NOW)).toBe(true)
  })

  // A computer that was offline records a run in which every source failed;
  // that is not a refresh, so it must not buy a day's wait.
  it('is due again when every source in the last run failed', () => {
    const failed = [{ name: 'a' }, { name: 'b' }, { name: 'c' }]
    expect(isDue(run(ago(HOUR), { failed }), NOW)).toBe(true)
    expect(isDue(run(ago(HOUR), { failed: failed.slice(0, 2) }), NOW)).toBe(false)
  })

  it('is not due every hour for a config that lists no sources at all', () => {
    expect(isDue(run(ago(HOUR), { sources: 0 }), NOW)).toBe(false)
  })

  it('is due when the run has no readable time', () => {
    expect(isDue(run('not a date'), NOW)).toBe(true)
  })
})

// A fake service: the job, the last run and the preference, all in memory.
function fakeScrape({ lastRun = null, autoRefresh = true, running = false } = {}) {
  return {
    job: { isRunning: vi.fn(() => running), start: vi.fn(() => Promise.resolve()) },
    lastRun: vi.fn(() => lastRun),
    getPref: vi.fn(() => ({ autoRefresh })),
  }
}

// Timers that only record what was asked of them: no real timer starts.
const fakeTimers = () => ({ after: vi.fn(), every: vi.fn() })

describe('startAutoRefresh', () => {
  it('checks a minute after startup and then every hour, on the timers it is given', () => {
    const timers = fakeTimers()
    const check = startAutoRefresh({ scrape: fakeScrape(), userId: 'local', now: () => NOW, timers })
    expect(timers.after).toHaveBeenCalledWith(FIRST_CHECK_MS, check)
    expect(timers.every).toHaveBeenCalledWith(CHECK_EVERY_MS, check)
    expect(FIRST_CHECK_MS).toBe(60 * 1000)
    expect(CHECK_EVERY_MS).toBe(HOUR)
  })

  it('starts a refresh when the last one is over a day old', async () => {
    const scrape = fakeScrape({ lastRun: run(ago(25 * HOUR)) })
    const check = startAutoRefresh({ scrape, userId: 'local', now: () => NOW, timers: fakeTimers() })
    expect(await check()).toBe(true)
    expect(scrape.job.start).toHaveBeenCalledTimes(1)
    expect(scrape.getPref).toHaveBeenCalledWith('local')
  })

  it('leaves a recent refresh alone', async () => {
    const scrape = fakeScrape({ lastRun: run(ago(2 * HOUR)) })
    const check = startAutoRefresh({ scrape, userId: 'local', now: () => NOW, timers: fakeTimers() })
    expect(await check()).toBe(false)
    expect(scrape.job.start).not.toHaveBeenCalled()
  })

  it('does nothing when the person turned it off', async () => {
    const scrape = fakeScrape({ autoRefresh: false })
    const check = startAutoRefresh({ scrape, userId: 'local', now: () => NOW, timers: fakeTimers() })
    expect(await check()).toBe(false)
    expect(scrape.job.start).not.toHaveBeenCalled()
  })

  it('never starts while another refresh runs', async () => {
    const scrape = fakeScrape({ running: true })
    const check = startAutoRefresh({ scrape, userId: 'local', now: () => NOW, timers: fakeTimers() })
    expect(await check()).toBe(false)
    expect(scrape.job.start).not.toHaveBeenCalled()
  })

  it('logs a check that throws instead of letting it escape the timer', async () => {
    const scrape = fakeScrape()
    scrape.lastRun.mockImplementation(() => { throw new Error('disk gone') })
    const log = { error: vi.fn() }
    const check = startAutoRefresh({ scrape, userId: 'local', now: () => NOW, timers: fakeTimers(), log })
    expect(await check()).toBe(false)
    expect(log.error).toHaveBeenCalled()
  })

  it('follows the clock it is given as the hours pass', async () => {
    let now = NOW
    const scrape = fakeScrape({ lastRun: run(ago(20 * HOUR)) })
    const check = startAutoRefresh({ scrape, userId: 'local', now: () => now, timers: fakeTimers() })
    expect(await check()).toBe(false)
    now += 4 * HOUR
    expect(await check()).toBe(true)
  })
})

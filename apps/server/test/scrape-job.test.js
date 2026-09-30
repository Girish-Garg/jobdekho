import { describe, it, expect, vi } from 'vitest'
import { createScrapeJob } from '@jobdekho/server/scrape/job.js'

const RESULT = { fresh: 37, total: 900, tooOld: 4, removed: 2, failed: ['linkedin'] }

// A run that finishes only when the test says so, so the job can be looked
// at while it is still going.
function heldRun() {
  let finish
  let fail
  let onProgress
  const run = vi.fn((opts) => {
    onProgress = opts.onProgress
    return new Promise((resolve, reject) => { finish = resolve; fail = reject })
  })
  return { run, finish: (v) => finish(v), fail: (e) => fail(e), progress: (p) => onProgress(p) }
}

const clock = () => {
  let t = Date.parse('2026-09-30T10:00:00.000Z')
  return { now: () => t, advance: (ms) => { t += ms } }
}

describe('createScrapeJob', () => {
  it('starts idle, with nothing run yet', () => {
    const job = createScrapeJob({ run: vi.fn() })
    expect(job.state()).toEqual({ running: false, startedAt: null, finishedAt: null, done: 0, total: 0 })
    expect(job.isRunning()).toBe(false)
  })

  it('is running from the moment it starts, before the scrape has done anything', () => {
    const { run } = heldRun()
    const { now } = clock()
    const job = createScrapeJob({ run, now })
    expect(job.start()).toBeInstanceOf(Promise)
    expect(job.state()).toMatchObject({ running: true, startedAt: '2026-09-30T10:00:00.000Z', finishedAt: null, done: 0, total: 0 })
  })

  it('refuses a second start while one runs, and never runs the scrape twice', async () => {
    const held = heldRun()
    const job = createScrapeJob({ run: held.run })
    const first = job.start()
    expect(job.start()).toBeNull()
    await vi.waitFor(() => expect(held.run).toHaveBeenCalled())
    expect(job.start()).toBeNull()
    held.finish(RESULT)
    await first
    expect(held.run).toHaveBeenCalledTimes(1)
  })

  it('counts progress as sources settle, naming the last one', async () => {
    const held = heldRun()
    const job = createScrapeJob({ run: held.run })
    job.start()
    await vi.waitFor(() => expect(held.run).toHaveBeenCalled())
    held.progress({ done: 0, total: 118, current: null })
    expect(job.state()).toMatchObject({ done: 0, total: 118 })
    expect(job.state()).not.toHaveProperty('current')
    held.progress({ done: 42, total: 118, current: 'internshala' })
    expect(job.state()).toMatchObject({ running: true, done: 42, total: 118, current: 'internshala' })
  })

  it('keeps the result once finished, and when, and can start again', async () => {
    const held = heldRun()
    const { now, advance } = clock()
    const job = createScrapeJob({ run: held.run, now })
    const running = job.start()
    await vi.waitFor(() => expect(held.run).toHaveBeenCalled())
    held.progress({ done: 118, total: 118, current: 'linkedin' })
    advance(90_000)
    held.finish(RESULT)
    await running
    expect(job.state()).toEqual({
      running: false, startedAt: '2026-09-30T10:00:00.000Z', finishedAt: '2026-09-30T10:01:30.000Z', done: 118, total: 118, result: RESULT,
    })
    expect(job.start()).not.toBeNull()
    expect(job.state()).not.toHaveProperty('result')
  })

  it('turns a failed run into a sentence, logs the real error, and frees the job', async () => {
    const held = heldRun()
    const log = { error: vi.fn() }
    const job = createScrapeJob({ run: held.run, log })
    const running = job.start()
    await vi.waitFor(() => expect(held.run).toHaveBeenCalled())
    const err = new Error('EACCES: C:\\secret\\path')
    held.fail(err)
    await expect(running).resolves.toBeUndefined()
    expect(log.error).toHaveBeenCalledWith(err)
    expect(job.state()).toMatchObject({ running: false, error: expect.stringContaining('could not finish') })
    expect(job.state().error).not.toContain('secret')
    expect(job.isRunning()).toBe(false)
  })

  it('treats a scrape that throws before it even starts as a failed run, not a crash', async () => {
    const job = createScrapeJob({ run: () => { throw new Error('config missing') } })
    await job.start()
    expect(job.state()).toMatchObject({ running: false, error: expect.any(String) })
  })

  it('ignores progress that arrives after the run ended', async () => {
    const held = heldRun()
    const job = createScrapeJob({ run: held.run })
    const running = job.start()
    await vi.waitFor(() => expect(held.run).toHaveBeenCalled())
    held.finish(RESULT)
    await running
    held.progress({ done: 5, total: 9, current: 'late' })
    expect(job.state()).toMatchObject({ done: 0, total: 0 })
    expect(job.state()).not.toHaveProperty('current')
  })
})

import { describe, it, expect, vi, beforeAll, afterAll, afterEach } from 'vitest'
import { createServer } from 'node:http'
import { createRequire } from 'node:module'
import { readFileSync, existsSync, mkdtempSync, writeFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { findBrowser } from '@jobdekho/server/apply/browser-find.js'
import { windowModeFor } from '@jobdekho/server/apply/window-mode.js'
import { launchBrowser } from '@jobdekho/server/apply/browser-launch.js'
import { countBrowsers } from '@jobdekho/server/apply/browser-reap.js'
import { createRegistry } from '@jobdekho/server/apply/session-registry.js'
import { onSocketMessage } from '@jobdekho/server/apply/session-input.js'
import { askOnPage } from '@jobdekho/server/apply/ask-run.js'
import { CLAUDE } from '@jobdekho/server/ai/providers.js'

// The whole loop against this computer's own Chrome or Edge and two local
// pages: open, stream, fill, relay, pick, attach, hand over, close. Skipped
// where there is no browser; never touches a live site.
const browser = findBrowser()
const HERE = dirname(fileURLToPath(import.meta.url))
const require = createRequire(import.meta.url)
// The web app's own React, from its package folder: the packages export no
// path to their browser builds.
const packageDir = (name) => dirname(require.resolve(name))
const FILES = {
  '/form.html': join(HERE, 'fixtures/apply/form.html'),
  '/sign-in.html': join(HERE, 'fixtures/apply/sign-in.html'),
  '/react.js': join(packageDir('react'), 'umd/react.production.min.js'),
  '/react-dom.js': join(packageDir('react-dom'), 'umd/react-dom.production.min.js'),
}
const PROFILE = { basics: { name: 'Demo Candidate', email: 'demo@example.com', phone: '+91 90000 00000', location: 'Pune, India', links: { linkedin: 'linkedin.com/in/demo' } }, experience: [{ title: 'Engineer', organisation: 'Startup Co', endDate: 'Present' }] }

let server
let base
let pdfDir
let registry

async function waitFor(check, ms = 20000) {
  const until = Date.now() + ms
  while (Date.now() < until) {
    if (await check()) return true
    await new Promise((resolve) => setTimeout(resolve, 100))
  }
  return false
}

const pageState = (s) => s.active.page.evaluate(() => ({ ...JSON.parse(document.getElementById('state').textContent), submitted: window.__submitted, clicks: window.__submitClicks }))
const centre = (s, selector) => s.active.page.evaluate((q) => {
  const el = document.querySelector(q)
  el.scrollIntoView({ block: 'center' })
  const box = el.getBoundingClientRect()
  return { x: Math.round(box.left + box.width / 2), y: Math.round(box.top + box.height / 2) }
}, selector)
const press = async (s, at) => {
  await onSocketMessage(s, { t: 'down', ...at, button: 'left', clicks: 1 })
  await onSocketMessage(s, { t: 'up', ...at, button: 'left', clicks: 1 })
}

describe.skipIf(!browser)('Apply assist in a real browser', () => {
  beforeAll(async () => {
    server = createServer((req, res) => {
      const file = FILES[new URL(req.url, 'http://x').pathname]
      if (!file) return res.writeHead(404).end()
      res.writeHead(200, { 'content-type': file.endsWith('.html') ? 'text/html; charset=utf-8' : 'text/javascript' }).end(readFileSync(file))
    })
    await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve))
    base = `http://127.0.0.1:${server.address().port}`
    pdfDir = mkdtempSync(join(tmpdir(), 'jobdekho-test-apply-pdfs-'))
    const pdf = (name) => {
      writeFileSync(join(pdfDir, name), '%PDF-1.4 fixture')
      return { path: join(pdfDir, name), name }
    }
    const files = { resume: pdf('Demo Candidate Resume.pdf'), cover: pdf('Demo Candidate Cover Letter.pdf') }
    registry = createRegistry({
      findBrowser: () => browser, windowMode: () => windowModeFor(), launch: launchBrowser, reap: async () => 0,
      port: 1, prepareFiles: async () => files, questions: () => null,
    })
  })

  // Each test ends its own session; this is the net under a failed one, so
  // the next test is not answered with the session left open.
  afterEach(async () => {
    await registry?.closeAll()
  })

  afterAll(async () => {
    await registry?.closeAll()
    await new Promise((resolve) => server.close(resolve))
    rmSync(pdfDir, { recursive: true, force: true })
  })

  it('fills a React form, attaches the files, streams it and leaves the submit to the person', async () => {
    const started = Date.now()
    const { session: s } = await registry.open({ posting: { id: 'p1', source: 'acme', url: `${base}/form.html` }, userId: 'u1', profile: PROFILE })
    const sent = []
    s.sockets.add({ readyState: 1, bufferedAmount: 0, send: (data) => sent.push(data), close() {} })
    expect(await waitFor(() => s.state === 'review')).toBe(true)
    const state = await pageState(s)
    expect(state).toMatchObject({
      firstName: 'Demo', lastName: 'Candidate', email: 'demo@example.com', phoneCountry: 'India (+91)', phone: '9000000000',
      city: 'Pune, Maharashtra, India', linkedin: 'https://linkedin.com/in/demo', residence: 'IN', company: 'Startup Co',
      resume: 'Demo Candidate Resume.pdf', cover: 'Demo Candidate Cover Letter.pdf', gender: '', notice: '', why: '', consent: false,
    })
    expect(state.submitted).toBe(false)
    expect(state.clicks).toBe(0)
    expect(s.reason).toBe('review')
    const status = Object.fromEntries(s.rows.map((r) => [r.label, r.status]))
    expect(status).toMatchObject({ 'First Name': 'filled', 'Resume/CV': 'attached', Gender: 'you', 'Notice period': 'you', 'Why do you want to work at Acme?': 'you', 'I agree to the privacy policy': 'you' })
    // A star on the words is a required mark, though neither input says so.
    const required = Object.fromEntries(s.rows.map((r) => [r.label, r.required]))
    expect(required).toMatchObject({ Phone: true, 'Resume/CV': true, 'LinkedIn Profile': false, 'Cover Letter': false })
    expect(s.seq).toBeGreaterThan(0)
    expect(sent.some((d) => Buffer.isBuffer(d))).toBe(true)
    expect(Date.now() - started).toBeLessThan(20000)

    // The person's own typing, in any script, through the live view.
    await press(s, await centre(s, '#why'))
    await onSocketMessage(s, { t: 'text', text: 'नमस्ते 😀' })
    expect(await waitFor(async () => (await pageState(s)).why === 'नमस्ते 😀', 5000)).toBe(true)

    // A native select's list is drawn by the panel, and the pick lands in the page.
    await press(s, await centre(s, '#gender'))
    expect(s.picker).toMatchObject({ kind: 'select' })
    await onSocketMessage(s, { t: 'pick', value: 'f' })
    expect(await waitFor(async () => (await pageState(s)).gender === 'f', 5000)).toBe(true)

    // The page's own Attach button asks for a file; the answer is one of the person's.
    await press(s, await centre(s, '#add-sample'))
    expect(await waitFor(() => s.chooser !== null, 5000)).toBe(true)
    await onSocketMessage(s, { t: 'chooser', choice: 'resume' })
    expect(await waitFor(async () => (await pageState(s)).sample === 'Demo Candidate Resume.pdf', 5000)).toBe(true)
    expect((await pageState(s)).submitted).toBe(false)

    const profileDir = s.profileDir
    await registry.close(s.id)
    expect(await countBrowsers(profileDir)).toBe(0)
    expect(existsSync(profileDir)).toBe(false)
  }, 60000)

  // The AI beside the form, with a stand-in for the CLI that answers the way
  // a model would: by the ids on the page's own list. The page is the judge.
  it('sets the answers the AI beside the form gives, a radio button too, and never presses Submit', async () => {
    const { session: s } = await registry.open({ posting: { id: 'p3', source: 'acme', url: `${base}/form.html`, title: 'Engineer', company: 'Acme' }, userId: 'u1', profile: PROFILE })
    expect(await waitFor(() => s.state === 'review')).toBe(true)
    const run = vi.fn(async ({ input }) => {
      const page = input.split('<<<PAGE\n')[1].split('\nPAGE>>>')[0].split('\n').map((line) => JSON.parse(line))
      const id = (words) => page.find((q) => q.question.startsWith(words))?.id
      const fill = [
        { field: id('Notice period'), value: '30 days' },
        { field: id('Why do you want'), value: 'I build products like Acme does.' },
        { field: id('Willing to relocate'), value: 'Yes' },
      ]
      return { stdout: JSON.stringify({ type: 'result', result: JSON.stringify({ reply: 'Set all three.', fill }) }), stderr: '', code: 0 }
    })
    const message = 'Say 30 days notice, yes to relocating, and write why I want this job'
    const seams = { run, locate: () => 'claude', scratch: (work) => work(pdfDir) }
    const out = await askOnPage(s, { message, resumeText: 'Engineer at Startup Co.', select: async () => CLAUDE, seams })
    expect(out.reply).toBe('Set all three.')
    expect(out.filled.map((f) => f.result)).toEqual(['filled', 'filled', 'filled'])
    const state = await pageState(s)
    expect(state).toMatchObject({ notice: '30', why: 'I build products like Acme does.', relocate: 'yes', consent: false })
    expect(state.submitted).toBe(false)
    expect(state.clicks).toBe(0)
    expect(s.chat.map((t) => t.who)).toEqual(['you', 'ai'])
    await registry.close(s.id)
  }, 60000)

  it('hands a sign-in wall to the person without touching it', async () => {
    const { session: s } = await registry.open({ posting: { id: 'p2', source: 'acme', url: `${base}/sign-in.html` }, userId: 'u1', profile: PROFILE })
    expect(await waitFor(() => s.state === 'yours')).toBe(true)
    expect(s.reason).toBe('sign-in')
    const touched = await s.active.page.evaluate(() => ({ email: document.getElementById('email').value, clicks: window.__signInClicks ?? 0 }))
    expect(touched).toEqual({ email: '', clicks: 0 })
    expect(s.rows.find((r) => r.label === 'Password')).toMatchObject({ status: 'you', preview: '' })
    const profileDir = s.profileDir
    await registry.close(s.id)
    expect(await countBrowsers(profileDir)).toBe(0)
  }, 60000)
})

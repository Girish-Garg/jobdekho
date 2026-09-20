import { describe, it, expect, vi } from 'vitest'
import { buildApp } from '@jobdekho/server/app.js'
import { readNdjson, NDJSON_TYPE } from '@jobdekho/server/ai/events.js'

const config = { googleClientId: 'id', googleClientSecret: 'sec', sessionSecret: 'test-secret', baseUrl: 'http://localhost:3000' }

const STORED = { skills: ['react'], titles: [], locations: [], years: 2, degree: 'bachelors', resumeName: 'cv.pdf' }

function makeFakeStore({ profile = STORED, resumeText = 'Jane Doe, two years of React.' } = {}) {
  return {
    listPostingsForUser: vi.fn().mockResolvedValue([]),
    setPostingStatus: vi.fn(),
    listSources: vi.fn().mockResolvedValue([]),
    getProfile: vi.fn().mockResolvedValue(profile),
    getResumeText: vi.fn().mockResolvedValue(resumeText),
    // The real store never returns the text, only the name.
    upsertProfile: vi.fn(async (_userId, { resumeText: _text, ...rest }) => rest),
    deleteProfile: vi.fn(),
    getUserFilters: vi.fn().mockResolvedValue(null),
    upsertUserFilters: vi.fn(),
  }
}

// A machine with no AI CLI at all. `run` throwing is the proof that nothing
// tried to spawn one anyway.
const NO_CLI = { locate: () => null, run: vi.fn(async () => { throw new Error('a test spawned a CLI') }) }

// `locate` finds every CLI at the same path, so both are probed; `home` holds
// no CLI settings, so the Antigravity gate (agy-settings.js) reads nothing.
const cliAnswering = (stdout) => ({
  locate: () => '/usr/local/bin/claude',
  run: vi.fn(async () => ({ stdout, stderr: '', code: 0 })),
  home: '/no/such/home',
})
// A machine with Claude Code alone, for the cases where its own failure is
// the answer: with a second CLI installed, a dead login is a reason to try
// that one instead (see ai/fallback.js), not a reason to give up.
const onlyClaude = (stdout) => ({
  locate: (binary) => (binary === 'claude' ? '/usr/local/bin/claude' : null),
  run: vi.fn(async () => ({ stdout, stderr: '', code: 0 })),
  home: '/no/such/home',
})

const envelope = (result, extra = {}) => JSON.stringify({ type: 'result', result, ...extra })

async function makeApp(store, cli = NO_CLI) {
  const app = buildApp({ config, userStore: { upsertUser: vi.fn(), getUserById: vi.fn() }, fetchProfile: vi.fn(), dashboardStore: store })
  app.decorate('cli', cli)
  // buildApp registers the AI routes through apiRoutes; registering them here
  // as well is a duplicate route and Fastify refuses to start.
  await app.ready()
  const cookie = `session=${app.jwt.sign({ sub: 'u1', email: 'a@b.c', name: 'A', avatarUrl: null })}`
  return { app, cookie }
}

// The smallest PDF pdf.js will read a text layer out of. Lines are kept short
// because text past the page edge is dropped from the layer.
function tinyPdf(text) {
  const lines = text.match(/.{1,60}(\s|$)/g).map((l) => `(${l.trim()}) Tj 0 -14 Td`)
  const content = `BT /F1 12 Tf 50 750 Td ${lines.join(' ')} ET`
  const objects = [
    '<< /Type /Catalog /Pages 2 0 R >>',
    '<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
    '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>',
    `<< /Length ${content.length} >>\nstream\n${content}\nendstream`,
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>',
  ]
  let pdf = '%PDF-1.4\n'
  const offsets = []
  objects.forEach((body, i) => { offsets.push(pdf.length); pdf += `${i + 1} 0 obj\n${body}\nendobj\n` })
  const xref = pdf.length
  pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`
  for (const o of offsets) pdf += `${String(o).padStart(10, '0')} 00000 n \n`
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF\n`
  return Buffer.from(pdf, 'latin1')
}

const RESUME = 'Jane Doe React developer with three years of experience building web applications '
  + 'in TypeScript and Node. Worked at Acme on dashboards and at Globex on billing. Bachelors in '
  + 'computer science from a university in Pune. Skills include react node postgres docker and playwright.'

function multipart(filename, buffer) {
  const boundary = 'jobdekho-test-boundary'
  const head = `--${boundary}\r\nContent-Disposition: form-data; name="file"; filename="${filename}"\r\nContent-Type: application/pdf\r\n\r\n`
  return {
    body: Buffer.concat([Buffer.from(head), buffer, Buffer.from(`\r\n--${boundary}--\r\n`)]),
    headers: { 'content-type': `multipart/form-data; boundary=${boundary}` },
  }
}

async function upload(store, filename, buffer, cli) {
  const { app, cookie } = await makeApp(store, cli)
  const { body, headers } = multipart(filename, buffer)
  return app.inject({ method: 'POST', url: '/api/profile/resume', headers: { ...headers, cookie }, body })
}

describe('POST /api/profile/resume', () => {
  it('stores the text and returns without any CLI installed at all', async () => {
    const store = makeFakeStore()
    const res = await upload(store, 'cv.pdf', tinyPdf(RESUME), NO_CLI)
    expect(res.statusCode).toBe(200)
    expect(NO_CLI.run).not.toHaveBeenCalled()
    const [, saved] = store.upsertProfile.mock.calls[0]
    expect(saved.resumeText).toContain('Jane Doe')
    expect(saved.resumeText).toContain('playwright')
    expect(saved.resumeName).toBe('cv.pdf')
    expect(res.json()).toMatchObject({ resumeName: 'cv.pdf' })
    expect(res.json().resumeText).toBeUndefined()
  })

  // Extraction is a separate action now; a re-upload must not throw away a
  // profile the person corrected by hand.
  it('keeps the hand-edited profile fields', async () => {
    const store = makeFakeStore()
    await upload(store, 'cv.pdf', tinyPdf(RESUME))
    const [, saved] = store.upsertProfile.mock.calls[0]
    expect(saved).toMatchObject({ skills: ['react'], years: 2, degree: 'bachelors' })
  })

  it('still answers 422 with the type-it-in message for a scanned PDF', async () => {
    const store = makeFakeStore()
    const res = await upload(store, 'scan.pdf', tinyPdf('short'))
    expect(res.statusCode).toBe(422)
    expect(res.json().error).toMatch(/scanned PDF, so type the details in by hand/)
    expect(store.upsertProfile).not.toHaveBeenCalled()
  })

  it('answers 400 when no file was sent', async () => {
    const { app, cookie } = await makeApp(makeFakeStore())
    const { headers } = multipart('x.pdf', Buffer.alloc(0))
    const res = await app.inject({ method: 'POST', url: '/api/profile/resume', headers: { ...headers, cookie }, body: Buffer.from('--jobdekho-test-boundary--\r\n') })
    expect(res.statusCode).toBe(400)
  })
})

async function extract(store, cli, headers = {}) {
  const { app, cookie } = await makeApp(store, cli)
  return app.inject({ method: 'POST', url: '/api/profile/extract', headers: { cookie, ...headers } })
}

describe('POST /api/profile/extract', () => {
  it('asks for a resume first when none is stored', async () => {
    const store = makeFakeStore({ resumeText: null })
    const res = await extract(store, NO_CLI)
    expect(res.statusCode).toBe(400)
    expect(res.json()).toEqual({ error: 'Upload a resume first.' })
  })

  // Either CLI can read a resume, so the sentence offers both.
  it('says no CLI is installed, and how to fix that, when none is', async () => {
    const res = await extract(makeFakeStore(), NO_CLI)
    expect(res.statusCode).toBe(503)
    expect(res.json().kind).toBe('not_found')
    expect(res.json().error).toMatch(/^Neither Claude Code nor Antigravity is installed.*claude\.ai\/code.*antigravity\.google/)
  })

  // Exit code 0 with is_error in the envelope: the trap.
  it('reports an expired login even though the CLI exited 0', async () => {
    const cli = onlyClaude(envelope('Failed to authenticate: OAuth session expired', { is_error: true }))
    const res = await extract(makeFakeStore(), cli)
    expect(res.statusCode).toBe(503)
    expect(res.json().kind).toBe('login')
    expect(res.json().error).toMatch(/OAuth session expired.*run "claude"/)
  })

  it('answers 422 when the reply holds no profile', async () => {
    const res = await extract(makeFakeStore(), cliAnswering(envelope('I would rather not.')))
    expect(res.statusCode).toBe(422)
    expect(res.json().kind).toBe('unreadable')
  })

  it('sends the stored text, saves the extracted fields and keeps the resume with them', async () => {
    const store = makeFakeStore()
    const cli = cliAnswering(envelope('{"skills":["node"],"titles":["backend"],"years":3,"degree":"masters","locations":["pune"]}'))
    const res = await extract(store, cli)
    expect(res.statusCode).toBe(200)
    expect(cli.run.mock.calls.at(-1)[0].input).toContain('Jane Doe, two years of React.')
    expect(store.upsertProfile).toHaveBeenCalledWith('u1', {
      skills: ['node'], titles: ['backend'], years: 3, degree: 'masters', locations: ['pune'],
      resumeText: 'Jane Doe, two years of React.', resumeName: 'cv.pdf',
    })
    expect(res.json()).toMatchObject({ skills: ['node'], resumeName: 'cv.pdf' })
  })

  // The heart of "extraction proposes, the person keeps or discards": the
  // structured entries ride along in the response for review, but never
  // reach upsertProfile, so a hand-typed experience entry already on the
  // profile is never in the room to be overwritten by this call.
  it('returns proposed experience, projects and education without saving them', async () => {
    const store = makeFakeStore()
    const cli = cliAnswering(envelope(JSON.stringify({
      skills: ['node'],
      experience: [{ title: 'Backend Engineer', organisation: 'Acme' }],
      projects: [{ title: 'Side project' }],
      education: [{ title: 'B.Tech', organisation: 'IIT' }],
    })))
    const res = await extract(store, cli)
    expect(res.statusCode).toBe(200)
    expect(store.upsertProfile).toHaveBeenCalledWith('u1', {
      skills: ['node'], resumeText: 'Jane Doe, two years of React.', resumeName: 'cv.pdf',
    })
    expect(res.json().proposed).toEqual({
      experience: [{ title: 'Backend Engineer', organisation: 'Acme' }],
      projects: [{ title: 'Side project' }],
      education: [{ title: 'B.Tech', organisation: 'IIT' }],
    })
  })

  it('proposes nothing structured when the reply carries none', async () => {
    const store = makeFakeStore()
    const res = await extract(store, cliAnswering(envelope('{"skills":["node"]}')))
    expect(res.json().proposed).toEqual({ experience: [], projects: [], education: [] })
  })
})

describe('POST /api/profile/extract as NDJSON', () => {
  const accept = { accept: NDJSON_TYPE }
  const reply = envelope('{"skills":["node"],"years":3}')

  it('streams progress lines and ends on exactly the body a plain caller gets', async () => {
    const plain = await extract(makeFakeStore(), cliAnswering(reply))
    const streamed = await extract(makeFakeStore(), cliAnswering(reply), accept)
    expect(streamed.statusCode).toBe(200)
    expect(streamed.headers['content-type']).toMatch(/application\/x-ndjson/)
    const { events, result } = readNdjson(streamed.body)
    expect(events.map((e) => e.event === 'start' ? 'start' : e.stage)).toEqual(['start', 'send', 'reply'])
    expect(result).toEqual(plain.json())
  })

  it('reports a failure as a last line with error and kind, under a 200', async () => {
    const cli = onlyClaude(envelope('Failed to authenticate', { is_error: true }))
    const res = await extract(makeFakeStore(), cli, accept)
    expect(res.statusCode).toBe(200)
    const { result } = readNdjson(res.body)
    expect(result.kind).toBe('login')
    expect(result.error).toMatch(/not signed in/)
  })

  it('answers the no-resume case as plain JSON, not a stream', async () => {
    const res = await extract(makeFakeStore({ resumeText: null }), NO_CLI, accept)
    expect(res.statusCode).toBe(400)
    expect(res.headers['content-type']).toMatch(/application\/json/)
  })
})

describe('PUT /api/profile', () => {
  it('carries the stored resume through a hand edit instead of wiping it', async () => {
    const store = makeFakeStore()
    const { app, cookie } = await makeApp(store)
    const res = await app.inject({
      method: 'PUT', url: '/api/profile',
      headers: { cookie, 'content-type': 'application/json' }, body: JSON.stringify({ skills: ['vue'] }),
    })
    expect(res.statusCode).toBe(200)
    expect(store.upsertProfile).toHaveBeenCalledWith('u1', {
      skills: ['vue'], resumeText: 'Jane Doe, two years of React.', resumeName: 'cv.pdf',
    })
  })
})

describe('GET /api/ai/providers', () => {
  it('returns 401 without a cookie', async () => {
    const { app } = await makeApp(makeFakeStore())
    expect((await app.inject({ method: 'GET', url: '/api/ai/providers' })).statusCode).toBe(401)
  })

  it('lists what is installed, whether it runs, and which policies it can take', async () => {
    const { app, cookie } = await makeApp(makeFakeStore(), cliAnswering('2.1.245 (Claude Code)\n'))
    const res = await app.inject({ method: 'GET', url: '/api/ai/providers', headers: { cookie } })
    expect(res.statusCode).toBe(200)
    expect(res.json()).toEqual({ providers: [
      {
        id: 'claude', label: 'Claude Code', install: 'https://claude.ai/code', policies: ['none', 'web'],
        present: true, path: '/usr/local/bin/claude', runs: true, version: '2.1.245 (Claude Code)', error: null,
      },
      {
        id: 'agy', label: 'Antigravity', install: 'https://antigravity.google', policies: ['none'],
        present: true, path: '/usr/local/bin/claude', runs: true, version: '2.1.245 (Claude Code)', error: null,
      },
    ] })
  })

  it('says so when nothing is installed', async () => {
    const { app, cookie } = await makeApp(makeFakeStore(), NO_CLI)
    const res = await app.inject({ method: 'GET', url: '/api/ai/providers', headers: { cookie } })
    expect(res.json().providers[0]).toMatchObject({ id: 'claude', present: false, runs: false })
  })
})

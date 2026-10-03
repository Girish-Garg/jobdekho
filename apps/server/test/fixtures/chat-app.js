import { vi } from 'vitest'
import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { buildApp } from '@jobdekho/server/app.js'
import { createDashboardStore } from '@jobdekho/server/api/store.js'
import { openStore } from '@jobdekho/store/open.js'
import { upsertPostings } from '@jobdekho/store/queries.js'

const envelope = (obj) => JSON.stringify({ type: 'result', result: typeof obj === 'string' ? obj : JSON.stringify(obj) })

// Claude Code on PATH, every prompt held until the test lets it answer, in
// the order they were asked, so a call can be looked at while it runs.
// `answer({ args, input })` is the model's reply to that prompt; `failing`
// makes every call exit as a CLI that broke.
export function heldCli(answer = () => ({ reply: 'Two are remote.' }), { failing = false } = {}) {
  const waiting = []
  let asked = 0
  const run = vi.fn(async (call) => {
    if (call.args[0] === '--version') return { stdout: '2.1.0', stderr: '', code: 0 }
    asked += 1
    await new Promise((resolve) => waiting.push(resolve))
    return failing ? { stdout: '', stderr: 'boom', code: 1 } : { stdout: envelope(answer(call)), stderr: '', code: 0 }
  })
  const prompts = () => run.mock.calls.map(([call]) => call).filter((call) => call.args[0] !== '--version')
  return {
    cli: { locate: () => '/usr/local/bin/claude', run, scratch: (work) => work('/scratch') },
    release: () => waiting.shift()?.(),
    asked: () => asked,
    prompts,
  }
}

// The same CLI answering at once.
export const answeringCli = (answer) => {
  const held = heldCli(answer)
  held.cli.run.mockImplementation(async (call) => {
    if (call.args[0] === '--version') return { stdout: '2.1.0', stderr: '', code: 0 }
    return { stdout: envelope(answer(call)), stderr: '', code: 0 }
  })
  return held
}

export const posting = (id, title, company, extra = {}) => ({
  id, source: 'lever', externalId: id, title, company, url: `https://jobs.example/${id}`,
  descriptionSnippet: `${title} at ${company}: build things in React.`, tags: ['react'], postedAt: new Date().toISOString(), ...extra,
})

const dirs = []
export function cleanUp() {
  while (dirs.length) rmSync(dirs.pop(), { recursive: true, force: true })
}

export const until = async (check) => {
  for (let i = 0; i < 400 && !(await check()); i += 1) await new Promise((resolve) => setTimeout(resolve, 5))
}

let people = 0

// The app on a real store in a temporary folder, as a person no other test
// shares the one call slot with. `postings` go into the corpus first;
// `seed(store, userId)` adds anything else.
export async function chatApp({ cli = heldCli().cli, postings = [], seed } = {}) {
  const dir = mkdtempSync(join(tmpdir(), 'jobdekho-chat-app-'))
  dirs.push(dir)
  const store = openStore(dir)
  const userId = `chat-person-${people += 1}`
  if (postings.length) await upsertPostings(store, postings)
  if (seed) await seed(store, userId)
  const app = buildApp({ config: { sessionSecret: 'test-secret' }, dashboardStore: createDashboardStore(store) })
  app.decorate('cli', cli)
  app.decorate('chatStore', store)
  app.decorate('documentStore', store)
  await app.ready()
  const cookie = `session=${app.jwt.sign({ sub: userId, email: 'a@b.c', name: 'A', avatarUrl: null })}`
  const call = (method, url, body, headers = {}) => app.inject({
    method, url, headers: { cookie, ...(body ? { 'content-type': 'application/json' } : {}), ...headers }, ...(body ? { payload: JSON.stringify(body) } : {}),
  })
  return {
    app, store, userId, call,
    ask: (chatId, message, extra = {}) => call('POST', `/api/chats/${chatId}/messages`, { message, ...extra }),
    action: (postingId, kind, body = {}) => call('POST', `/api/postings/${postingId}/ai/${kind}`, body),
    pending: async () => (await call('GET', '/api/chats/pending')).json(),
    page: async (chatId) => (await call('GET', `/api/chats/${chatId}/messages`)).json(),
    list: async () => (await call('GET', '/api/chats')).json().chats,
    newChat: async (body = { kind: 'general' }) => (await call('POST', '/api/chats', body)).json().chat,
  }
}

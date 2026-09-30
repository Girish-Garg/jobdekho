import { describe, it, expect, vi } from 'vitest'
import { createWebMemo } from '@jobdekho/server/ai/web-status-memo.js'
import { probeOllama } from '@jobdekho/server/ai/ollama-probe.js'

const NO_ENV = {}
const MODEL = { name: 'qwen3:8b', size: 5, capabilities: ['completion', 'tools'], details: { context_length: 40960 } }

// A local Ollama that can search: every path the probe reads, answered,
// with a count of how often ollama.com (behind /api/me) was asked.
function signedIn() {
  const asked = { me: 0 }
  const http = vi.fn(async ({ url }) => {
    const path = new URL(url).pathname
    if (path === '/api/version') return { status: 200, body: { version: '0.32.12' } }
    if (path === '/api/tags') return { status: 200, body: { models: [MODEL] } }
    if (path === '/api/status') return { status: 200, body: { cloud: { disabled: false } } }
    if (path === '/api/me') { asked.me += 1; return { status: 200, body: {} } }
    return { status: 400, body: { error: 'missing request body' } }
  })
  return { http, asked }
}

describe('Ollama web status between detections', () => {
  it('asks ollama.com once for ten minutes, however often detection runs', async () => {
    let t = 0
    const remember = createWebMemo({ now: () => t })
    const { http, asked } = signedIn()
    const probe = () => probeOllama({ http, env: NO_ENV, remember })
    expect((await probe()).policies).toEqual(['none', 'web'])
    t = 9 * 60 * 1000
    await probe()
    expect(asked.me).toBe(1)
    t = 11 * 60 * 1000
    await probe()
    expect(asked.me).toBe(2)
  })

  // "Check again" after signing in must not wait out the ten minutes.
  it('asks afresh when the person asks to check again', async () => {
    const remember = createWebMemo({ now: () => 0 })
    const { http, asked } = signedIn()
    await probeOllama({ http, env: NO_ENV, remember })
    await probeOllama({ http, env: NO_ENV, remember, refresh: true })
    expect(asked.me).toBe(2)
  })

  it('does not keep an answer ollama.com gave by not answering', async () => {
    const remember = createWebMemo({ now: () => 0 })
    const work = vi.fn(async () => ({ policies: ['none'], webHint: 'x' }))
    await remember('k', work, { keep: () => false })
    await remember('k', work, { keep: () => false })
    expect(work).toHaveBeenCalledTimes(2)
  })

  it('asks again when the models that use tools change', async () => {
    const remember = createWebMemo({ now: () => 0 })
    const work = vi.fn(async () => 'answer')
    await remember('qwen3:8b', work)
    await remember('qwen3:8b llama3.2', work)
    expect(work).toHaveBeenCalledTimes(2)
  })
})

import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { openStore } from '@jobdekho/store/open.js'
import { normalizeProviderPref, getProviderPref, upsertProviderPref } from '@jobdekho/store/ai-provider-pref.js'

let dir
let store
beforeEach(() => { dir = mkdtempSync(join(tmpdir(), 'jobdekho-store-')); store = openStore(dir) })
afterEach(() => { rmSync(dir, { recursive: true, force: true }) })

describe('normalizeProviderPref', () => {
  it('defaults to auto for nothing, an empty value, or a non-string, with no models', () => {
    expect(normalizeProviderPref(undefined)).toEqual({ provider: 'auto', models: {} })
    expect(normalizeProviderPref({})).toEqual({ provider: 'auto', models: {} })
    expect(normalizeProviderPref({ provider: '' })).toEqual({ provider: 'auto', models: {} })
    expect(normalizeProviderPref({ provider: 7 })).toEqual({ provider: 'auto', models: {} })
  })

  it('keeps any other provider id as given, ids are not this layer\'s business', () => {
    expect(normalizeProviderPref({ provider: 'claude' }).provider).toBe('claude')
    expect(normalizeProviderPref({ provider: 'agy' }).provider).toBe('agy')
    expect(normalizeProviderPref({ provider: 'ollama' }).provider).toBe('ollama')
  })

  // Each is checked against what its AI lists when it is saved, not here.
  it('keeps a model per AI, and leaves one out until it is picked', () => {
    const models = { claude: 'opus', agy: 'gemini-3.8-flash-low', ollama: 'qwen3:8b' }
    expect(normalizeProviderPref({ provider: 'agy', models })).toEqual({ provider: 'agy', models })
    expect(normalizeProviderPref({ models: { claude: 'sonnet' } })).toEqual({ provider: 'auto', models: { claude: 'sonnet' } })
    expect(normalizeProviderPref({ models: { claude: '', agy: 42, ollama: null } })).toEqual({ provider: 'auto', models: {} })
  })

  it('drops a models value that is not a map, and keys that are not provider ids', () => {
    expect(normalizeProviderPref({ models: ['opus'] }).models).toEqual({})
    expect(normalizeProviderPref({ models: 'opus' }).models).toEqual({})
    expect(normalizeProviderPref({ models: JSON.parse('{"__proto__":"x","Bad Key":"y","claude":"opus"}') }).models).toEqual({ claude: 'opus' })
  })

  // Saved before every AI had a model: Ollama's pick is not lost.
  it('reads an old ollamaModel as the Ollama model, and writes the new shape', () => {
    expect(normalizeProviderPref({ provider: 'ollama', ollamaModel: 'qwen3:8b' })).toEqual({ provider: 'ollama', models: { ollama: 'qwen3:8b' } })
    expect(normalizeProviderPref({ ollamaModel: 'llama3.2:3b', models: { claude: 'opus' } }))
      .toEqual({ provider: 'auto', models: { ollama: 'llama3.2:3b', claude: 'opus' } })
    expect(normalizeProviderPref({ provider: 'claude', ollamaModel: '' })).toEqual({ provider: 'claude', models: {} })
  })

  it('lets a model saved in the new shape win over an old one', () => {
    expect(normalizeProviderPref({ ollamaModel: 'old:1b', models: { ollama: 'new:8b' } }).models).toEqual({ ollama: 'new:8b' })
  })
})

describe('getProviderPref / upsertProviderPref', () => {
  it('reads null until saved, then the normalized record', async () => {
    expect(await getProviderPref(store, 'me')).toBeNull()
    await upsertProviderPref(store, 'me', { provider: 'claude' })
    expect(await getProviderPref(store, 'me')).toEqual({ provider: 'claude', models: {} })
  })

  it('reads the models back with the provider', async () => {
    await upsertProviderPref(store, 'me', { provider: 'ollama', models: { ollama: 'qwen3:8b', claude: 'haiku' } })
    expect(await getProviderPref(store, 'me')).toEqual({ provider: 'ollama', models: { ollama: 'qwen3:8b', claude: 'haiku' } })
  })

  // A file written before this change, read as it is on disk.
  it('migrates a record saved with ollamaModel when it is read, and drops the old field when saved', async () => {
    store.aiProvider.set('me', { provider: 'ollama', ollamaModel: 'qwen3:8b' })
    const read = await getProviderPref(store, 'me')
    expect(read).toEqual({ provider: 'ollama', models: { ollama: 'qwen3:8b' } })
    await upsertProviderPref(store, 'me', read)
    expect(store.aiProvider.get('me')).toEqual({ provider: 'ollama', models: { ollama: 'qwen3:8b' } })
  })

  it('keeps one person\'s preference from leaking into another\'s read', async () => {
    await upsertProviderPref(store, 'me', { provider: 'agy' })
    expect(await getProviderPref(store, 'someone-else')).toBeNull()
  })
})

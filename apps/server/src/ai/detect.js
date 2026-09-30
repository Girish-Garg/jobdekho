import { homedir } from 'node:os'
import { PROVIDERS } from './providers.js'
import { locateBinary } from './locate.js'
import { runCli } from './spawn.js'
import { httpJson, offline } from './http-json.js'
import { createModelLists } from './model-lists.js'
import { createWebMemo } from './web-status-memo.js'

// A version probe is a process start, not a model call: it costs nothing and
// proves the binary runs. Whether the person is signed in is deliberately not
// checked here, because the only way to know is a real call, and that costs
// money and time on every settings-screen load. The first real call fails
// with a sentence that says what to do instead.
const PROBE_TIMEOUT_MS = 15000

// A settings screen asks on every load. A minute is long enough to make that
// free and short enough that an install the person just finished shows up.
const DEFAULT_TTL_MS = 60000

const firstLine = (text) => String(text).trim().split('\n')[0] || null

// `policies` rides along so a browser can tell which installed CLI can take
// which action without knowing the CLIs (see select.js for the same choice
// made server-side).
//
// An install that must not be used (Antigravity with tools pre-approved in
// its settings, see agy-settings.js) is reported the way one that will not
// run is: present, runs false, and the sentence saying why. It is asked
// before the probe because it is a file read where the probe is a process.
//
// A provider served on this computer (Ollama) is installed when its binary
// is on PATH like any other, and then asked by its own probe, which reads
// its local server rather than starting a process, lists the models it
// could answer with, and narrows its policies to what it can do right now
// (see ollama-probe.js); until then its row says `policiesUnprobed`.
//
// Every row has `models`, [{ id, label }], the ones Settings offers and a
// call may be bound to: none unless it runs. A CLI's come from its
// `listModels`, asked beside the version probe and kept longer than this
// cache, since agy's listing takes seconds where its probe takes a fraction
// of one (see model-lists.js).
async function inspect(provider, { locate, run, home, http, listRun, lists, remember, refresh }) {
  const policies = provider.policiesUnprobed ?? provider.policies
  // `local` rides the row so Settings can say a model runs on this computer.
  const base = { id: provider.id, label: provider.label, install: provider.install, policies, models: [], ...(provider.local ? { local: true } : {}) }
  const path = locate(provider.binary)
  if (!path) return { ...base, present: false, path: null, runs: false, version: null, error: null }
  if (provider.probe) return { ...base, present: true, path, ...(await provider.probe({ http, remember, refresh })) }
  const unusable = (error) => ({ ...base, present: true, path, runs: false, version: null, error })
  const broken = (detail) => unusable(`${provider.label} is installed at ${path} but could not run: ${detail}`)
  const refusal = provider.unusable?.({ home })
  if (refusal) return unusable(refusal)
  try {
    const [{ stdout, stderr, code }, models] = await Promise.all([
      run({ file: path, args: provider.versionArgs, input: '', timeoutMs: PROBE_TIMEOUT_MS }),
      lists(provider, { run: listRun, path, refresh }),
    ])
    if (code !== 0) return broken(stderr.trim().slice(0, 200) || `exited with code ${code}`)
    return { ...base, present: true, path, runs: true, version: firstLine(stdout), error: null, models }
  } catch (err) {
    return broken(err.message)
  }
}

// Returns a detect() whose answer is cached for ttlMs. The promise itself is
// cached, so two loads arriving together share one probe instead of racing.
// `home` is where a CLI's own settings are looked for, injectable so a test
// never reads the real ones. `http` reaches a local model server; a caller
// that fakes `run` but not `http` gets one where nothing answers, so a test
// never finds the Ollama that may be running on the machine it runs on.
// `listRun` starts a CLI's model listing the same way: null for a caller
// that fakes `run` alone, whose fake would otherwise read the listing as a
// prompt, so that CLI offers "Default" alone (see agy-models.js).
export function createDetector({
  locate = locateBinary, run = runCli, http = run === runCli ? httpJson : offline, listRun = run === runCli ? runCli : null,
  providers = PROVIDERS, ttlMs = DEFAULT_TTL_MS, now = Date.now, home = homedir(),
} = {}) {
  let cached = null
  const lists = createModelLists({ now })
  const remember = createWebMemo({ now })
  return function detect({ refresh = false } = {}) {
    if (refresh || !cached || now() - cached.at >= ttlMs) {
      const seams = { locate, run, home, http, listRun, lists, remember, refresh }
      cached = { at: now(), list: Promise.all(providers.map((p) => inspect(p, seams))) }
    }
    return cached.list
  }
}

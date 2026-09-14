import { homedir } from 'node:os'
import { PROVIDERS } from './providers.js'
import { locateBinary } from './locate.js'
import { runCli } from './spawn.js'

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
async function inspect(provider, { locate, run, home }) {
  const base = { id: provider.id, label: provider.label, install: provider.install, policies: provider.policies }
  const path = locate(provider.binary)
  if (!path) return { ...base, present: false, path: null, runs: false, version: null, error: null }
  const unusable = (error) => ({ ...base, present: true, path, runs: false, version: null, error })
  const broken = (detail) => unusable(`${provider.label} is installed at ${path} but could not run: ${detail}`)
  const refusal = provider.unusable?.({ home })
  if (refusal) return unusable(refusal)
  try {
    const { stdout, stderr, code } = await run({ file: path, args: provider.versionArgs, input: '', timeoutMs: PROBE_TIMEOUT_MS })
    if (code !== 0) return broken(stderr.trim().slice(0, 200) || `exited with code ${code}`)
    return { ...base, present: true, path, runs: true, version: firstLine(stdout), error: null }
  } catch (err) {
    return broken(err.message)
  }
}

// Returns a detect() whose answer is cached for ttlMs. The promise itself is
// cached, so two loads arriving together share one probe instead of racing.
// `home` is where a CLI's own settings are looked for, injectable so a test
// never reads the real ones.
export function createDetector({
  locate = locateBinary, run = runCli, providers = PROVIDERS, ttlMs = DEFAULT_TTL_MS, now = Date.now, home = homedir(),
} = {}) {
  let cached = null
  return function detect({ refresh = false } = {}) {
    if (refresh || !cached || now() - cached.at >= ttlMs) {
      cached = { at: now(), list: Promise.all(providers.map((p) => inspect(p, { locate, run, home }))) }
    }
    return cached.list
  }
}

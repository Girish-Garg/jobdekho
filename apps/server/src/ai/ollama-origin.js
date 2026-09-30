import { isLoopback } from './http-json.js'

// Where the local Ollama server listens, and what to tell the person when
// nothing answers there. Its own default is 127.0.0.1:11434.
const DEFAULT_PORT = '11434'
const DEFAULT_ORIGIN = `http://127.0.0.1:${DEFAULT_PORT}`

// Ollama reads OLLAMA_HOST for both the address its server binds to and the
// one its CLI talks to, so a person who moved the port set it here too. It is
// honoured only when it names this computer: a prompt goes to a model on
// another machine never, so any other host is ignored and the default is
// asked instead, which then reports "not running" if nothing is there. The
// bind-to-everything forms (0.0.0.0, [::]) mean "this computer, every
// interface", which a client reaches at 127.0.0.1.
const ANY_INTERFACE = /^(0\.0\.0\.0|\[::\])$/

export function ollamaOrigin(env = process.env) {
  const raw = String(env.OLLAMA_HOST ?? '').trim()
  if (!raw) return DEFAULT_ORIGIN
  let url
  try {
    url = new URL(/^[a-z][a-z0-9+.-]*:\/\//i.test(raw) ? raw : `http://${raw}`)
  } catch {
    return DEFAULT_ORIGIN
  }
  if (url.protocol !== 'http:') return DEFAULT_ORIGIN
  const port = url.port || DEFAULT_PORT
  if (ANY_INTERFACE.test(url.hostname)) return `http://127.0.0.1:${port}`
  return isLoopback(url.hostname) ? `http://${url.hostname}:${port}` : DEFAULT_ORIGIN
}

// Said by detection and by a call alike, since both find the same thing: the
// binary is on PATH (detect.js checked) but its server is not up. The app
// starts the server on Windows and macOS; `ollama serve` is the way on Linux.
export const NOT_RUNNING = 'Ollama is installed but not running: start the Ollama app, or run "ollama serve" in a terminal.'

// The wire shapes of a streamed AI call, kept free of any server import so the
// web app can read them without pulling Fastify in.
//
// A caller that sends `Accept: application/x-ndjson` gets a 200 under that
// content type and one JSON object per line. Every line but the last carries
// an `event` field and is progress. The last line carries no `event` field and
// is exactly the body the same request would have received without the header,
// so a client that ignores the header and one that streams end up holding the
// same object. A body with an `error` field is a failure; `kind` beside it
// names which action fixes it (see errors.js).
//
// A response that is not application/x-ndjson (a 400, a 401) is a plain JSON
// body and never a stream, so a client checks the content type before reading
// lines.
export const NDJSON_TYPE = 'application/x-ndjson'

// start:    { event: 'start', provider, path }         the CLI that will answer
//           (for Ollama, which is not run as a process, `path` is the model)
// progress: { event: 'progress', stage: 'send', chars }           prompt handed over
//           { event: 'progress', stage: 'wait', elapsedMs }       heartbeat while it thinks
//           { event: 'progress', stage: 'reply', elapsedMs, chars } answer received, being read
export const STAGES = ['send', 'wait', 'reply']

export function startEvent({ provider, path }) {
  return { event: 'start', provider, path }
}

export function progressEvent({ stage, ...detail }) {
  return { event: 'progress', stage, ...detail }
}

// text:     { event: 'text', add }    more of the answer, as it is written
//           { event: 'text', text }   the answer so far, whole, in place of
//                                     what came before (another CLI took over)
// Only the chat sends these (see chat/reply-stream.js); the answer that
// counts is still the last line.
export function textEvent({ add, text }) {
  return text !== undefined ? { event: 'text', text } : { event: 'text', add }
}

export function isEvent(line) {
  return line !== null && typeof line === 'object' && typeof line.event === 'string'
}

// Reads a whole NDJSON body back into its parts. Tests use it, and it is the
// reference for whatever the browser does incrementally.
export function readNdjson(text) {
  const lines = String(text).split('\n').filter((l) => l.trim()).map((l) => JSON.parse(l))
  const last = lines.at(-1)
  return {
    events: lines.filter(isEvent),
    result: last !== undefined && !isEvent(last) ? last : null,
  }
}

import { PassThrough } from 'node:stream'
import { NDJSON_TYPE } from './events.js'
import { ProviderError } from './errors.js'

export function wantsNdjson(request) {
  return String(request.headers.accept || '').includes(NDJSON_TYPE)
}

// A ProviderError becomes the { error, kind } body here rather than propagating,
// because every one of them carries a 5xx and Fastify's error handler would
// replace the sentence with "internal server error", and the sentence is the
// whole point. Anything else is a bug and does propagate.
async function settle(work, emit) {
  try {
    return { status: 200, body: await work(emit) }
  } catch (err) {
    if (err instanceof ProviderError) return { status: err.status, body: { error: err.message, kind: err.kind } }
    throw err
  }
}

// Serves one handler to both kinds of caller. `work(emit)` does the call and
// returns the success body; emit() takes a progress event from events.js.
//
// A plain caller gets the body with its status and never sees the events. An
// NDJSON caller gets 200 up front, because the outcome is not known when the
// headers go out, then each event as its own line, then the body as the last
// line: the same object the plain caller received, unchanged, so one client
// implementation reads both. A failure is therefore a last line with an
// `error` field, which is also what the plain caller's body looks like.
export async function answer(request, reply, work) {
  if (!wantsNdjson(request)) {
    const { status, body } = await settle(work, () => {})
    return reply.code(status).send(body)
  }

  const out = new PassThrough()
  const line = (obj) => out.write(JSON.stringify(obj) + '\n')
  reply.code(200).type(NDJSON_TYPE).send(out)
  settle(work, line).then(
    ({ body }) => { line(body); out.end() },
    (err) => {
      request.log.error(err)
      line({ error: 'internal server error' })
      out.end()
    },
  )
  return reply
}

import { createServer } from 'node:http'
import { join } from 'node:path'
import { MODEL_VERSIONS } from '@jobdekho/core/model/version.js'
import { shippedModel } from '@jobdekho/core/model/weights.js'
import { OUTPUTS } from './outputs.js'
import { drawnSample } from './draw.js'
import { readFile, writeFile } from './files.js'
import { progress, finish, savedAudit } from './result.js'
import { reviewDir } from '../paths.js'
import { page } from './page.js'

// The owner's review of one shipped model's outputs, on a page served to
// this computer alone (127.0.0.1, a free port). No AI is called: Claude's
// pre-checks, when a later step has written them, are read from a file.
//
//   npm run review:model -- sections [--draw-only] [postings.ndjson ...]
//
// --draw-only draws the sample and leaves, so the pre-checks can be
// written before the owner opens the page.
const USAGE = 'Usage: npm run review:model -- sections [--draw-only] [postings.ndjson ...]'
const args = process.argv.slice(2)
const drawOnly = args.includes('--draw-only')
const [model, ...paths] = args.filter((arg) => arg !== '--draw-only')
if (!Object.hasOwn(OUTPUTS, String(model))) {
  console.error(USAGE)
  process.exit(1)
}
if (!shippedModel(model)) {
  console.error(`The ${model} model is not shipped, so it has no outputs to review.`)
  process.exit(1)
}
const version = MODEL_VERSIONS[model]
const { samples, outputs } = drawnSample(model, paths)
const files = (name) => join(reviewDir(model), `${name}.json`)
console.log(`${model} version ${version}: ${samples.length} samples of ${outputs} outputs, in ${files('samples')}; pre-checks go in ${files('precheck')}.`)
if (drawOnly) process.exit(0)

const ids = new Set(samples.map((s) => s.id))
const verdicts = readFile(model, 'verdicts', {})
const state = () => ({ model, version, outputs, samples, precheck: readFile(model, 'precheck', {}), verdicts, progress: progress(samples, verdicts), audit: savedAudit(model, version) })

function save({ id, verdict, note }) {
  if (!ids.has(id) || !['right', 'wrong', null].includes(verdict)) return { status: 400, body: { error: 'Unknown sample or verdict' } }
  if (verdict) verdicts[id] = { verdict, note: String(note ?? '').slice(0, 2000), at: new Date().toISOString() }
  else delete verdicts[id]
  writeFile(model, 'verdicts', verdicts)
  const now = progress(samples, verdicts)
  return { status: 200, body: { progress: now, audit: now.done ? finish(model, version, samples, verdicts) : null } }
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let body = ''
    req.on('data', (chunk) => {
      body += chunk
      if (body.length > 20000) reject(new Error('Too large'))
    })
    req.on('end', () => resolve(body))
  })
}

const send = (res, status, type, body) => {
  res.writeHead(status, { 'content-type': type, 'cache-control': 'no-store' })
  res.end(body)
}

const server = createServer(async (req, res) => {
  try {
    if (req.method === 'GET' && req.url === '/') return send(res, 200, 'text/html; charset=utf-8', page(model))
    if (req.method === 'GET' && req.url === '/api/state') return send(res, 200, 'application/json', JSON.stringify(state()))
    if (req.method === 'POST' && req.url === '/api/verdict') {
      const { status, body } = save(JSON.parse(await readBody(req)))
      return send(res, status, 'application/json', JSON.stringify(body))
    }
    send(res, 404, 'text/plain', 'Not found')
  } catch (error) {
    send(res, 400, 'application/json', JSON.stringify({ error: error.message }))
  }
})

server.listen(0, '127.0.0.1', () => {
  const p = progress(samples, verdicts)
  if (!samples.length) console.log('The model shows nothing on these postings, so there is nothing to review.')
  console.log(`${p.checked} checked so far. Open http://127.0.0.1:${server.address().port}/ (Ctrl+C stops it; every verdict is already saved.)`)
})

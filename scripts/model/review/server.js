import { createServer } from 'node:http'
import { MODEL_VERSIONS } from '@jobdekho/core/model/version.js'
import { loadPostings, defaultFiles } from '../postings.js'
import { OUTPUTS } from './outputs.js'
import { drawSample } from './samples.js'
import { readFile, writeFile, setAside } from './files.js'
import { progress, finish, savedAudit } from './result.js'
import { page } from './page.js'

// The owner's review of one model's outputs, on a page served to this
// computer alone (127.0.0.1, a free port). No AI is called: Claude's
// pre-checks, when a later step has written them, are read from a file.
//
//   npm run review:model -- <level|sections> [postings.ndjson ...]
const [model, ...paths] = process.argv.slice(2)
if (!OUTPUTS[model]) {
  console.error('Usage: npm run review:model -- <level|sections> [postings.ndjson ...]')
  process.exit(1)
}
const version = MODEL_VERSIONS[model]

function sampleFile() {
  const saved = readFile(model, 'samples', null)
  if (saved?.version === version) return saved
  if (saved) setAside(model, saved.version)
  const { postings } = loadPostings(paths.length ? paths : defaultFiles())
  const outputs = OUTPUTS[model](postings)
  const drawn = { model, version, drawn: new Date().toISOString().slice(0, 10), outputs: outputs.length, samples: drawSample(outputs) }
  writeFile(model, 'samples', drawn)
  if (!readFile(model, 'precheck', null)) writeFile(model, 'precheck', {})
  return drawn
}

const { samples, outputs } = sampleFile()
const ids = new Set(samples.map((s) => s.id))
const verdicts = readFile(model, 'verdicts', {})

function state() {
  return { model, version, outputs, samples, precheck: readFile(model, 'precheck', {}), verdicts, progress: progress(samples, verdicts), audit: savedAudit(model, version) }
}

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
  const { port } = server.address()
  const p = progress(samples, verdicts)
  console.log(`Reviewing ${model} version ${version}: ${samples.length} samples of ${outputs} outputs, ${p.checked} checked.`)
  if (!samples.length) console.log('The model shows nothing on these postings, so there is nothing to review.')
  console.log(`Open http://127.0.0.1:${port}/ (Ctrl+C stops it; every verdict is already saved.)`)
})

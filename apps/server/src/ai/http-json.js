import { request } from 'node:http'

// JSON over HTTP to a server on this computer, which today means Ollama (see
// ollama-request.js). Not fetch: Node's fetch gives up on a response whose
// headers take more than five minutes (measured, UND_ERR_HEADERS_TIMEOUT at
// 300 s), and Ollama asked for a whole reply at once sends its headers only
// when the reply is finished, which a local model on a long prompt can take
// longer than that. node:http waits for as long as the call's own signal
// allows, and speaks plain http: alone, so an https address fails here too.
//
// Loopback only, checked on every request rather than trusted to the caller:
// the prompt carries the person's resume, and this is the one place it could
// be handed to another machine.
const LOOPBACK = /^(localhost|127(\.\d{1,3}){3}|\[::1\])$/i

export const isLoopback = (hostname) => LOOPBACK.test(String(hostname))

export function httpJson({ url, method = 'GET', body, signal }) {
  return new Promise((resolve, reject) => {
    const target = new URL(url)
    if (!isLoopback(target.hostname)) {
      reject(new Error(`${target.hostname} is not this computer, and JobDekho only talks to a model running here`))
      return
    }
    const payload = body === undefined ? undefined : JSON.stringify(body)
    const headers = payload === undefined ? {} : { 'content-type': 'application/json', 'content-length': Buffer.byteLength(payload) }
    const req = request(target, { method, headers, signal }, (res) => {
      let text = ''
      res.setEncoding('utf8')
      res.on('data', (chunk) => { text += chunk })
      res.on('end', () => resolve({ status: res.statusCode, body: parse(text) }))
      res.on('error', reject)
    })
    req.on('error', reject)
    req.end(payload)
  })
}

// A body that is not JSON reads as null, and the caller decides what a reply
// without one means from its status.
function parse(text) {
  try {
    return JSON.parse(text)
  } catch {
    return null
  }
}

// What a caller gets when it faked the process seam (`run`) but not this one:
// a network where nothing answers. Every test written before Ollama was added
// fakes `run` alone, and without this it would reach whatever Ollama happens
// to be running on the machine that runs the tests, and could even hand it a
// prompt. Nothing answering reads as "Ollama is not running", which is also
// what those tests assume by not mentioning it.
export async function offline() {
  const err = new Error('nothing answers on the network in this run')
  err.code = 'ECONNREFUSED'
  throw err
}

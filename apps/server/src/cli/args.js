// The `jobdekho` command's options. Few on purpose: the defaults are meant to
// be right, and anything rarer (another host, a .env) is for running JobDekho
// from its source.
export const HELP = `Usage: npx jobdekho@latest [options]

Runs JobDekho on this computer and opens it in your browser.

Options:
  --port <number>  Port to serve on (default 4747, or the next free one)
  --data <folder>  Where to keep your data (default: your user data folder)
  --no-open        Do not open the browser
  -v, --version    Print the version
  -h, --help       Print this help`

const WANTS_VALUE = new Set(['--port', '--data'])

// { port, data, open, help, version }, or { error } naming what was wrong.
// Takes "--port 4800" and "--port=4800" alike.
export function parseArgs(argv) {
  const out = { port: null, data: null, open: true, help: false, version: false }
  for (let i = 0; i < argv.length; i += 1) {
    const at = argv[i].indexOf('=')
    const flag = argv[i].startsWith('--') && at > 0 ? argv[i].slice(0, at) : argv[i]
    let value = flag === argv[i] ? undefined : argv[i].slice(at + 1)
    if (WANTS_VALUE.has(flag) && value === undefined) {
      i += 1
      value = argv[i]
    }
    if (flag === '--port') out.port = value
    else if (flag === '--data') out.data = value
    else if (flag === '--no-open') out.open = false
    else if (flag === '-h' || flag === '--help') out.help = true
    else if (flag === '-v' || flag === '--version') out.version = true
    else return { error: `Unknown option: ${argv[i]}` }
    if (WANTS_VALUE.has(flag) && !value) return { error: `${flag} needs a value` }
  }
  if (out.port === null) return out
  const port = Number(out.port)
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    return { error: `--port takes a number from 1 to 65535, not "${out.port}"` }
  }
  return { ...out, port }
}

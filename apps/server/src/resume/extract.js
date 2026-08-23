import { spawn } from 'node:child_process'

// The instruction and the resume both go over stdin, so nothing user-supplied
// ever reaches a command line. That removes the quoting and injection problem
// entirely, and sidesteps argv length limits on a long resume.
const INSTRUCTION = `Read the resume below and reply with ONE JSON object and nothing else.
No prose, no markdown fence. Shape:
{"skills":[],"titles":[],"locations":[],"years":<number>,"degree":"none|bachelors|masters|phd"}

skills: concrete technologies and tools only, lowercase, at most 25. No soft skills.
titles: job titles actually held or clearly targeted, lowercase.
locations: cities or regions the person is in or wants, lowercase.
years: total years of professional experience as a number. Internships count as
  0.5 each. Use 0 for a student or new graduate.
degree: the HIGHEST completed or in-progress degree. "none" if unclear.

RESUME:
`

const TIMEOUT_MS = 120000

// Claude Code may wrap the object in prose or a fence despite the instruction.
export function parseProfileJson(raw) {
  const text = String(raw || '')
  const start = text.indexOf('{')
  const end = text.lastIndexOf('}')
  if (start === -1 || end <= start) return null
  try {
    return JSON.parse(text.slice(start, end + 1))
  } catch {
    return null
  }
}

// --output-format json wraps the reply in an envelope whose `result` holds the
// model's text. Older versions print the text bare, so handle both.
//
// The envelope reports failure as is_error WITH EXIT CODE 0. An expired login
// therefore looks like success to the caller unless this is checked, and the
// real message ("OAuth session expired") never reaches the user.
export function unwrapCli(stdout) {
  const envelope = parseProfileJson(stdout)
  if (envelope?.is_error) {
    throw new Error(String(envelope.result || 'Claude CLI reported an error.').slice(0, 200))
  }
  if (envelope && typeof envelope.result === 'string') return parseProfileJson(envelope.result)
  return envelope
}

export function runClaude(input, { timeoutMs = TIMEOUT_MS } = {}) {
  return new Promise((resolve, reject) => {
    // shell:true is needed to find claude.cmd on Windows. Safe here because
    // every argument is a fixed literal; the variable content goes via stdin.
    const child = spawn('claude', ['-p', '--output-format', 'json'], { shell: true })
    let out = ''
    let err = ''
    const timer = setTimeout(() => { child.kill(); reject(new Error('Resume extraction timed out.')) }, timeoutMs)

    child.stdout.on('data', (d) => { out += d })
    child.stderr.on('data', (d) => { err += d })
    child.on('error', () => { clearTimeout(timer); reject(new Error('Claude CLI not found on PATH.')) })
    child.on('close', (code) => {
      clearTimeout(timer)
      if (code !== 0) return reject(new Error(err.trim().slice(0, 200) || `Claude CLI exited ${code}`))
      resolve(out)
    })
    child.stdin.end(input)
  })
}

export async function extractProfile(resumeText, { run = runClaude } = {}) {
  const parsed = unwrapCli(await run(INSTRUCTION + resumeText))
  if (!parsed) throw new Error('Could not read a profile out of the CLI reply.')
  return parsed
}

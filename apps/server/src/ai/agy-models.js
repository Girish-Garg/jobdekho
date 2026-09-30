import { DEFAULT_MODEL } from './cli-models.js'

// `agy models` lists what the signed-in account may run, without a model
// call: measured on 1.2.14, about six seconds, "Fetching available models..."
// on stderr, then one model per line on stdout, its id and its name split by
// a tab ("gemini-3.8-flash-low<TAB>Gemini 3.8 Flash (Low)"). It writes
// nothing into the directory it runs in. Signed out was not measured (it
// would mean signing the person out); agy's wording for it elsewhere is
// "Please sign in to view available models", and any line that is not an
// id, a tab and a name is not a model, so a signed-out listing names none.
const LIST_ARGS = ['models']
const LIST_TIMEOUT_MS = 20000

// The id goes on agy's command line as --model's value (see cli-models.js),
// so only ids made of plain characters count: nothing a shell or cmd.exe
// would read as quoting, a redirect or a second command.
const LINE = /^([A-Za-z0-9][A-Za-z0-9._/-]{0,99})\t+(\S.{0,99}?)\s*$/

export function parseAgyModels(stdout) {
  const seen = new Set()
  const models = []
  for (const line of String(stdout ?? '').split(/\r?\n/)) {
    const match = line.match(LINE)
    if (!match || seen.has(match[1]) || match[1] === DEFAULT_MODEL.id) continue
    seen.add(match[1])
    models.push({ id: match[1], label: match[2] })
  }
  return models
}

// What Antigravity's model picker offers: Default, then whatever the account
// lists. A listing that fails, times out or finds the account signed out
// leaves Default alone, which is how every call ran before, so detection
// never fails over it. `run` is null for a detector whose process seam is
// faked (see detect.js), and then nothing is started.
export async function listAgyModels({ run, path }) {
  if (!run) return [DEFAULT_MODEL]
  try {
    const { stdout, code } = await run({ file: path, args: LIST_ARGS, input: '', timeoutMs: LIST_TIMEOUT_MS })
    return code === 0 ? [DEFAULT_MODEL, ...parseAgyModels(stdout)] : [DEFAULT_MODEL]
  } catch {
    return [DEFAULT_MODEL]
  }
}

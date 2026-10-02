import { ProviderError, classify, timedOut, stoppedBy } from './errors.js'
import { textFeed } from './text-feed.js'

// The way every CLI is asked (see call.js for the other way): the prompt over
// stdin to a process started in an empty directory made for the call, and
// the reply read out of what it printed.
//
// A CLI that takes its toolset from a file in its directory gets the file
// there, and its word on what ran is checked once it has answered: an answer
// it cannot vouch for is not used (see agy-agent.js).
//
// With `onText`, the output is also read as it arrives, through the
// provider's own reading of a line (see text-feed.js), for an answer shown
// while it is written; the reply that counts is still the one read at the
// end. `signal` stops the CLI where it is (see spawn.js). A CLI with
// variables of its own (Claude Code's, see claude.js) gets them on top of
// the server's environment.
export async function overProcess({ file, args, provider, prompt, tools, timeoutMs, run, scratch, signal = null, onText = null }) {
  const staged = provider.stage ? { files: provider.stage(tools), collect: provider.collect } : {}
  const live = onText && provider.textOf ? { onStdout: textFeed(provider.textOf, onText) } : {}
  const stop = signal ? { signal } : {}
  const env = provider.env ? { env: provider.env } : {}
  let result
  try {
    result = await scratch((cwd) => run({ file, args, input: provider.encodeInput(prompt), timeoutMs, cwd, ...stop, ...live, ...staged, ...env }))
  } catch (err) {
    throw notRun(err, provider, timeoutMs)
  }
  if (result.code !== 0) throw exited(result, provider)
  const text = provider.unwrap(result.stdout, provider)
  provider.verify?.({ ...result, tools }, provider)
  return text
}

function notRun(err, provider, timeoutMs) {
  if (err.code === 'ETIMEDOUT') return timedOut(provider, timeoutMs)
  if (err.code === 'EABORTED') return stoppedBy(provider)
  if (err.code === 'ENOENT') return new ProviderError('not_found', provider)
  return err
}

// A CLI that is installed but not signed in usually says so on stderr and
// exits non-zero. Claude Code 2.1 prints its is_error envelope on stdout AND
// exits 1 with nothing on stderr, so the envelope is read first or the person
// sees "exited with code 1" where the real sentence was.
function exited({ stdout, stderr, code }, provider) {
  try {
    provider.unwrap(stdout, provider)
  } catch (err) {
    if (err instanceof ProviderError) return err
  }
  const detail = stderr.trim().slice(0, 200) || `exited with code ${code}`
  return new ProviderError(classify(provider, detail), provider, detail)
}

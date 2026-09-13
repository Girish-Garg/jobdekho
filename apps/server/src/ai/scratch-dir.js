import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

// Every call runs with its working directory set to a directory made for it
// and emptied after. The tool policy is the first line of defence against a
// job description that tells the agent to read files; this is the second: if
// a file tool ever did get through, the only directory it starts in holds
// nothing, and there is no project settings file or CLAUDE.md there for the
// CLI to pick up either. Removed with force so a CLI that left a lock file or
// a transcript behind cannot make the cleanup fail the call.
export async function inEmptyDir(work, { base = tmpdir() } = {}) {
  const dir = await mkdtemp(join(base, 'jobdekho-ai-'))
  try {
    return await work(dir)
  } finally {
    await rm(dir, { recursive: true, force: true })
  }
}

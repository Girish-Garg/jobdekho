import { mkdirSync, mkdtempSync, readdirSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

// Apply assist's browser keeps its sign-ins between applications, in one
// profile in JobDekho's own data folder (keptProfileDir), the way a person's
// own browser does: applying on Internshala or LinkedIn meant signing in
// again for every application, and a fresh sign-in each time is also what
// sets off a site's own security checks. Settings clears it. Without a data
// folder (tests) a session gets a throwaway profile under the system temp
// folder instead, gone when the session ends. The prefix is how a browser
// left over from a crashed run is recognised and ended, whichever it used.
export const PROFILE_PREFIX = 'jobdekho-apply-'

export function keptProfileDir(dataDir) {
  const dir = join(dataDir, 'apply-browser', `${PROFILE_PREFIX}kept`)
  mkdirSync(dir, { recursive: true })
  return dir
}

// mkdtemp makes the folder owner-only where the system has modes, and its
// random suffix means two sessions can never share one.
export function makeProfileDir(root = tmpdir()) {
  return mkdtempSync(join(root, PROFILE_PREFIX))
}

// A browser that has just exited can hold a lock for a moment on Windows, so
// removal retries; one that still fails is swept up at the next start.
export function removeProfileDir(dir) {
  if (!dir) return
  try {
    rmSync(dir, { recursive: true, force: true, maxRetries: 8, retryDelay: 150 })
  } catch {
    // Left for staleProfileDirs to find.
  }
}

// Profiles left behind by an earlier run, skipping the ones still in use.
export function staleProfileDirs(root = tmpdir(), live = new Set()) {
  let names = []
  try {
    names = readdirSync(root)
  } catch {
    return []
  }
  return names
    .filter((name) => name.startsWith(PROFILE_PREFIX))
    .map((name) => join(root, name))
    .filter((dir) => !live.has(dir))
}

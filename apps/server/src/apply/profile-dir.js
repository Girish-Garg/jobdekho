import { mkdtempSync, readdirSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

// Every Apply session gets a fresh browser profile of its own, under the
// system temp folder and nowhere else, and loses it when the session ends:
// no cookie, sign-in or form state outlives one application. The prefix is
// also how a browser left over from a crashed run is recognised and ended.
export const PROFILE_PREFIX = 'jobdekho-apply-'

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

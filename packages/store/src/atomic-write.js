import { openSync, writeSync, fsyncSync, closeSync, renameSync, unlinkSync, mkdirSync } from 'node:fs'
import { dirname, basename, join } from 'node:path'
import { randomBytes } from 'node:crypto'

// Nothing here ever writes into the target file. The bytes go to a sibling
// temp file, are flushed, and only then does a rename swap it into place, so
// a crash at any point before the rename leaves the old file whole and a
// crash during it leaves either the old file or the new one, never a torn
// corpus. The temp file has to sit in the same directory because a rename is
// only atomic when source and target share one, on Windows as much as POSIX.
//
// The fsync is not decoration. Without it a power cut shortly after the
// rename can leave a zero-length file on filesystems that let the directory
// update reach the disk before the data does, which is the exact truncation
// this exists to prevent, arriving through the kernel instead of the process.
export const TEMP_SUFFIX = '.tmp'

// The pid and a random tag keep two processes writing the same file (the
// scraper and the server share a directory) from ever colliding on a name.
export function tempPathFor(path) {
  const tag = `${process.pid}-${randomBytes(4).toString('hex')}`
  return join(dirname(path), `.${basename(path)}.${tag}${TEMP_SUFFIX}`)
}

export function writeAtomic(path, text) {
  mkdirSync(dirname(path), { recursive: true })
  const tmp = tempPathFor(path)
  try {
    const fd = openSync(tmp, 'w')
    try {
      writeSync(fd, text)
      fsyncSync(fd)
    } finally {
      closeSync(fd)
    }
    renameSync(tmp, path)
  } catch (err) {
    // A failed attempt must not leave its temp file behind to pile up, but
    // the original error is the one worth reporting, not a cleanup failure.
    try { unlinkSync(tmp) } catch {}
    throw err
  }
}

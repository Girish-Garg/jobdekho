import { cachedFile } from './cached-file.js'

// One JSON object keyed by user id, one record per user. The interface above
// the store still names a user on every call, and keying the file the same
// way keeps that honest at no cost: a single-user install has one key.
//
// Every write replaces the whole file, which is what makes it atomic, and
// the files are a few kilobytes at most, so this is cheaper than any scheme
// that tried to patch them in place. Pretty-printed because these are the
// files a person may open to check what the tool has kept about them.
export function userFile(path) {
  const file = cachedFile(path, {
    parse: JSON.parse,
    serialize: (records) => `${JSON.stringify(records, null, 2)}\n`,
    empty: () => ({}),
  })
  return {
    path,
    get: (userId) => file.read()[userId] ?? null,
    all: () => Object.entries(file.read()),
    set(userId, record) {
      file.write({ ...file.read(), [userId]: record })
    },
    remove(userId) {
      const { [userId]: gone, ...rest } = file.read()
      if (gone !== undefined) file.write(rest)
    },
  }
}

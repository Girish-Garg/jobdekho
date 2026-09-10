import { randomUUID } from 'node:crypto'

export function buildUserRow(profile) {
  return {
    id: randomUUID(),
    googleId: profile.googleId,
    email: profile.email,
    name: profile.name ?? null,
    avatarUrl: profile.avatarUrl ?? null,
  }
}

// Only Google sign-in reaches this. A tool running on one person's machine
// normally sets DEV_AUTH_USER_ID and never creates a row here at all, so the
// file usually does not exist. It is kept anyway because serving the app to
// somebody else is a config change rather than a rewrite, and because a
// stubbed user store would fail at the moment sign-in was first tried.
//
// Keyed by user id like every other user file, so a linear scan finds a
// google id. One person's install holds one record; the scan is over an
// object with a single key.
export function createUserStore(store) {
  const file = store.users
  return {
    async upsertUser(profile) {
      const found = file.all().find(([, user]) => user.googleId === profile.googleId)
      if (found) return found[1]
      const row = buildUserRow(profile)
      file.set(row.id, row)
      return row
    },
    async getUserById(id) {
      return file.get(id)
    },
  }
}

import { openStore } from '@jobdekho/store/open.js'
import { createSecrets } from './secret.js'

// One handle for the mail files (the connected address and the mails sent,
// see the store's mail-log.js), mirroring adzuna/store.js: a feature's own
// handle keeps it out of the shared dashboard wrapper. The Tracker a sent
// mail updates is the dashboard's (see api/store.js).
let cached = null

export function mailStore() {
  if (!cached) cached = openStore()
  return cached
}

// What sending and Settings work with, made on first use. Tests decorate
// `mailStore` (a store in a temporary folder), `mailSecrets` (a keeper in
// memory) and `mailTransport` (a fake nodemailer createTransport) before
// ready(), so no test reaches Gmail, a keyring or the real data folder.
export function mailDeps(app) {
  let deps = null
  const pick = (name, fallback) => (app.hasDecorator(name) ? app[name] : fallback())
  return () => {
    if (deps) return deps
    const store = pick('mailStore', mailStore)
    deps = {
      store,
      secrets: pick('mailSecrets', () => createSecrets({ dir: store.dir })),
      make: pick('mailTransport', () => null),
    }
    return deps
  }
}

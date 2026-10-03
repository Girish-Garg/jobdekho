import { chatStore } from './store.js'
import { documentStore } from '../documents/store.js'

// What every chat route, and every posting action, works with: the chats'
// own store handle, the documents', the dashboard, the AI chooser and the
// CLI seams. Made on first use rather than when the routes register, so a
// test that never asks a chat anything opens no store. Tests decorate
// `chatStore`, `documentStore` and `cli` with fakes before ready().
export function chatDeps(app) {
  let deps = null
  return () => (deps ??= {
    store: app.hasDecorator('chatStore') ? app.chatStore : chatStore(),
    documents: app.hasDecorator('documentStore') ? app.documentStore : documentStore(),
    dashboard: app.dashboard,
    select: app.ai.select,
    detect: app.ai.detect,
    cli: app.hasDecorator('cli') ? app.cli : {},
    log: app.log,
  })
}

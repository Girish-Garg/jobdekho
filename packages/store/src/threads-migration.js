import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { writeAtomic } from './atomic-write.js'
import { FILES, backupName } from './files.js'
import { toIso } from './timestamp.js'
import { generalChatsOf } from './threads-general.js'
import { jobChatsOf, resultsWithoutChat } from './threads-jobs.js'

// The move from one conversation for everything to chats that own their
// state (see chats.js). The conversation in chat-history.json and the filed
// ones in chat-archive.json become general chats, titles kept; every posting
// with saved results gets its job chat, and its versions take that chat's
// id (see threads-general.js and threads-jobs.js).
//
// It runs when a folder still has chat-history.json or chat-archive.json
// that were never backed up, or results that name no chat. Every original
// is kept byte for byte beside the new files as *.pre-threads.json, and
// nothing is deleted. The results' backup is written before they change and
// the two chat files' backups last, which is what marks the move done, so
// a run that fails part way is simply run again on the next start. Ids are
// made from what they name (see stable-id.js), so that second run, or one
// racing it from the scraper's process, makes the same chats rather than
// copies, and keeps every chat the person made in between.
const LEGACY = ['chatHistory', 'chatArchive']
const READ = [...LEGACY, 'chats', 'chatMessages']

const pathOf = (store, name) => join(store.dir, FILES[name])
const backupOf = (store, name) => join(store.dir, backupName(FILES[name]))
const bytesOf = (path) => (existsSync(path) ? readFileSync(path) : null)
const parsed = (bytes) => (bytes === null ? {} : JSON.parse(bytes.toString('utf8')) ?? {})
const keepOnce = (write, path, bytes) => existsSync(path) || write(path, bytes)

function planThreads(store, inputs, now) {
  const [history, archive, results, chats, messages] = [...LEGACY, 'aiResults', 'chats', 'chatMessages'].map((name) => parsed(inputs[name]))
  const postingOf = (id) => store.corpus.byId().get(id) ?? null
  const out = { chats: { ...chats }, messages: { ...messages }, results: { ...results } }
  for (const userId of new Set([...Object.keys(history), ...Object.keys(archive), ...Object.keys(results)])) {
    const existing = Array.isArray(chats[userId]?.chats) ? chats[userId].chats : []
    const known = new Set(existing.map((chat) => chat.id))
    const fresh = (chat) => !known.has(chat.id) && Boolean(known.add(chat.id))
    const generals = generalChatsOf(userId, history[userId], archive[userId], now).filter(({ chat }) => fresh(chat))
    const jobs = jobChatsOf(userId, results[userId], { chats: [...existing, ...generals.map(({ chat }) => chat)], postingOf, now })
    const made = [...generals.map(({ chat }) => chat), ...jobs.chats.filter(fresh)]
    if (made.length) out.chats[userId] = { ...chats[userId], chats: [...existing, ...made] }
    const turns = Object.fromEntries(generals.map(({ chat, turns: kept }) => [chat.id, { turns: kept, dropped: false }]))
    if (generals.length) out.messages[userId] = { ...messages[userId], ...turns }
    if (results[userId]) out.results[userId] = jobs.results
  }
  return out
}

// True when it wrote: a file that would come out the same, or empty where
// there was none, is left alone.
function writeChanged(write, path, before, value) {
  const text = `${JSON.stringify(value, null, 2)}\n`
  if (before === null ? Object.keys(value).length === 0 : before.toString('utf8') === text) return false
  write(path, text)
  return true
}

function commit(store, inputs, plan, write) {
  if (inputs.aiResults !== null) keepOnce(write, backupOf(store, 'aiResults'), inputs.aiResults)
  let rewroteResults = false
  try {
    writeChanged(write, pathOf(store, 'chatMessages'), inputs.chatMessages, plan.messages)
    writeChanged(write, pathOf(store, 'chats'), inputs.chats, plan.chats)
    rewroteResults = writeChanged(write, pathOf(store, 'aiResults'), inputs.aiResults, plan.results)
    for (const name of LEGACY) if (inputs[name] !== null) keepOnce(write, backupOf(store, name), inputs[name])
  } catch (err) {
    if (rewroteResults) writeAtomic(pathOf(store, 'aiResults'), inputs.aiResults)
    throw err
  }
}

// { migrated } and, when it failed, `error`. A failure is logged and the
// store opens without the chats it could not move; the old files are as
// they were, and the next start tries again. `write` is injectable so a
// test can fail one write and see the rest put back.
export function migrateToThreads(store, { log = console.warn, now = new Date(), write = writeAtomic } = {}) {
  try {
    const due = LEGACY.filter((name) => existsSync(pathOf(store, name)) && !existsSync(backupOf(store, name)))
    const results = bytesOf(pathOf(store, 'aiResults'))
    if (!due.length && !resultsWithoutChat(results)) return { migrated: false }
    const read = (name) => (LEGACY.includes(name) && !due.includes(name) ? null : bytesOf(pathOf(store, name)))
    const inputs = { aiResults: results, ...Object.fromEntries(READ.map((name) => [name, read(name)])) }
    commit(store, inputs, planThreads(store, inputs, toIso(now)), write)
    return { migrated: true }
  } catch (err) {
    log(`JobDekho could not move the chats in ${store.dir} into chats.json (${err.message}). It opens without them this time, `
      + 'the files they are in are as they were, and the move is tried again on the next start.')
    return { migrated: false, error: err.message }
  }
}

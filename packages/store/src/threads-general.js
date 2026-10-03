import { toIso } from './timestamp.js'
import { questionTitle } from './chat-titles.js'
import { stableId } from './stable-id.js'

// The conversations from before chats owned their state, the current one in
// chat-history.json and the filed ones in chat-archive.json, as general
// chats (see threads-migration.js). A conversation held no job and no
// document, only a page, so every turn records that it held nothing.
const NOTHING = { jobs: [], documents: [] }

const turnsOf = (record) => (Array.isArray(record?.turns) ? record.turns.filter((t) => t && typeof t === 'object') : [])
const idOr = (value, seed) => (typeof value === 'string' && value ? value : stableId(seed))

// The conversation a turn named is the chat that now holds it.
function asChatTurn(turn) {
  const { conversationId, ...rest } = turn
  return { ...rest, items: NOTHING }
}

// Seen as of its last turn: the person was there when they asked, and a
// list of old chats all marked unseen would only be noise.
function general({ id, title, startedAt, endedAt, turns }, now) {
  const first = toIso(startedAt) ?? toIso(turns[0].createdAt)
  const last = toIso(endedAt) ?? toIso(turns.at(-1).createdAt) ?? first ?? now
  return {
    chat: { id, kind: 'general', jobs: [], documents: [], title, createdAt: first ?? last, updatedAt: last, seenAt: last },
    turns: turns.map(asChatTurn),
  }
}

// One person's conversations as [{ chat, turns }], the current one first.
// One with no turns had nothing in it to keep. A filed one keeps its title;
// the current one, never filed, takes the title filing would have given it.
// One saved before conversations had ids is named from its first turn, the
// same way on every run.
export function generalChatsOf(userId, current, filed, now) {
  const out = []
  const turns = turnsOf(current)
  if (turns.length) {
    const id = idOr(current.id, `current:${userId}:${turns[0].createdAt}:${turns[0].question}`)
    out.push(general({ id, title: questionTitle(turns[0].question), startedAt: current.startedAt, turns }, now))
  }
  for (const conversation of Array.isArray(filed?.conversations) ? filed.conversations : []) {
    const kept = turnsOf(conversation)
    if (!kept.length) continue
    const id = idOr(conversation.id, `filed:${userId}:${kept[0].createdAt}:${kept[0].question}`)
    const title = typeof conversation.title === 'string' && conversation.title ? conversation.title : questionTitle(kept[0].question)
    out.push(general({ ...conversation, id, title, turns: kept }, now))
  }
  return out
}

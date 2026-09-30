import { randomUUID } from 'node:crypto'
import { toIso } from './timestamp.js'

// The shapes a chat conversation takes on disk, shared by the current one
// (chat-history.js) and the ones filed away (chat-archive.js), so the two
// files cannot disagree about what a conversation is.
//
//   current:  { id, startedAt, turns }
//   filed:    { id, title, startedAt, endedAt, turns }
//
// A current conversation saved before conversations had ids is only
// { turns }; it reads as one with no id yet, and gets one the first time a
// question is asked in it or it is filed away. Nothing is rewritten on disk
// just to read it.
export const MAX_TURNS = 20
const MAX_TITLE = 80

export function currentOf(record) {
  const turns = Array.isArray(record?.turns) ? record.turns : []
  return { id: record?.id ?? null, startedAt: record?.startedAt ?? turns[0]?.createdAt ?? null, turns }
}

export const freshConversation = (now = new Date()) => ({ id: randomUUID(), startedAt: toIso(now), turns: [] })

// What the history list calls a conversation: its first question, on one
// line and short enough to sit in a row, the way a person would name it.
export function titleOf(turns) {
  const first = String(turns[0]?.question ?? '').replace(/\s+/g, ' ').trim()
  if (!first) return 'A conversation'
  return first.length > MAX_TITLE ? `${first.slice(0, MAX_TITLE - 3).trimEnd()}...` : first
}

// `endedAt` is the last thing that happened in it, not the moment it was
// filed: the list is ordered by it, and a conversation left for a week and
// filed today is still a week old.
export function filedFrom({ id, startedAt, turns }, now = new Date()) {
  const at = toIso(now)
  return {
    id: id ?? randomUUID(),
    title: titleOf(turns),
    startedAt: startedAt ?? turns[0]?.createdAt ?? at,
    endedAt: turns.at(-1)?.createdAt ?? at,
    turns,
  }
}

export const summaryOf = ({ turns, ...rest }) => ({ ...rest, turnCount: turns.length })

export const newestFirst = (list) => [...list].sort((a, b) => (a.endedAt < b.endedAt ? 1 : a.endedAt > b.endedAt ? -1 : 0))

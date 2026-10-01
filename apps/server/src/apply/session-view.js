import { sentenceFor } from './handover-copy.js'
import { canPopOut } from './window-mode.js'
import { boardNote } from './apply-url.js'

// What the panel is told about a session, over REST and over its socket, and
// the one place frames are sent. A socket that has fallen behind is skipped,
// never queued for: the next frame is the page as it is now, so dropping one
// costs a little smoothness and never builds up lag.
const MAX_BUFFERED = 1024 * 1024

export function viewOf(s) {
  return {
    id: s.id,
    postingId: s.posting.id,
    state: s.state,
    reason: s.reason,
    message: sentenceFor(s.state, s.reason),
    // What a board applied on signed in says about tools, for the panel to
    // show once beside the live view; null anywhere else.
    board: boardNote(s.posting),
    url: s.pageUrl,
    title: s.title,
    rows: s.rows,
    submit: s.submit,
    browser: s.browserName,
    canPopOut: canPopOut(s.mode),
    shown: s.shown,
    files: { resume: s.fileInfo?.resume?.name ?? null, cover: s.fileInfo?.cover?.name ?? null },
    picker: s.picker,
    chooser: s.chooser ? { multiple: s.chooser.multiple } : null,
    dialog: s.dialog,
    nameCheck: Boolean(s.values?.nameCheck),
  }
}

export function broadcast(s, message) {
  const text = JSON.stringify(message)
  for (const socket of s.sockets) {
    if (socket.readyState === 1) socket.send(text)
  }
}

export const pushView = (s) => broadcast(s, { t: 'view', view: viewOf(s) })

export function sendFrame(s, socket) {
  if (!s.frame) return
  if (socket.readyState !== 1 || socket.bufferedAmount > MAX_BUFFERED) {
    s.dropped += 1
    return
  }
  socket.send(JSON.stringify({ t: 'frame', seq: s.seq, ...s.frame.meta }))
  socket.send(s.frame.bytes, { binary: true })
}

// The newest frame is also kept, so a panel that connects to a still page
// sees it at once: a screencast only sends a frame when something changes.
export function pushFrame(s, bytes, meta) {
  s.seq += 1
  s.frame = { bytes, meta }
  s.size = { w: meta.w, h: meta.h }
  for (const socket of s.sockets) sendFrame(s, socket)
}

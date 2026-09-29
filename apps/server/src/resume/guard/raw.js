import { MESSAGES } from './messages.js'

// A resume or a letter is a few thousand characters; this is room for a
// long academic CV and still small enough that checking it is instant.
export const MAX_TEX = 200000

// ^^ is TeX's character-code notation: ^^5c is a backslash, so "^^5cinput"
// is \input to TeX while a reader that did not decode it sees none. Refused
// anywhere, comments included, rather than decoded, because decoding it
// right in every position (inside a control word, at a line end) is exactly
// the kind of detail a check gets wrong.
const CARETS = /\^\^/

// Control characters mean something to TeX (^^@ is ignored, ^^L ends a
// paragraph, DEL is invalid) and nothing in a resume. Tab, line feed and
// carriage return are the only ones a real document holds.
// eslint-disable-next-line no-control-regex
const CONTROL = /[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/

// Characters that look like a backslash. pdfTeX does not read any of them as
// one, so they are harmless to it, but a person reading the source would
// take them for a command, and refusing them keeps what they see and what
// TeX runs the same.
const LOOKALIKE = /[﹨＼∖⧵⧹╲⟍]/

export function checkRaw(tex, report) {
  if (tex.length > MAX_TEX) report(MESSAGES.tooLong(MAX_TEX))
  if (CARETS.test(tex)) report(MESSAGES.carets())
  if (CONTROL.test(tex)) report(MESSAGES.control())
  const look = LOOKALIKE.exec(tex)
  if (look) report(MESSAGES.lookalike(look[0]))
}

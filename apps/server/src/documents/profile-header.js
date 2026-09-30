import { escapeLine } from '../resume/escape.js'
import { contactLine } from '../resume/contact.js'
import { findHeaderCall } from './header-call.js'

// A document keeps the header its template wrote from the profile of the
// day it was made (see first-draft.js), and nothing carries a later change
// to the person's name or contact details into it. This works out what the
// profile would write now, with the same escaping the templates are filled
// with (resume/render.js, render-letter.js), which parts of the document's
// header differ, and the source with only those arguments replaced. Pure:
// the routes in api/document-profile.js do the reading and saving.

// Each argument's label, as the notice names it, and what the profile puts
// there. Rendered exactly as the templates render it, or a header made
// today would read as different from the profile it was made from.
const PARTS = {
  Name: (basics) => escapeLine(basics.name) || 'Your Name',
  Headline: (basics) => escapeLine(basics.headline),
  'Contact line': (basics) => contactLine(basics),
}
const LABELS = { resHeader: ['Name', 'Headline', 'Contact line'], letterHeader: ['Name', 'Contact line'] }
const ARITY = Object.fromEntries(Object.entries(LABELS).map(([macro, labels]) => [macro, labels.length]))

// A header split over lines, or a space just inside a brace, prints the
// same, so layout alone is not a difference worth offering to fix.
const flat = (text) => text.replace(/\s+/g, ' ').trim()

const literal = (text) => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

// A letter signs off with the name as well ("Regards, Asha Rao"), written
// into its body, so a new name replaces the old one after the header too:
// whole words only, so "Asha" never changes inside "Ashaki", and shown in
// the same review as the header before anything is saved.
function renameAfter(source, from, oldName, newName) {
  const old = flat(oldName)
  if (!old) return source
  const pattern = new RegExp(`(?<![\\p{L}\\p{N}])${literal(old)}(?![\\p{L}\\p{N}])`, 'gu')
  return source.slice(0, from) + source.slice(from).replace(pattern, () => newName)
}

// Returns { fields, rendered, tex } when the profile would write this
// document's header differently, else null: no profile, no header call left
// (the person wrote their own), or nothing that differs. `rendered` is the
// profile's whole header, its parts joined by a line end that no part can
// hold (each is one line, see escapeLine), which is what a declined offer
// is remembered by.
export function headerUpdate(tex, profile) {
  if (!profile) return null
  const source = String(tex ?? '')
  const call = findHeaderCall(source, ARITY)
  if (!call) return null
  const labels = LABELS[call.macro]
  const values = labels.map((label) => PARTS[label](profile.basics ?? {}))
  const changed = call.args.map((arg, i) => flat(arg.text) !== flat(values[i]))
  if (!changed.some(Boolean)) return null
  // Spliced from the last argument back, so every earlier offset still
  // holds; slicing rather than String.replace, so a "$&" in a value is text.
  const end = call.args[call.args.length - 1].end + 1
  let next = changed[0] ? renameAfter(source, end, call.args[0].text, values[0]) : source
  for (let i = call.args.length - 1; i >= 0; i -= 1) {
    if (changed[i]) next = next.slice(0, call.args[i].start) + values[i] + next.slice(call.args[i].end)
  }
  return { fields: labels.filter((_, i) => changed[i]), rendered: values.join('\n'), tex: next }
}

// What the open document says about it: the parts that differ, unless the
// person already chose to keep their header against this very profile. A
// later change to the profile renders differently, so the offer comes back.
export function headerNotice(doc, profile) {
  const update = headerUpdate(doc?.tex, profile)
  return update && update.rendered !== doc.headerKept ? { fields: update.fields } : null
}

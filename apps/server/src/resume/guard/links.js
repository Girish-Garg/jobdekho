import { MESSAGES } from './messages.js'

// The address of \href or \url (read raw by scan.js, as hyperref reads it).
// Two reasons it is held to a strict shape:
//
//   - Agreement on where it ends. With no %, backslash, brace or space
//     inside, the first } closes it both for hyperref at the top level and
//     for TeX inside another command's argument, so no text can hide in the
//     gap between the two readings.
//   - Where it leads. A resume is opened by strangers; a link to a web page,
//     an email address or a phone number is all one needs, and file: or a
//     launch action is not something to put in front of them.
//
// A lone macro parameter (#1) is allowed so a document can define its own
// link command: the address then arrives as that command's argument, read
// with ordinary character codes, where a % is a comment for both readings.
const SAFE_LINK = /^(?:https?:\/\/|mailto:|tel:)[A-Za-z0-9\-._~:/?#[\]@!$&'()*+,;=]+$/
const PARAMETER = /^#[1-9]$/

export function checkLink(token, command, report) {
  if (token.raw === null || !token.closed) {
    report(MESSAGES.linkBraces(command))
    return
  }
  if (!PARAMETER.test(token.raw) && !SAFE_LINK.test(token.raw)) report(MESSAGES.link(token.raw))
}

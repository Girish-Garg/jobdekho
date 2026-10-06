// Some boards send only a line or two of each posting with their list, and
// keep the description on the posting's own page: Internshala's cards carry
// about ninety characters. Text that short from such a board is a teaser,
// not the description, so the page is read when the person opens the
// posting (the server's describe route), once, and a refresh keeps what it
// read (the scraper's run-context.js). Anywhere else, short text is all
// the posting says.
export const TEASER_CHARS = 200

// What a description read from the board's own page opens with: its first
// section's heading (sources' internshala-detail.js), which a card's teaser
// never does. So a page that is short in itself is read once, not again on
// every open.
const PAGE_OPENS = new Map([['internshala', /^About the (?:internship|job)\b/i]])

const boardOf = (source) => String(source ?? '').split(':')[0]

export const teasingBoard = (source) => PAGE_OPENS.has(boardOf(source))

export function isTeaser(row) {
  const page = PAGE_OPENS.get(boardOf(row?.source))
  if (!page) return false
  const text = String(row?.descriptionText ?? '').trim()
  return text.length < TEASER_CHARS && !page.test(text)
}

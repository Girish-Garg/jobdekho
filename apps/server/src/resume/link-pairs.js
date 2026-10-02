// A resume's hyperlinks are not in its text. The words "Demo video" are text,
// but the address behind them is a Link annotation, a box drawn over the
// page, so the text layer alone never shows it. This pairs each box's
// address with the words under it. Pure, and fed plain objects shaped like
// pdf.js's own (see pdf-links.js for the thin part that asks pdf.js).

// Web, mail and phone. pdf.js leaves `url` unset for anything it will not
// open (javascript:, a jump to another page), and an ftp link has no place
// on a resume.
const KEPT = /^(https?:|mailto:|tel:)/i

// Enough to name a link and place it; a box drawn over a whole paragraph
// should not paste the paragraph into the prompt.
const MAX_CHARS = 80

const isText = (item) => typeof item?.str === 'string' && Array.isArray(item.transform)

function box(item) {
  const [, , , , x, y] = item.transform
  return { str: item.str, x, y, width: Number(item.width) || 0, height: Number(item.height) || 0 }
}

function area([x1, y1, x2, y2]) {
  return { left: Math.min(x1, x2), right: Math.max(x1, x2), bottom: Math.min(y1, y2), top: Math.max(y1, y2) }
}

// On the box's line when the middle of the glyphs, half a font height above
// the baseline, falls inside the box's height.
const onLine = (b, r) => b.y + b.height / 2 >= r.bottom && b.y + b.height / 2 <= r.top

// pdf.js merges a run of text into one item however it was styled, so a link
// is often only part of an item: "Chess Engine | Demo video" with the last
// two words linked. A word counts as under the box when its middle is, its
// position estimated in proportion to the item's width. That is close enough
// to name a link, which is all the AI needs.
function wordsUnder(b, r) {
  const step = b.str.length ? b.width / b.str.length : 0
  return [...b.str.matchAll(/\S+/g)]
    .filter((m) => {
      const mid = b.x + (m.index + m[0].length / 2) * step
      return mid >= r.left && mid <= r.right
    })
    .map((m) => m[0])
}

const readingOrder = (a, b) => (Math.abs(a.y - b.y) > 2 ? b.y - a.y : a.x - b.x)
const squash = (s) => s.replace(/\s+/g, ' ').trim()
const clip = (s) => (s.length > MAX_CHARS ? `${s.slice(0, MAX_CHARS).trim()}...` : s)

// Separators either side of a link ("GitHub |") are not part of its name.
const label = (words) => clip(squash(words.join(' ')).replace(/^[|•·,;:]+|[|•·,;:]+$/g, '').trim())

// What the line says up to the end of the link. The entry a link belongs to
// is named to its left far more often than not ("Chess Engine | Rust | Demo
// video"), and several entries can each have a link called "GitHub", so
// this is what tells them apart.
function lineUpTo(row, r) {
  const text = squash(row.filter((b) => b.x < r.right).map((b) => b.str).join(' '))
  return text.length > MAX_CHARS ? `...${text.slice(-MAX_CHARS).trim()}` : text
}

function pagePairs(page) {
  const boxes = (Array.isArray(page?.items) ? page.items : []).filter(isText).map(box).sort(readingOrder)
  const pairs = []
  for (const a of Array.isArray(page?.annotations) ? page.annotations : []) {
    if (a?.subtype !== 'Link' || !KEPT.test(a.url ?? '') || !Array.isArray(a.rect)) continue
    const r = area(a.rect)
    const row = boxes.filter((b) => onLine(b, r))
    const text = label(row.flatMap((b) => wordsUnder(b, r)))
    const last = pairs.at(-1)
    // A link that wraps onto a second line is two boxes with one address,
    // and an icon beside its label is often a box of its own as well.
    if (last?.url === a.url) {
      if (text !== last.text) last.text = label([last.text, text])
      continue
    }
    pairs.push({ text, url: a.url, line: lineUpTo(row, r) })
  }
  return pairs
}

// [{ annotations, items }] per page, in page order, to [{ text, url, line }]
// in the order the links appear.
export function pairLinks(pages) {
  return Array.isArray(pages) ? pages.flatMap(pagePairs) : []
}

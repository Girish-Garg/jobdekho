import { getDocumentProxy } from 'unpdf'

// How long a compiled document runs: its pages, and how many lines of text
// sit on the last one. For a resume that spills onto a second page that
// last number is how much has to go for it to fit on one, which is the only
// thing a person looking at "2 pages" wants to know next.

// Text drawn within this many points of one height is one line: a
// superscript or a bullet mark sits a little off its line's baseline.
const SAME_LINE = 2

// Lines of text among pdf.js text items, by the height each is drawn at
// (the sixth number of an item's transform). Two columns side by side count
// once, which is right: they are cut together.
export function countLines(items = []) {
  const heights = items.filter((item) => item?.str?.trim()).map((item) => item.transform?.[5]).filter(Number.isFinite)
  let lines = 0
  let last = -Infinity
  for (const height of heights.sort((a, b) => a - b)) {
    if (height - last > SAME_LINE) lines += 1
    last = height
  }
  return lines
}

// { pages, lastLines, lines } for a PDF's bytes, `lines` being every page's
// together: what two versions of one resume are compared by, to say how
// much a cut saves. A copy goes in, since pdf.js may take ownership of the
// buffer it is given, and the caller still has the bytes to send.
export async function pdfPages(bytes) {
  const pdf = await getDocumentProxy(new Uint8Array(bytes), { verbosity: 0 })
  try {
    const perPage = []
    for (let n = 1; n <= pdf.numPages; n += 1) {
      const page = await pdf.getPage(n)
      perPage.push(countLines((await page.getTextContent()).items))
    }
    return { pages: pdf.numPages, lastLines: perPage.at(-1) ?? 0, lines: perPage.reduce((sum, n) => sum + n, 0) }
  } finally {
    await pdf.loadingTask.destroy()
  }
}

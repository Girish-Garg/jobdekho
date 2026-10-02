import { describe, it, expect } from 'vitest'
import { pairLinks } from '@jobdekho/server/resume/link-pairs.js'
import { linkAppendix, LINKS_HEADING } from '@jobdekho/server/resume/link-appendix.js'
import { pdfLinks } from '@jobdekho/server/resume/pdf-links.js'
import { pdfWithLinks, DEMO_LINES, DEMO_LINKS } from './fixtures/link-pdf.js'

// Shaped like pdf.js's own: a text item's transform ends in its baseline
// origin, and an annotation's rect is [x1, y1, x2, y2] in the same points.
const item = (str, x, y, width, height = 10) => ({ str, transform: [height, 0, 0, height, x, y], width, height, hasEOL: false })
const link = (url, rect, extra = {}) => ({ subtype: 'Link', url, rect, ...extra })
const page = (items, annotations) => ({ items, annotations })

const DEMO = 'https://www.youtube.com/watch?v=demo'

describe('pairLinks', () => {
  it('pairs an address with the words under its box and the line it sits on', () => {
    const pages = [page(
      [item('Chess Engine |', 50, 700, 65), item('Demo video', 120, 700, 50)],
      [link(DEMO, [118, 697, 172, 712])],
    )]
    expect(pairLinks(pages)).toEqual([{ text: 'Demo video', url: DEMO, line: 'Chess Engine | Demo video' }])
  })

  // pdf.js merges "Chess Engine | Demo video" into one item even when only
  // the last two words are a link, so the words are picked out of it.
  it('takes only the linked words out of an item pdf.js merged', () => {
    const pages = [page([item('Chess Engine | Demo video', 50, 700, 125)], [link(DEMO, [123, 697, 180, 712])])]
    expect(pairLinks(pages)[0].text).toBe('Demo video')
  })

  it('reads a box given corner to corner the other way round', () => {
    const pages = [page([item('Demo video', 120, 700, 50)], [link(DEMO, [172, 712, 118, 697])])]
    expect(pairLinks(pages)[0].text).toBe('Demo video')
  })

  it('leaves out the separator beside a link', () => {
    const pages = [page([item('GitHub |', 50, 700, 40)], [link('https://github.com/demo', [48, 697, 92, 712])])]
    expect(pairLinks(pages)[0].text).toBe('GitHub')
  })

  it('ignores text on the lines above and below the box', () => {
    const pages = [page(
      [item('Above', 50, 714, 30), item('Demo video', 50, 700, 50), item('Below', 50, 686, 30)],
      [link(DEMO, [48, 697, 102, 711])],
    )]
    expect(pairLinks(pages)).toEqual([{ text: 'Demo video', url: DEMO, line: 'Demo video' }])
  })

  it('keeps web, mail and phone links and nothing else', () => {
    const pages = [page([item('x', 0, 0, 5)], [
      link('https://demo.dev', [0, 0, 1, 1]),
      link('http://demo.dev/old', [0, 0, 1, 1]),
      link('mailto:demo@example.com', [0, 0, 1, 1]),
      link('tel:+919876543210', [0, 0, 1, 1]),
      link('ftp://demo.dev/cv.pdf', [0, 0, 1, 1]),
      // pdf.js leaves url unset for javascript: and for a jump within the file.
      link(undefined, [0, 0, 1, 1], { unsafeUrl: 'javascript:alert(1)' }),
      link(undefined, [0, 0, 1, 1], { dest: [0, 'XYZ'] }),
      { subtype: 'Widget', url: 'https://demo.dev/form', rect: [0, 0, 1, 1] },
    ])]
    expect(pairLinks(pages).map((p) => p.url)).toEqual([
      'https://demo.dev', 'http://demo.dev/old', 'mailto:demo@example.com', 'tel:+919876543210',
    ])
  })

  it('joins a link that wraps onto a second line, which is two boxes with one address', () => {
    const pages = [page(
      [item('Watch the Demo', 50, 700, 70), item('video here', 50, 686, 50)],
      [link(DEMO, [99, 697, 122, 712]), link(DEMO, [48, 683, 77, 698])],
    )]
    expect(pairLinks(pages)).toEqual([{ text: 'Demo video', url: DEMO, line: 'Watch the Demo' }])
  })

  it('names an icon and its label, two boxes with one address, once', () => {
    const url = 'https://github.com/demo-candidate'
    const pages = [page(
      [item('GitHub', 70, 700, 30)],
      [link(url, [50, 697, 62, 712]), link(url, [68, 697, 102, 712]), link(url, [68, 697, 102, 712])],
    )]
    expect(pairLinks(pages)).toEqual([{ text: 'GitHub', url, line: '' }])
  })

  it('keeps an icon link with no words under it, placed by its line', () => {
    const pages = [page([item('Demo Candidate', 50, 760, 70)], [link('https://github.com/demo-candidate', [300, 757, 312, 772])])]
    expect(pairLinks(pages)).toEqual([{ text: '', url: 'https://github.com/demo-candidate', line: 'Demo Candidate' }])
  })

  it('tells apart two links with the same name by the line each sits on', () => {
    const pages = [page(
      [item('Chess Engine | GitHub', 50, 700, 105), item('Notes App | GitHub', 50, 650, 90)],
      [link('https://github.com/demo/chess', [123, 697, 158, 712]), link('https://github.com/demo/notes', [108, 647, 143, 662])],
    )]
    expect(pairLinks(pages)).toEqual([
      { text: 'GitHub', url: 'https://github.com/demo/chess', line: 'Chess Engine | GitHub' },
      { text: 'GitHub', url: 'https://github.com/demo/notes', line: 'Notes App | GitHub' },
    ])
  })

  it('keeps a long line to its last stretch before the link', () => {
    const words = 'word '.repeat(30).trim()
    const pages = [page([item(words, 50, 700, 745), item('Demo', 800, 700, 20)], [link(DEMO, [798, 697, 822, 712])])]
    const [{ line }] = pairLinks(pages)
    expect(line.startsWith('...')).toBe(true)
    expect(line.endsWith('word Demo')).toBe(true)
    expect(line.length).toBeLessThanOrEqual(83)
  })

  it('lists links page by page, in the order they appear', () => {
    const pages = [
      page([item('One', 50, 700, 15)], [link('https://demo.dev/1', [48, 697, 66, 712])]),
      page([item('Two', 50, 700, 15)], [link('https://demo.dev/2', [48, 697, 66, 712])]),
    ]
    expect(pairLinks(pages).map((p) => p.text)).toEqual(['One', 'Two'])
  })

  it('reads nothing out of junk rather than throwing', () => {
    expect(pairLinks(undefined)).toEqual([])
    expect(pairLinks([{}, null])).toEqual([])
    expect(pairLinks([page([{ str: 'no transform' }, null], [link(DEMO, null), null])])).toEqual([])
  })
})

describe('linkAppendix', () => {
  const pair = (text, url, line = text) => ({ text, url, line })

  it('adds nothing when the resume has no links, so the prompt reads as before', () => {
    expect(linkAppendix([])).toBe('')
    expect(linkAppendix(undefined)).toBe('')
  })

  it('lists each link as visible text -> address under one heading', () => {
    const out = linkAppendix([pair('Demo video', DEMO, 'Chess Engine | Demo video'), pair('Credential', 'https://credly.com/badges/demo')])
    expect(out).toBe(`\n\n${LINKS_HEADING}\n`
      + `Demo video -> ${DEMO} (on the line: Chess Engine | Demo video)\n`
      + 'Credential -> https://credly.com/badges/demo\n')
  })

  it('heads the list the way the instruction names it', () => {
    expect(LINKS_HEADING).toBe('LINKS IN THE RESUME (visible text -> address):')
  })

  // These are fine as they are: the address is already in the resume text.
  it('skips a link whose visible text is its own address', () => {
    expect(linkAppendix([
      pair('demo@example.com', 'mailto:demo@example.com'),
      pair('github.com/demo-candidate', 'https://github.com/demo-candidate/'),
      pair('linkedin.com/in/demo', 'https://www.linkedin.com/in/demo'),
      pair('+91 98765 43210', 'tel:+919876543210'),
    ])).toBe('')
  })

  it('lists a link only once however often the same words and address repeat', () => {
    const out = linkAppendix([pair('GitHub', 'https://github.com/demo'), pair('GitHub', 'https://github.com/demo', 'Header | GitHub')])
    expect(out.match(/GitHub ->/g)).toHaveLength(1)
  })

  it('names a link with no words under it, keeping its line to place it', () => {
    expect(linkAppendix([pair('', 'https://github.com/demo', 'Demo Candidate')]))
      .toContain('(no visible text) -> https://github.com/demo (on the line: Demo Candidate)')
  })

  it('stops at fifty links', () => {
    const many = Array.from({ length: 80 }, (_, i) => pair(`Link ${i}`, `https://demo.dev/${i}`))
    expect(linkAppendix(many).trim().split('\n')).toHaveLength(51)
  })
})

// The thin part: the same pairing, on what pdf.js actually reads out of a file.
describe('pdfLinks', () => {
  it('reads each link of a real PDF with the words it covers', async () => {
    expect(await pdfLinks(pdfWithLinks(DEMO_LINES, DEMO_LINKS))).toEqual([
      { text: 'Demo video', url: DEMO, line: 'Chess Engine | Demo video' },
      { text: 'demo@example.com', url: 'mailto:demo@example.com', line: 'Reach me at demo@example.com' },
    ])
  })

  it('finds none in a PDF without annotations', async () => {
    expect(await pdfLinks(pdfWithLinks(DEMO_LINES))).toEqual([])
  })
})

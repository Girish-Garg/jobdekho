import { load } from 'cheerio'
import { stripHtml } from '../html.js'

// A posting's own page on Internshala, where the description is: the list
// cards carry only its first line (core's teaser.js). The page is a run of
// headed sections, each followed by text or a row of tags:
//
//   About the internship | About the job, Skill(s) required, Who can apply,
//   Other requirements, Salary, Perks, Number of openings, About <company>
//
// kept with their headings, as the description of a posting from any board
// is, so the pane can show them as sections and the fit can tell the duties
// from the requirements. The board's own activity line is left out.
const flat = (text) => text.replace(/\s+/g, ' ').trim()
const SKIP = /^activity on internshala/i

export function parseInternshalaDetail(html) {
  const $ = load(String(html ?? ''))
  const box = $('.internship_details').first()
  const sections = []
  box.find('.section_heading, .text-container, .round_tabs_container').each((_, el) => {
    const node = $(el)
    if (node.hasClass('section_heading')) {
      sections.push({ heading: flat(node.text()), parts: [] })
      return
    }
    const open = sections.at(-1)
    if (!open || SKIP.test(open.heading)) return
    const text = node.hasClass('round_tabs_container')
      ? node.children().map((_, tab) => flat($(tab).text())).get().filter(Boolean).join(', ')
      : stripHtml(node.html() ?? '')
    if (text) open.parts.push(text)
  })
  return sections
    .filter(({ heading, parts }) => heading && parts.length && !SKIP.test(heading))
    .map(({ heading, parts }) => `${heading}\n\n${parts.join('\n\n')}`)
    .join('\n\n')
}

// One posting's page, read only when the person opens the posting (the
// server's describe route), as LinkedIn's are: a refresh never reads one,
// so the board sees one request for each posting someone actually looks
// at, never a burst for all of them. { description }.
export async function describeInternshala(http, url) {
  const res = await http(url, { headers: { Accept: 'text/html' } })
  return { description: parseInternshalaDetail(await res.text()) }
}

// What a refresh sends of a card whose page was read once already: nothing
// of its text, so the store keeps the page's description rather than the
// card's first line (a bare sighting, the store's corpus-merge.js).
export function keepReadPages(cards, { name, context } = {}) {
  for (const card of cards) {
    if (context?.known?.(name, card.externalId)) card.description = ''
  }
  return cards
}

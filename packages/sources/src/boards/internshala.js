import { load } from 'cheerio'

const LISTING = 'https://internshala.com/internships/computer-science,programming,data-science-internship/'
const DAY = 86400000

export function parsePostedAt(text, now = Date.now()) {
  const t = (text || '').toLowerCase()
  if (/hour|today|just now/.test(t)) return new Date(now).toISOString()
  if (/yesterday/.test(t)) return new Date(now - DAY).toISOString()
  const m = t.match(/(\d+)\s*(day|week|month)s?\s*ago/)
  if (!m) return null
  const mult = m[2] === 'week' ? 7 : m[2] === 'month' ? 30 : 1
  return new Date(now - Number(m[1]) * mult * DAY).toISOString()
}

export function parseInternshala(html) {
  const $ = load(html)
  const out = []
  $('.individual_internship').each((_, el) => {
    const card = $(el)
    const id = card.attr('internshipid') || card.attr('data-internship_id')
    const link = card.find('a.job-title-href').first()
    const title = link.text().trim()
    if (!id || !title) return
    const href = link.attr('href') || ''
    out.push({
      externalId: String(id),
      title,
      company: card.find('.company-name').first().text().trim(),
      location: card.find('.internship_item_location').first().text().trim(),
      url: href.startsWith('http') ? href : `https://internshala.com${href}`,
      description: card.find('.internship_meta').text().replace(/\s+/g, ' ').trim(),
      tags: ['internship'],
      postedAt: parsePostedAt(card.find('[class*="status"]').text()),
    })
  })
  return out
}

export function internshala() {
  return {
    name: 'internshala',
    async fetch(http) {
      const res = await http(LISTING, { headers: { Accept: 'text/html' } })
      return parseInternshala(await res.text())
    },
  }
}

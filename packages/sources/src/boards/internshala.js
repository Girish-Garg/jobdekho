import { load } from 'cheerio'

const LISTING = 'https://internshala.com/internships/computer-science,programming,data-science-internship/'

export function parseInternshala(html) {
  const $ = load(html)
  const out = []
  $('.individual_internship').each((_, el) => {
    const card = $(el)
    const id = card.attr('data-internship_id')
    const title = card.find('.job-internship-name').first().text().trim()
    if (!id || !title) return
    const href = card.find('a.job-title-href').attr('href') || ''
    out.push({
      externalId: String(id),
      title,
      company: card.find('.company-name').first().text().trim(),
      location: card.find('.locations').first().text().trim(),
      url: href.startsWith('http') ? href : `https://internshala.com${href}`,
      description: card.find('.internship_other_details_container').text().replace(/\s+/g, ' ').trim(),
      tags: ['internship'],
      postedAt: null,
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

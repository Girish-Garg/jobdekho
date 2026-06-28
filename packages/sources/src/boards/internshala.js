import { load } from 'cheerio'

const INTERN_CATS = ['computer-science', 'web-development', 'data-science', 'machine-learning', 'mobile-app-development', 'artificial-intelligence']
const JOB_CATS = ['software-development', 'web-development', 'data-science', 'mobile-app-development']
const PAGES = 2
const internUrl = (cat, p) => `https://internshala.com/internships/${cat}-internship${p > 1 ? `/page-${p}` : ''}/`
const jobUrl = (cat, p) => `https://internshala.com/jobs/${cat}-jobs${p > 1 ? `/page-${p}` : ''}/`
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

export function parseInternshala(html, type = 'internship') {
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
      type,
      postedAt: parsePostedAt(card.find('[class*="status"]').text()),
      stipend: card.find('.ic-16-money').first().parent().text().replace(/\s+/g, ' ').trim() || null,
      duration: card.find('.ic-16-calendar').first().parent().text().replace(/\s+/g, ' ').trim() || null,
      experience: card.find('.ic-16-briefcase').first().parent().text().replace(/\s+/g, ' ').trim() || 'Fresher',
    })
  })
  return out
}

export function internshala() {
  return {
    name: 'internshala',
    async fetch(http) {
      const out = []
      const targets = []
      for (const c of INTERN_CATS) for (let p = 1; p <= PAGES; p++) targets.push([internUrl(c, p), 'internship'])
      for (const c of JOB_CATS) for (let p = 1; p <= PAGES; p++) targets.push([jobUrl(c, p), 'job'])
      for (const [url, type] of targets) {
        try {
          const res = await http(url, { headers: { Accept: 'text/html' } })
          out.push(...parseInternshala(await res.text(), type))
        } catch {
          // skip a failed page; the rest still run
        }
      }
      return out
    },
  }
}

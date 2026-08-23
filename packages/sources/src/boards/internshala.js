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

// Every value on a card is anchored to its own icon. Reading the icon's parent
// is what keeps the fields apart: the surrounding .internship_meta block repeats
// the title, location, stipend and duration ahead of the description text.
const flat = (node) => node.text().replace(/\s+/g, ' ').trim()

const iconText = (card, icon) => {
  const holder = card.find(icon).first().parent()
  // Job cards carry the same value twice, in a .desktop span and a .mobile one,
  // so reading the holder printed every salary twice. The mobile copy is the
  // complete one: it keeps the "/year" unit the desktop span leaves off.
  return flat(holder.children('.mobile')) || flat(holder)
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
      // Roughly half of all cards are work-from-home, and those carry a home
      // icon instead of a map pin. Reading only the pin left them locationless.
      location: iconText(card, '.ic-16-map-pin') || iconText(card, '.ic-16-home'),
      url: href.startsWith('http') ? href : `https://internshala.com${href}`,
      description: iconText(card, '.ic-16-assignment'),
      tags: [type],
      // The listing category is authoritative here. Internshala titles are bare
      // skill names ("React Native Development"), so inference cannot see it.
      ...(type === 'internship' ? { level: 'internship' } : {}),
      postedAt: parsePostedAt(iconText(card, '.ic-16-reschedule')),
      stipend: iconText(card, '.ic-16-money') || null,
      duration: iconText(card, '.ic-16-calendar') || null,
      experience: iconText(card, '.ic-16-briefcase') || 'Fresher',
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

const API = 'https://unstop.com/api/public/opportunity/search-result?opportunity=internships&per_page=30'

function stipend(d) {
  if (!d) return null
  const a = d.min_salary
  const b = d.max_salary
  if (!a && !b) return null
  return a && b && a !== b ? `Rs ${a} - ${b}` : `Rs ${b || a}`
}

function place(d) {
  const locs = (d?.locations || []).map((l) => l.name || l).filter(Boolean)
  if (locs.length) return locs.join(', ')
  return d?.type === 'wfh' || d?.type === 'online' ? 'Remote' : ''
}

export function mapUnstop(item) {
  return {
    externalId: String(item.id),
    title: item.title || '',
    company: item.organisation?.name || '',
    location: place(item.jobDetail),
    url: item.seo_url || item.public_url || '',
    description: (item.required_skills || item.tags || []).map((t) => t.name || t).join(', '),
    tags: ['internship'],
    postedAt: item.updated_at || null,
    stipend: item.isPaid === false ? 'Unpaid' : stipend(item.jobDetail),
    duration: null,
  }
}

export function unstop() {
  return {
    name: 'unstop',
    async fetch(http) {
      const out = []
      for (let page = 1; page <= 3; page++) {
        try {
          const res = await http(`${API}&page=${page}`, { headers: { Accept: 'application/json' } })
          const data = await res.json()
          for (const it of data?.data?.data || []) out.push(mapUnstop(it))
        } catch {
          // skip a failed page; the rest still run
        }
      }
      return out
    },
  }
}

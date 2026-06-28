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

function experience(d) {
  if (!d || (!d.min_experience && !d.max_experience)) return 'Fresher'
  if (d.min_experience && d.max_experience && d.min_experience !== d.max_experience) {
    return `${d.min_experience}-${d.max_experience} years`
  }
  return `${d.max_experience || d.min_experience} years`
}

export function mapUnstop(item, type = 'internship') {
  return {
    externalId: String(item.id),
    title: item.title || '',
    company: item.organisation?.name || '',
    location: place(item.jobDetail),
    url: item.seo_url || item.public_url || '',
    description: (item.required_skills || []).map((t) => t.skill_name || t.skill || '').filter(Boolean).join(', '),
    tags: ['internship'],
    type,
    postedAt: item.updated_at || null,
    stipend: item.isPaid === false ? 'Unpaid' : stipend(item.jobDetail),
    duration: null,
    experience: experience(item.jobDetail),
  }
}

const apiUrl = (opp, page) =>
  `https://unstop.com/api/public/opportunity/search-result?opportunity=${opp}&per_page=30&page=${page}`

export function unstop() {
  return {
    name: 'unstop',
    async fetch(http) {
      const out = []
      for (const opp of ['internships', 'jobs']) {
        for (let page = 1; page <= 3; page++) {
          try {
            const res = await http(apiUrl(opp, page), { headers: { Accept: 'application/json' } })
            const data = await res.json()
            for (const it of data?.data?.data || []) out.push(mapUnstop(it, opp === 'jobs' ? 'job' : 'internship'))
          } catch {
            // skip a failed page; the rest still run
          }
        }
      }
      return out
    },
  }
}

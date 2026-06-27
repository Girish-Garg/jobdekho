const URL = 'https://careers.google.com/api/v3/search/?q=intern&employment_type=INTERN&page_size=100'

export function google() {
  return {
    name: 'google',
    async fetch(http) {
      const res = await http(URL)
      const data = await res.json()
      return (data.jobs || []).map((j) => ({
        externalId: j.id,
        title: j.title,
        company: 'Google',
        location: (j.locations || []).map((l) => l.display).join(', '),
        url: j.apply_url || `https://careers.google.com/jobs/results/${String(j.id).split('/').pop()}`,
        description: j.summary || j.description || '',
        tags: [],
        postedAt: j.publish_date || null,
      }))
    },
  }
}

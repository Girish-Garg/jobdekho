const URL = 'https://careers.ey.com/ey/widgets/jobsearch?q=intern&limit=100'

export function ey() {
  return {
    name: 'ey',
    async fetch(http) {
      const res = await http(URL)
      const data = await res.json()
      return (data.data?.jobs || []).map((j) => ({
        externalId: String(j.jobId),
        title: j.title,
        company: 'EY',
        location: j.location || '',
        url: j.applyUrl,
        description: j.descriptionTeaser || '',
        tags: [],
        postedAt: j.postedDate || null,
      }))
    },
  }
}

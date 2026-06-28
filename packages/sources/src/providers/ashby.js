export function ashby({ slug }) {
  return {
    name: `ashby:${slug}`,
    async fetch(http) {
      const res = await http(`https://api.ashbyhq.com/posting-api/job-board/${slug}`)
      const data = await res.json()
      return (data.jobs || []).map((j) => ({
        externalId: String(j.id),
        title: j.title,
        company: slug.charAt(0).toUpperCase() + slug.slice(1),
        location: j.location || '',
        url: j.jobUrl || j.applyUrl || '',
        description: '',
        tags: [j.department, j.team].filter(Boolean),
        postedAt: j.publishedAt || null,
        type: 'job',
      }))
    },
  }
}

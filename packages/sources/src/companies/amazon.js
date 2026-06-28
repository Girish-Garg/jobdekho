const URL = 'https://www.amazon.jobs/en/search.json?loc_query=India&result_limit=100&sort=recent'

export function amazon() {
  return {
    name: 'amazon',
    async fetch(http) {
      const res = await http(URL)
      const data = await res.json()
      return (data.jobs || []).map((j) => ({
        externalId: String(j.id_icims),
        title: j.title,
        company: 'Amazon',
        location: j.normalized_location || j.location || '',
        url: `https://www.amazon.jobs${j.job_path}`,
        description: j.description_short || '',
        tags: [j.job_category].filter(Boolean),
        postedAt: j.posted_date || null,
        type: 'job',
      }))
    },
  }
}

export function lever({ slug }) {
  return {
    name: `lever:${slug}`,
    async fetch(http) {
      const res = await http(`https://api.lever.co/v0/postings/${slug}?mode=json`)
      const data = await res.json()
      return (data || []).map((j) => ({
        externalId: j.id,
        title: j.text,
        company: slug,
        location: j.categories?.location || '',
        url: j.hostedUrl,
        description: j.descriptionPlain || '',
        tags: [j.categories?.team, j.categories?.commitment].filter(Boolean),
        postedAt: j.createdAt ? new Date(j.createdAt).toISOString() : null,
        type: 'job',
      }))
    },
  }
}

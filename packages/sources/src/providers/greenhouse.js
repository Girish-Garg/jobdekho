function stripHtml(s) {
  return s.replace(/<[^>]+>/g, ' ').replace(/&amp;/g, '&').replace(/&[a-z]+;/g, ' ')
}

export function greenhouse({ slug }) {
  return {
    name: `greenhouse:${slug}`,
    async fetch(http) {
      const res = await http(`https://boards-api.greenhouse.io/v1/boards/${slug}/jobs?content=true`)
      const data = await res.json()
      return (data.jobs || []).map((j) => ({
        externalId: String(j.id),
        title: j.title,
        company: slug,
        location: j.location?.name || '',
        url: j.absolute_url,
        description: stripHtml(j.content || ''),
        tags: (j.departments || []).map((d) => d.name),
        postedAt: j.updated_at || null,
      }))
    },
  }
}

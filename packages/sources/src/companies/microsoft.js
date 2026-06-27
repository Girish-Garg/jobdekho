const URL = 'https://gcsservices.careers.microsoft.com/search/api/v1/search?q=internship&lc=India&pg=1&pgSz=50&o=Recent&flt=true'

export function microsoft() {
  return {
    name: 'microsoft',
    async fetch(http) {
      const res = await http(URL)
      const data = await res.json()
      const jobs = data.operationResult?.result?.jobs || []
      return jobs.map((j) => ({
        externalId: String(j.jobId),
        title: j.title,
        company: 'Microsoft',
        location: (j.properties?.locations || []).join(', ') || j.properties?.primaryLocation || '',
        url: `https://jobs.careers.microsoft.com/global/en/job/${j.jobId}`,
        description: j.properties?.description || '',
        tags: [j.properties?.profession].filter(Boolean),
        postedAt: j.postingDate || null,
      }))
    },
  }
}

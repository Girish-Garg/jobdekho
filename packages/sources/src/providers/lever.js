import { internLevel } from './employment-type.js'
import { toIso } from '../iso-date.js'
import { stripHtml } from '../html.js'

// Lever splits a posting: descriptionPlain is only the intro. Degree and
// experience requirements live in the lists array instead, each entry being
// {text: a heading like "Requirements", content: HTML}, so the classifier
// needs both folded together to see them. Each list's heading goes on its own
// line above its items, and a blank line separates the blocks, so the pane
// can show "Requirements" as a heading over a real list.
function fullDescription(j) {
  const lists = (j.lists || [])
    .map((l) => [l.text ? `${l.text}:` : '', stripHtml(l.content || '')].filter(Boolean).join('\n'))
  return [j.descriptionPlain || '', ...lists].filter(Boolean).join('\n\n')
}

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
        description: fullDescription(j),
        tags: [j.categories?.team, j.categories?.commitment].filter(Boolean),
        postedAt: toIso(j.createdAt),
        ...internLevel(j.categories?.commitment),
      }))
    },
  }
}

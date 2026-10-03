import { stripHtml } from '../html.js'
import { internLevel, jobType } from './employment-type.js'
import { toIso } from '../iso-date.js'
import { fetchUnlessUnchanged } from '../conditional.js'
import { payRange, workplace } from './board-pay.js'

// The HTML body comes first now that stripHtml keeps its structure. Ashby's
// own plain text writes every link out after its words ("Auth
// https://supabase.com/auth, written in Go https://github.com/..."), which
// the pane showed as it was and the scorer and fingerprints read as words.
// descriptionPlain stays the fallback for a board that publishes only that.
function body(j) {
  const html = j.descriptionHtml || j.description
  return html ? stripHtml(html) : String(j.descriptionPlain || '')
}

// includeCompensation=true adds the salary the posting shows, as numbers
// with a currency and an interval; equity and other parts are left out.
function pay(j) {
  const salary = (j.compensation?.summaryComponents || []).find((c) => c?.compensationType === 'Salary')
  if (!salary) return {}
  const text = payRange({ min: salary.minValue, max: salary.maxValue, currency: salary.currencyCode, period: salary.interval })
  return text ? { stipend: text } : {}
}

// A posting with no workplace type may still say it is remote.
const mode = (j) => workplace(j.workplaceType || (j.isRemote ? 'Remote' : ''))

// The reply is the whole board, so the adapter is `complete`: a posting it
// stops listing has closed (see the scraper's closure-turn.js). An unchanged
// board answers 304 and costs nothing. A slug is not always a name
// ("atomic-invest", "fathom.video"), so a config entry may give `company`.
export function ashby({ slug, company }) {
  const name = `ashby:${slug}`
  return {
    name,
    complete: true,
    async fetch(http, context) {
      const res = await fetchUnlessUnchanged(http, context, name, `https://api.ashbyhq.com/posting-api/job-board/${slug}?includeCompensation=true`)
      if (!res) return []
      const data = await res.json()
      return (data.jobs || []).map((j) => ({
        externalId: String(j.id),
        title: j.title,
        company: company || slug.charAt(0).toUpperCase() + slug.slice(1),
        location: j.location || '',
        url: j.jobUrl || j.applyUrl || '',
        description: body(j),
        tags: [j.department, j.team].filter(Boolean),
        postedAt: toIso(j.publishedAt),
        ...pay(j),
        ...mode(j),
        ...internLevel(j.employmentType),
        ...jobType(j.employmentType),
      }))
    },
  }
}

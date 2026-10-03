import { load } from 'cheerio'
import { stripHtml } from '../html.js'
import { internLevel, jobType } from '../providers/employment-type.js'

// The guest view of one posting: what a logged-out visitor sees on opening a
// card, from the same no-session family of endpoints as the search.
export const jobUrl = (id) => `https://www.linkedin.com/jobs-guest/jobs/api/jobPosting/${id}`

const LINKEDIN_HOST = /(^|\.)linkedin\.com$/i

// The company's own apply link, which is where InternDoor sends "Apply". None
// of the four pages sampled on 2026-09-30 carried it: each showed an offsite
// Apply button that opens a sign-in prompt for a logged-out visitor, with no
// address anywhere in the page. Earlier guest pages kept it in a hidden
// <code id="applyUrl"> as a LinkedIn redirect whose url parameter is the real
// address, so that is still read should it come back. Anything that is not a
// plain http(s) link off LinkedIn is ignored and the card's link stands.
function offsiteUrl($) {
  const raw = ($('code#applyUrl').html() || '').match(/"(https?:[^"]+)"/)?.[1]
  if (!raw) return null
  try {
    const redirect = new URL(raw)
    const target = new URL(redirect.searchParams.get('url') || raw)
    return /^https?:$/.test(target.protocol) && !LINKEDIN_HOST.test(target.hostname) ? target.href : null
  } catch {
    return null
  }
}

// The list under the body: Seniority level, Employment type, Job function,
// Industries. Only the employment type is used. It is the explicit contract
// type docs/adding-sources.md trusts, like Lever's commitment, and it says
// Internship as plainly as Full-time; Seniority level is a recruiter's
// picker, and it said Internship for a posting whose employment type was
// Temporary.
function employmentType($) {
  let type = ''
  $('.description__job-criteria-item').each((_, el) => {
    const item = $(el)
    if (/employment type/i.test(item.find('.description__job-criteria-subheader').text())) {
      type = item.find('.description__job-criteria-text').text().trim()
    }
  })
  return type
}

// The body is read from the markup block alone. Its parent also holds the
// "Show more" and "Show less" buttons, whose labels would read as body text.
export function parseLinkedinJob(html) {
  const $ = load(html)
  const body = $('.show-more-less-html__markup').first().html() || ''
  const url = offsiteUrl($)
  const employment = employmentType($)
  return {
    description: stripHtml(body),
    ...internLevel(employment),
    ...jobType(employment),
    ...(url ? { url } : {}),
  }
}

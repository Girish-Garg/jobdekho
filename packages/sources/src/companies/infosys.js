import { toIso } from '../iso-date.js'
import { politeAdapter } from './portal-polite.js'
import { sections, inIndia, titleCase } from './portal-text.js'

// career.infosys.com loads its whole job list in one call to this search,
// the one its code sends without an Authorization header (an interceptor
// strips it for intapjbsrch). sourceId is the site's own India selection:
// its assets/json/sourcelist.json maps "in" + "il" to 1 (lateral hires) and
// 21 (freshers). BPM (41) and China (61, 81) are other lists. On 2026-09-30
// it answered 1811 postings, every one in India, newest first, about 6 MB,
// with the full text inline, so no second call is needed.
const SEARCH = 'https://intapgateway.infosysapps.com/careersci/search/intapjbsrch/getCareerSearchJobs?sourceId=1,21&searchText=ALL'
const JOB_PAGE = 'https://career.infosys.com/jobdesc'

function body(j) {
  return sections([
    ['', j.postingDescription],
    ['Responsibilities', j.rolesResponsibilities],
    ['Technical requirements', j.technicalRequirement],
    ['Additional responsibilities', j.additionalResponsibility],
    ['Educational requirements', j.educationalRequirement],
    ['Preferred skills', j.preferredSkills],
  ])
}

const years = (j) =>
  (Number.isFinite(j.minExperienceLevel) ? `${j.minExperienceLevel} - ${j.maxExperienceLevel ?? j.minExperienceLevel} years` : null)

// createdOn has no zone ("2026-09-29T13:37:38.743"). It is read as UTC so a
// date does not shift with the machine's zone; at worst it is 5.5 hours off.
const created = (s) => (s && !/[zZ]|[+-]\d\d:?\d\d$/.test(s) ? toIso(`${s}Z`) : toIso(s))

function toPosting(j) {
  const ref = String(j.referenceCode || '')
  return {
    externalId: ref,
    title: j.postingTitle || '',
    company: 'Infosys',
    location: inIndia(titleCase(j.location)),
    url: `${JOB_PAGE}?jobReferenceCode=${encodeURIComponent(ref)}&sourceId=${j.sourceId ?? 1}`,
    description: body(j),
    tags: [j.functionalArea, j.unit].filter(Boolean),
    postedAt: created(j.createdOn),
    experience: years(j),
  }
}

// country is checked as well as the source ids: sourceId 21 is empty today,
// and a future row from another country must not ride in on it.
export function infosys() {
  return politeAdapter('infosys', async (http) => {
    const rows = await (await http(SEARCH)).json()
    return (Array.isArray(rows) ? rows : [])
      .filter((j) => j?.referenceCode && (!j.country || /^india$/i.test(j.country)))
      .map(toPosting)
  })
}

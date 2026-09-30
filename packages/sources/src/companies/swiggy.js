import { toIso } from '../iso-date.js'
import { politeAdapter } from './portal-polite.js'
import { sections, inIndia } from './portal-text.js'

// careers.swiggy.com embeds MyNextHire's job board, which loads every open
// requisition in one POST, the same body the board's careers.js sends. No
// login, cookie or token: on 2026-09-30 it answered 83 roles, all in India,
// about 420 KB, each with its full description inline.
const HOST = 'https://swiggy.mynexthire.com'
const LIST = `${HOST}/employer/careers/reqlist/get`
const QUERY = { source: 'careers', code: '', filterByBuId: -1 }

// The board's own link to a posting is its careers page with the view in a
// base64 JSON "p" parameter (encoder.js, getEncodedJobboardLink): the same
// object the board builds with getQStringObject, pointed at one requisition.
function jobLink(reqId) {
  const view = {
    pageType: 'jd', cvSource: 'careers', reqId,
    requester: { id: '', code: '', name: '' }, page: 'careers', bufilter: -1, customFields: {},
  }
  const p = Buffer.from(JSON.stringify(view), 'utf8').toString('base64')
  return `${HOST}/employer/jobs/careers?src=careers&p=${encodeURIComponent(p)}`
}

const offices = (r) => {
  const listed = (r.locationList || []).map((l) => l?.office).filter(Boolean)
  return listed.length ? listed.join(' / ') : r.location || ''
}

const years = (r) => (Number.isFinite(r.expMin) ? `${r.expMin} - ${r.expMax ?? r.expMin} years` : null)

function toPosting(r) {
  return {
    externalId: String(r.reqId),
    title: r.reqTitle || r.designation || '',
    company: 'Swiggy',
    location: inIndia(offices(r)),
    url: jobLink(r.reqId),
    description: sections([['', r.jdDisplay]]),
    tags: [r.careerStream, r.buName].filter(Boolean),
    // approvedOn is when the requisition opened, "2026-09-09T04:43:38.697+0000".
    postedAt: toIso(r.approvedOn),
    experience: years(r),
  }
}

export function swiggy() {
  return politeAdapter('swiggy', async (http) => {
    const res = await http(LIST, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(QUERY),
    })
    const rows = (await res.json())?.reqDetailsBOList
    return (Array.isArray(rows) ? rows : []).filter((r) => r?.reqId != null).map(toPosting)
  })
}

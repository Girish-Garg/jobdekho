import { placesOf, fromSeconds } from './eightfold-places.js'

// The older careers site, still what HSBC, NetApp and Millennium run: the
// same list, ten a request, but from /api/apply/v2 and in snake_case. Its
// PCSX routes answer 403 ("PCSX is not enabled for this user"). A listed
// position carries an empty job_description; the body comes from the
// position's own call. Here sort_by=timestamp orders by t_create, the date
// the posting went up, while t_update moves every day and says nothing.
function row(p) {
  return {
    id: p?.id == null ? '' : String(p.id),
    title: p?.name || p?.posting_name || '',
    places: placesOf(null, p?.locations?.length ? p.locations : [p?.location]),
    postedAt: fromSeconds(p?.t_create),
    department: p?.department || '',
    workMode: p?.work_location_option || '',
    url: p?.canonicalPositionUrl || '',
  }
}

function detail(d) {
  return {
    title: d.name || d.posting_name || '',
    places: placesOf(null, d.locations?.length ? d.locations : [d.location]),
    body: d.job_description || '',
    url: d.canonicalPositionUrl || '',
    employmentType: [],
  }
}

export const v2 = {
  name: 'v2',
  listUrl: (site, start) =>
    `${site.origin}/api/apply/v2/jobs?${site.query}&location=India&start=${start}&num=10&sort_by=timestamp`,
  detailUrl: (site, id) => `${site.origin}/api/apply/v2/jobs/${id}?${site.query}`,
  page: (json) => ({ count: json?.count, rows: (json?.positions || []).map(row) }),
  // The position is the whole response, not wrapped in data.
  info: (json) => (json?.id == null ? null : detail(json)),
}

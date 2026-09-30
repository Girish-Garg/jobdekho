import { placesOf, fromSeconds } from './eightfold-places.js'

// PCSX, the careers site Eightfold has been moving tenants to (Qualcomm,
// Microsoft, Ericsson, Infineon, Lam Research). Its search answers ten
// positions a request whatever size is asked for, and `location=India` is the
// filter the site's own location box sends. The older /api/apply/v2 routes
// answer 403 on these sites ("Not authorized for PCSX").
//
// sort_by=timestamp orders by postedTs, newest first. postedTs is the date
// the site gives a posting and moves when the company reposts it, so a role
// first created in April can carry this week's date; creationTs keeps the
// April one. postedTs is the one used, being what the site itself shows and
// sorts by, with creationTs only where it is missing.
function row(p, origin) {
  return {
    id: p?.id == null ? '' : String(p.id),
    title: p?.name || '',
    places: placesOf(p?.standardizedLocations, p?.locations),
    postedAt: fromSeconds(p?.postedTs) || fromSeconds(p?.creationTs),
    department: p?.department || '',
    workMode: p?.workLocationOption || '',
    url: p?.positionUrl ? `${origin}${p.positionUrl}` : '',
  }
}

// The detail's own name for its employment type is a tenant custom field;
// Microsoft fills efcustomTextEmploymentType, most tenants nothing.
function detail(d) {
  return {
    title: d.name || '',
    places: placesOf(d.standardizedLocations, d.locations),
    body: d.jobDescription || '',
    url: d.publicUrl || '',
    employmentType: [].concat(d.efcustomTextEmploymentType || []),
  }
}

export const pcsx = {
  name: 'pcsx',
  listUrl: (site, start) =>
    `${site.origin}/api/pcsx/search?${site.query}&query=&location=India&start=${start}&sort_by=timestamp`,
  detailUrl: (site, id) => `${site.origin}/api/pcsx/position_details?position_id=${id}&${site.query}&hl=en`,
  page: (json, site) => ({
    count: json?.data?.count,
    rows: (json?.data?.positions || []).map((p) => row(p, site.origin)),
  }),
  info: (json) => (json?.data ? detail(json.data) : null),
}

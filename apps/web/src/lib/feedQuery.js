// The server reads the companies comma-separated, so a comma inside a name
// ("Acme, Inc.") would split it in two. As a space it changes nothing: the
// server matches a name by a key that ignores punctuation.
const companyList = (names = []) => names.map((name) => name.replaceAll(',', ' ')).join(',');

// The filter bar's state as the query the server reads (see its
// api/feed-options.js), the same for the feed and for the company menu that
// counts it, so the two cannot disagree about which jobs a filter leaves.
// `q` is passed in because the feed waits for a pause in typing first.
export function feedQuery(filters, q = filters.q ?? '') {
  return {
    q,
    excludedSources: (filters.excludedSources || []).join(','),
    companies: companyList(filters.companies),
    status: filters.status,
    levels: (filters.levels || []).join(','),
    workModes: (filters.workModes || []).join(','),
    maxDegree: filters.maxDegree,
    minStipend: filters.minStipend,
    maxExperienceYears: filters.maxExp,
    maxDurationMonths: filters.maxMonths,
    includeStale: filters.includeStale,
    minFit: filters.minFit,
  };
}

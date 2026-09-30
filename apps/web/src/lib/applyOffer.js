// Which postings get Apply assist. Job boards do not: LinkedIn, Internshala,
// Unstop, Instahyre, Naukri and the aggregators apply through their own
// signed-in platforms (LinkedIn forbids automation outright). The server keeps
// the same list and refuses them too (apply/apply-url.js); this only saves
// showing a button that could not work.
const JOB_BOARDS = new Set([
  'linkedin', 'internshala', 'unstop', 'instahyre', 'naukri',
  'adzuna', 'remoteok', 'remotive', 'arbeitnow', 'wellfound', 'indeed',
]);

export function offersApply(posting) {
  const source = String(posting?.source ?? '').split(':')[0].toLowerCase();
  return Boolean(posting?.url) && /^https?:\/\//i.test(posting.url) && !JOB_BOARDS.has(source);
}

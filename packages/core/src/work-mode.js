export const WORK_MODES = ['remote', 'hybrid', 'onsite']

const HYBRID = /\bhybrid\b/i
const REMOTE = /remote|work from home|\bwfh\b|worldwide|anywhere|globally|distributed/i

// Hybrid is checked first: "Remote (Hybrid)" and "Bengaluru, Hybrid - Remote"
// both name a desk you have to show up at, so the hybrid signal is the stronger
// one wherever the two appear together.
export function classifyWorkMode(location = '', tags = []) {
  const hay = `${location} ${tags.join(' ')}`
  if (HYBRID.test(hay)) return 'hybrid'
  if (REMOTE.test(hay)) return 'remote'
  // An unstated location is not evidence of an office, but every source that
  // names a city means one, and onsite is the safer default for the rest.
  return 'onsite'
}

import { escapeLine, texLink } from './escape.js'

// Most profiles hold a link as typed from a browser bar ("github.com/x"),
// with no scheme, which the SAFE_URL check in texLink would otherwise reject
// outright. Adding https:// when one is missing is the only normalisation
// this file does to a link; anything already carrying a scheme is left alone.
const withScheme = (value) => (/^[a-z][a-z0-9+.-]*:\/\//i.test(value) ? value : `https://${value}`)

// The one line under a name that says where and how to reach the person,
// the same on a resume and on a cover letter so the two read as one set.
// The person's other profiles (Kaggle, LeetCode, a blog) follow the three
// named links and print the same way, as their address.
export function contactLine(basics = {}) {
  const plain = [basics.location, basics.email, basics.phone].filter(Boolean).map(escapeLine)
  const more = (Array.isArray(basics.moreLinks) ? basics.moreLinks : []).map((link) => link?.url)
  const links = [basics.links?.github, basics.links?.linkedin, basics.links?.portfolio, ...more]
    .filter(Boolean)
    .map((value) => texLink(withScheme(value)))
  return [...plain, ...links].filter(Boolean).join(' | ')
}

import { stripHtml } from '../html.js'
import { decodeEntities } from '../html-entities.js'
import { toIso } from '../iso-date.js'
import { placeOf, namesPlace } from './hn-place.js'

// One top-level post in an HN "Ask HN: Who is hiring?" thread, as the HN
// Search API (hn.algolia.com) returns it, turned into a posting, or null for
// a post that is not one or not for someone in India. The header line
// "Company | Role | Location | REMOTE | Salary | URL" is the thread's
// convention, not a rule, so every field is a guess, and the whole post
// stays the description for the reader to judge.
const ROLE = /\b(engineer|engineers|developer|developers|scientist|designer|manager|analyst|intern|architect|lead|sre|devops|researcher|founding|staff|head of|product|data|ml|ai|backend|frontend|full[- ]?stack|mobile|ios|android|security|qa|operations|marketing|sales|recruiter)\b/i
// YC writes a batch as its season's letter and year: W26, S26, F26 and P26
// (Spring, as YC's own pages print it).
const BATCH = /\(\s*YC\s+([WSFP]\d{2})\b[^)]*\)/i
const HN_HOST = /(^|\.)news\.ycombinator\.com$/i
// Header fields that are never the role: how, pay and links, a web address
// written bare among them.
const NOT_ROLE = /^(on-?site|remote|hybrid|full[- ]?time|part[- ]?time|contract(or)?|freelance)\b|^https?:|^[\w.-]+\.(com|io|ai|dev|co|org|net|app|xyz|so|tech)\/?$|[$₹€£]|\bsalary\b/i

// The first field that reads as a role, else the first that is no place,
// work mode, pay or link. A header naming none ("Acme | NYC | REMOTE") gets
// a plain title rather than a city for one.
function titleOf(parts, location) {
  const fields = parts.slice(1).filter((part) => part !== location && !NOT_ROLE.test(part))
  return fields.find((part) => ROLE.test(part)) || fields.find((part) => !namesPlace(part)) || 'Open roles'
}

// The post's own link out, the company's page for the role, when it has one.
// Links arrive with their slashes escaped ("https:&#x2F;&#x2F;"), and one
// pointing back to HN is no link out.
function linkOut(html) {
  for (const match of String(html || '').matchAll(/href="([^"]+)"/g)) {
    try {
      const url = new URL(decodeEntities(match[1]))
      if (/^https?:$/.test(url.protocol) && !HN_HOST.test(url.hostname)) return url.href
    } catch {
      // not a link worth following
    }
  }
  return null
}

export function parseHiring(comment) {
  if (!comment?.id || !comment.text || !comment.author) return null
  const body = stripHtml(comment.text)
  const header = body.split('\n')[0] || ''
  const parts = header.split('|').map((part) => part.trim()).filter(Boolean)
  if (parts.length < 3) return null
  const place = placeOf(parts, body)
  if (!place.keep) return null
  const batch = header.match(BATCH)?.[1]?.toUpperCase()
  return {
    externalId: String(comment.id),
    title: titleOf(parts, place.location),
    company: parts[0].replace(BATCH, '').replace(/https?:\/\/\S+/g, '').trim(),
    location: place.location,
    url: linkOut(comment.text) ?? `https://news.ycombinator.com/item?id=${comment.id}`,
    description: body,
    tags: ['HN Who is hiring', ...(batch ? [`YC ${batch}`] : [])],
    postedAt: toIso(comment.created_at),
  }
}

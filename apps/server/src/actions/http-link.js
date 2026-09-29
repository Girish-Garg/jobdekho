// Model output lands on the page as links, so only links a browser can open
// safely pass: a javascript: or file: URL in a source list would otherwise
// render as a link, and a very long one is a payload rather than a source.
// Shared by every reply that cites the web (the fake check, a chat answer
// from a search).
const MAX_URL = 500

export function isHttpLink(value) {
  if (typeof value !== 'string' || value.length > MAX_URL) return false
  try {
    return ['http:', 'https:'].includes(new URL(value).protocol)
  } catch {
    return false
  }
}

// Antigravity's search hands the model Google redirect links rather than the
// pages, and they come back as its sources: an opaque address that stops
// working within days and shows as "vertexaisearch" beside the answer.
// Measured on agy 1.2.13. A source is the page itself or it is left out; the
// prompts ask for the publication to be named in the text instead.
const SEARCH_REDIRECT = /^https?:\/\/(vertexaisearch\.cloud\.google\.com\/grounding-api-redirect\/|(www\.)?google\.[a-z.]+\/url\?)/i

export const isSourceLink = (value) => isHttpLink(value) && !SEARCH_REDIRECT.test(value)

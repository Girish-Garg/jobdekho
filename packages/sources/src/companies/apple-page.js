// jobs.apple.com renders on the server and hands its data to the browser as
// window.__staticRouterHydrationData = JSON.parse("..."): a JSON document
// inside a JS string literal. The literal is cut out by walking to its
// closing quote, skipping escaped characters, then parsed twice, once to
// undo the string and once for the document.
const MARK = 'window.__staticRouterHydrationData = JSON.parse('

function hydration(html) {
  const text = String(html || '')
  const at = text.indexOf(MARK)
  const start = at < 0 ? -1 : text.indexOf('"', at + MARK.length)
  if (start < 0) return null
  let i = start + 1
  while (i < text.length && text[i] !== '"') i += text[i] === '\\' ? 2 : 1
  try {
    return JSON.parse(JSON.parse(text.slice(start, i + 1)))
  } catch {
    return null
  }
}

// A search page's results. Thrown when the page carries no search data at
// all: a layout change must fail the source, not read as an empty board.
export function parseSearch(html) {
  const search = hydration(html)?.loaderData?.search
  if (!search) throw new Error('apple: no search results found in the page')
  return Array.isArray(search.searchResults) ? search.searchResults : []
}

// A posting's own page: everything the search result leaves out.
export const parseDetail = (html) => hydration(html)?.loaderData?.jobDetails?.jobsData || null

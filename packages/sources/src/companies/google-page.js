// Google's careers results page is rendered on the server, and the jobs it
// shows are embedded whole in the page as the payload of one of its
// AF_initDataCallback({key: 'ds:N', hash: 'N', data: [...], sideChannel: {}})
// calls. data is plain JSON; the object around it is not (bare keys, single
// quotes), so only the data part is cut out and parsed.
const CALLBACK = /AF_initDataCallback\(\{key: '[^']*'[\s\S]*?data:([\s\S]*?), sideChannel: \{\}\}\);<\/script>/g

// The job list is the payload whose first element is a list of jobs, each an
// array opening with a numeric id and a title. ds:0 on the same page is the
// list of hiring companies, whose rows open with "projects/..." instead.
const isJob = (j) => Array.isArray(j) && /^\d+$/.test(String(j[0])) && typeof j[1] === 'string'
const isJobList = (data) => Array.isArray(data?.[0]) && data[0].every(isJob)

function payloads(html) {
  const out = []
  for (const m of String(html || '').matchAll(CALLBACK)) {
    try {
      out.push(JSON.parse(m[1]))
    } catch {
      // another callback's payload that is not JSON; the job list still may be
    }
  }
  return out
}

// The page's jobs as arrays, or a thrown error when no job list is embedded
// at all: a layout change must fail the source, not look like an empty board.
// A page that embeds the list with nothing in it is a genuinely empty one.
export function jobsFromPage(html) {
  const found = payloads(html).find(isJobList)
  if (!found) throw new Error('google: no job list found in the results page')
  return found[0]
}

// How Instahyre's search is read: each job function group in slices, each
// slice page by page until a short page.
//
// Instahyre files every job under its own experience levels (the search's
// meta.job_experience_levels: internship, entry_level, associate, mid_senior,
// senior), a job often under several. The internship and entry level slices
// are small (about 65 and 480 board-wide, a few dozen for each group), so
// they are read whole, and a job in neither is one Instahyre files above
// entry level. A title alone misled: an "SDE 1" asking 6 to 9 years was shown
// as Entry. The general slice samples a board of about 13,000 jobs with no
// date to sort by, so two pages is where it stops.
//
// Asking for more than 35 a page still returns 35, so paging assumes exactly
// that. A small slice that runs past WHOLE pages is not read to its end.
export const LIMIT = 35
const WHOLE = 6

export const SLICES = [
  { key: 'internship', jobType: 'internship', filter: 'job_type=2', pages: WHOLE, whole: true },
  { key: 'entry', jobType: 'full_time', filter: 'job_type=1&experience_level=entry_level', pages: WHOLE, whole: true },
  { key: 'general', jobType: 'full_time', filter: 'job_type=1', pages: 2 },
]

const url = (group, filter, page) =>
  `https://www.instahyre.com/api/v1/job_search?${filter}` +
  group.map((id) => `&job_functions=${id}`).join('') +
  `&limit=${LIMIT}&offset=${page * LIMIT}`

// One slice of one group: its jobs, and whether it was read to its end (a
// short page reached, no page lost on the way). One bad page does not lose
// the pages that did come back.
export async function readSlice(http, group, slice) {
  const objects = []
  let lost = false
  for (let page = 0; page < slice.pages; page++) {
    let got
    try {
      got = (await (await http(url(group, slice.filter, page))).json()).objects || []
    } catch {
      lost = true
      continue
    }
    objects.push(...got)
    if (got.length < LIMIT) return { objects, whole: !lost }
  }
  return { objects, whole: false }
}

// 'entry' for a job in the entry level slice. 'above-entry' for one in
// neither small slice, but only when every small slice was read whole: a job
// on a page left unread could be entry level. Else null, which says nothing.
export const seniorityOf = (keys, whole) => {
  if (keys.has('entry')) return 'entry'
  return !keys.has('internship') && whole ? 'above-entry' : null
}

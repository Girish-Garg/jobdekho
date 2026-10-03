// Boards and aggregators list jobs for any company that posts there; every
// other source is one company's own careers site or ATS board (a
// "greenhouse:stripe", "workday:pwc", "amazon"). Listed this way round so a
// source added later is treated as a careers site until someone says
// otherwise: Caution never fires on a company's own site, and a wrong guess
// that way only misses a flag.
const BOARDS = new Set(['internshala', 'unstop', 'adzuna', 'remotive', 'remoteok', 'arbeitnow', 'linkedin', 'instahyre', 'hn-hiring'])

export const sourceKind = (source) => String(source || '').split(':')[0]

export const isCareerSite = (source) => !BOARDS.has(sourceKind(source))

// Boards whose stored text is a card's few lines or a skill list, never the
// employer's whole description, so its length says nothing about the job.
const CARD_ONLY = new Set(['internshala', 'unstop', 'instahyre', 'adzuna'])

export const cardOnly = (source) => CARD_ONLY.has(sourceKind(source))

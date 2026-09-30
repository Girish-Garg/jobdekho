import { ripplehire } from './ripplehire.js'

// careers.mphasis.com links to mphasis.ripplehire.com/ripplehire/careers,
// which redirects to the career site this token names. That site has no
// country filter (geo=India answers nothing) and its city filter takes one
// city at a time, so India is read off each row's own country code,
// jobLocation "IND". On 2026-09-30: 209 postings worldwide, 91 in India.
export const mphasis = (options) =>
  ripplehire({
    name: 'mphasis',
    company: 'Mphasis',
    host: 'mphasis.ripplehire.com',
    token: 'ty4DfyWddnOrtpclQeia',
    keep: (row) => row?.jobLocation === 'IND',
  }, options)

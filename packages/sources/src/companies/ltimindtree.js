import { ripplehire } from './ripplehire.js'

// ltimindtree.com now redirects to ltm.com, whose careers page links each
// region to its own RippleHire career site. This token is the India one's,
// the link that ends #list/geo=India; geo is that same filter, sent with
// every search. It answered 518 India postings on 2026-09-30.
export const ltimindtree = (options) =>
  ripplehire({
    name: 'ltimindtree',
    company: 'LTIMindtree',
    host: 'ltimindtree.ripplehire.com',
    token: 'xviyQvbnyYZdGtozXoNm',
    geo: 'India',
  }, options)

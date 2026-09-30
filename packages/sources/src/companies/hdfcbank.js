import { ripplehire } from './ripplehire.js'

// hdfc.bank.in/careers links to hdfcbank.ripplehire.com/candidate/careers,
// which redirects to the career site this token names. Every posting on it
// is in India (386 on 2026-09-30, in some 150 towns) and it has no country
// filter (geo=India answers nothing), so none is sent. Most are branch
// banking and sales roles that config/filters.json leaves out; the filter
// check before each detail call keeps those from costing one.
export const hdfcbank = (options) =>
  ripplehire({
    name: 'hdfcbank',
    company: 'HDFC Bank',
    host: 'hdfcbank.ripplehire.com',
    token: 'pvB5iAMcmu4ydUh2IW2O',
  }, options)

import { zwayam } from './zwayam.js'

// cyient.com/careers links to careers.cyient.com, Zwayam's app; domain and
// company id are the ones in its environment. 111 postings on 2026-09-30,
// every one in India.
export const cyient = (options) =>
  zwayam({
    name: 'cyient',
    company: 'Cyient',
    domain: 'careers.cyient.com',
    companyId: 'MTU0ODY=',
    base: 'https://careers.cyient.com/cyient/',
  }, options)

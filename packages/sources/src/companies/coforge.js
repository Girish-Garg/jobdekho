import { zwayam } from './zwayam.js'

// careers.coforge.com is Zwayam's app; domain and company id are the ones in
// its environment. 110 postings on 2026-09-30, 67 of them in India.
export const coforge = (options) =>
  zwayam({
    name: 'coforge',
    company: 'Coforge',
    domain: 'careers.coforge.com',
    companyId: 'MTUxNzM=',
    base: 'https://careers.coforge.com/coforge/',
  }, options)

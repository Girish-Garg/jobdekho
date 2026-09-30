import { describe, it, expect } from 'vitest'
import { batchCode, pickCompanies } from '../scripts/yc/seed.js'
import { detectBoards, careersLinks } from '../scripts/yc/detect.js'
import { mergeCandidates } from '../scripts/yc/merge.js'
import { verifyBoard } from '../scripts/yc/verify.js'
import { politeHttp } from '../scripts/yc/polite.js'

// Shapes from yc-oss's hiring.json as fetched on 2026-09-30, trimmed.
const seed = [
  { name: 'Bolna AI', website: 'https://bolna.ai', batch: 'Fall 2025', regions: ['India', 'South Asia'], isHiring: true },
  { name: 'RevenueCat', website: 'https://www.revenuecat.com/', batch: 'Summer 2018', regions: ['United States of America', 'Remote', 'Fully Remote'], isHiring: true },
  { name: 'Whatnot', website: 'https://www.whatnot.com/careers', batch: 'Winter 2020', regions: ['America / Canada', 'Partly Remote'], isHiring: true },
  { name: 'Manicule', website: 'https://manicule.example', batch: 'Spring 2026', regions: ['Fully Remote'], isHiring: true },
  { name: 'Nowhere', website: '', batch: 'Winter 2021', regions: ['India'], isHiring: true },
]

describe('the YC seed', () => {
  it('writes batches the way YC does, Spring as P', () => {
    expect(batchCode('Winter 2021')).toBe('W21')
    expect(batchCode('Fall 2025')).toBe('F25')
    expect(batchCode('Spring 2026')).toBe('P26')
    expect(batchCode('Unspecified')).toBeNull()
  })

  it('keeps companies based in India or fully remote, with a website', () => {
    expect(pickCompanies(seed).map((c) => [c.name, c.batch, c.india])).toEqual([
      ['Bolna AI', 'F25', true], ['RevenueCat', 'S18', false], ['Manicule', 'P26', false],
    ])
  })
})

describe('finding a board on a company site', () => {
  it('reads the boards JobDekho can read out of links, frames and scripts', () => {
    const html = `
      <a href="https://jobs.ashbyhq.com/revenuecat">Careers</a>
      <iframe src="https://boards.greenhouse.io/embed/job_board?for=alpaca"></iframe>
      <a href="https://apply.workable.com/writesonic/j/34B5B0E049/">Account Executive</a>
      <script src="https://apply.workable.com/api/v1/widget.js"></script>`
    expect(detectBoards(html)).toEqual([
      { provider: 'greenhouse', slug: 'alpaca' },
      { provider: 'ashby', slug: 'revenuecat' },
      { provider: 'workable', slug: 'writesonic' },
    ])
  })

  it('follows links that say careers or jobs, and never to YC, WaaS or a social network', () => {
    const html = `
      <a href="/careers">Careers</a>
      <a href="https://www.linkedin.com/company/acme/jobs">Jobs</a>
      <a href="https://www.ycombinator.com/companies/acme/jobs">Jobs</a>
      <a href="https://acme.com/team"><span>We're hiring</span></a>
      <a href="/pricing">Pricing</a>`
    expect(careersLinks(html, 'https://acme.com/')).toEqual(['https://acme.com/careers', 'https://acme.com/team'])
  })
})

describe('adding what was found to the config', () => {
  it('adds a new board with the company and its tag, and tags a board already listed', () => {
    const config = { providers: [{ provider: 'greenhouse', slug: 'razorpaysoftwareprivatelimited', company: 'Razorpay' }], boards: ['internshala'] }
    const found = [
      { name: 'Razorpay', batch: 'W15', entry: { provider: 'greenhouse', slug: 'RazorpaySoftwarePrivateLimited' } },
      { name: 'Bolna AI', batch: 'F25', entry: { provider: 'ashby', slug: 'bolna' } },
    ]
    const out = mergeCandidates(config, found)
    expect(out.config.providers).toEqual([
      { provider: 'greenhouse', slug: 'razorpaysoftwareprivatelimited', company: 'Razorpay', tags: ['YC W15'] },
      { provider: 'ashby', slug: 'bolna', company: 'Bolna AI', tags: ['YC F25'] },
    ])
    expect(out.config.boards).toEqual(['internshala'])
    expect(mergeCandidates(out.config, found).added).toEqual([])
  })
})

describe('verifying a board', () => {
  const rules = { includeKeywords: ['engineer'], excludeKeywords: [], locations: ['india'] }
  const lever = (postings) => async () => ({ json: async () => postings })

  it('keeps a board only when the relevance rules keep one of its postings', async () => {
    const yes = await verifyBoard({ provider: 'lever', slug: 'acme' }, lever([{ id: '1', text: 'Backend Engineer', categories: { location: 'Bengaluru, India' } }]), rules)
    expect(yes).toMatchObject({ ok: true, name: 'lever:acme', total: 1, kept: 1 })
    const no = await verifyBoard({ provider: 'lever', slug: 'acme' }, lever([{ id: '1', text: 'Backend Engineer', categories: { location: 'Austin, TX' } }]), rules)
    expect(no).toMatchObject({ ok: false, why: 'no posting passes the relevance rules' })
  })
})

describe('the seed\'s own requests', () => {
  it('stays out where robots.txt says so, and takes a challenge as a no', async () => {
    const fetchImpl = async (url) => {
      if (url === 'https://a.example/robots.txt') return new Response('User-agent: *\nDisallow: /', { status: 200 })
      if (url.endsWith('/robots.txt')) return new Response('', { status: 404 })
      return new Response('<title>Just a moment...</title>', { status: 403, headers: { 'cf-mitigated': 'challenge' } })
    }
    const web = politeHttp({ fetchImpl, gapMs: 0 })
    expect(await web.page('https://a.example/careers')).toEqual({ ok: false, why: 'robots.txt disallows it' })
    expect(await web.page('https://b.example/careers')).toEqual({ ok: false, why: 'blocked (HTTP 403)' })
  })
})

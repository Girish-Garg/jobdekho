import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { parseRobots, allowedBy } from '@jobdekho/sources/robots/robots-parse.js'
import { createRobotsCheck } from '@jobdekho/sources/robots/robots-check.js'
import { checkTarget } from '@jobdekho/sources/closure/link-target.js'
import { verdict, jobToken, dropsJob } from '@jobdekho/sources/closure/closed-signs.js'
import { checkLinks } from '@jobdekho/sources/closure/link-check.js'

// Replies captured on 2026-09-30 for postings that no longer exist.
const fixture = (name) => readFileSync(new URL(`./fixtures/closure/${name}`, import.meta.url), 'utf8')

describe('robots.txt', () => {
  it('reads LinkedIn as closed to every crawler but the ones it names', () => {
    const groups = parseRobots(fixture('robots-linkedin.txt'))
    expect(allowedBy(groups, '/jobs-guest/jobs/api/jobPosting/4301234567')).toBe(false)
    expect(allowedBy(groups, '/', 'googlebot')).toBe(true)
  })

  it('keeps Adzuna\'s redirect links and Internshala\'s query strings out, and their job pages in', () => {
    const adzuna = parseRobots(fixture('robots-adzuna.txt'))
    expect(allowedBy(adzuna, '/land/ad/4912345678?se=x&v=y')).toBe(false)
    const internshala = parseRobots(fixture('robots-internshala.txt'))
    expect(allowedBy(internshala, '/internship/detail/java-development-internship-at-acme1790682829')).toBe(true)
    expect(allowedBy(internshala, '/internship/details/abc')).toBe(false)
    expect(allowedBy(internshala, '/internship/detail/abc?utm_source=x')).toBe(false)
  })

  it('lets the longest rule win, and Allow win a tie', () => {
    const groups = parseRobots('User-agent: *\nDisallow: /\nAllow: /careers\nDisallow: /careers/admin$\n')
    expect(allowedBy(groups, '/careers/api/jobs/default/active')).toBe(true)
    expect(allowedBy(groups, '/careers/admin')).toBe(false)
    expect(allowedBy(groups, '/api')).toBe(false)
  })

  it('reads robots.txt once per host: missing allows all, a failure or a challenge allows nothing', async () => {
    const answers = {
      'https://a.example': { status: 404 },
      'https://b.example': { status: 503 },
      'https://c.example': { status: 403, headers: { 'cf-mitigated': 'challenge' } },
      'https://d.example': { status: 403, body: '<title>Just a moment...</title>' },
      'https://e.example': { status: 429 },
      // Ashby's API host, 2026-10-01: a plain 401, which is no robots.txt at all.
      'https://api.ashbyhq.com': { status: 401, body: 'Unauthorized' },
    }
    const asked = []
    const http = async (url) => {
      asked.push(url)
      const { status, headers = {}, body = '' } = answers[new URL(url).origin]
      return { status, headers: { get: (name) => headers[name] ?? null }, text: async () => body }
    }
    const allowed = createRobotsCheck(http)
    expect(await allowed('https://a.example/job/1')).toBe(true)
    expect(await allowed('https://a.example/job/2')).toBe(true)
    expect(await allowed('https://b.example/job/1')).toBe(false)
    expect(await allowed('https://c.example/job/1')).toBe(false)
    expect(await allowed('https://d.example/job/1')).toBe(false)
    expect(await allowed('https://e.example/job/1')).toBe(false)
    expect(await allowed('https://api.ashbyhq.com/posting-api/job-board/deepgram')).toBe(true)
    expect(asked.filter((u) => u.startsWith('https://a.example'))).toHaveLength(1)
  })
})

describe('checkTarget', () => {
  it('checks a Workday posting through its careers site\'s job API', () => {
    const row = { source: 'workday:nvidia', url: 'https://nvidia.wd5.myworkdayjobs.com/en-US/NVIDIAExternalCareerSite/job/India-Bengaluru/Senior-Engineer_JR1' }
    expect(checkTarget(row)).toBe('https://nvidia.wd5.myworkdayjobs.com/wday/cxs/nvidia/NVIDIAExternalCareerSite/job/India-Bengaluru/Senior-Engineer_JR1')
  })

  // The apply page is drawn by script with the job after the #, which is
  // never sent, so the job record it reads is checked instead.
  it("checks a KPIT posting through its TalentOjo job record", () => {
    const url = 'https://talentojo.kpit.com/tojo/app/job-apply/#/Career%20Portal/82118'
    expect(checkTarget({ source: 'kpit', url })).toBe('https://talentojo.kpit.com/service/jobs/82118')
    expect(checkTarget({ source: 'kpit', url: 'https://talentojo.kpit.com/tojo/app/job-apply/' })).toBeNull()
  })

  it('checks nothing where robots.txt, a challenge or a script-drawn page leaves nothing to learn', () => {
    for (const source of ['linkedin', 'adzuna:in', 'instahyre', 'remotive', 'ashby:acme', 'unstop']) {
      expect(checkTarget({ source, url: 'https://example.com/job/12345' })).toBeNull()
    }
    expect(checkTarget({ source: 'hn-hiring', url: 'https://news.ycombinator.com/item?id=49523558' })).toBeNull()
    expect(checkTarget({ source: 'internshala', url: 'javascript:alert(1)' })).toBeNull()
    expect(checkTarget({ source: 'internshala', url: 'https://internshala.com/internship/detail/x1790682829' })).toBe('https://internshala.com/internship/detail/x1790682829')
  })
})

describe('verdict', () => {
  it('reads 404 and 410 as gone (Lever, Workday, Arbeitnow)', () => {
    expect(verdict({ target: 'https://jobs.lever.co/meesho/00000000-0000-4000-8000-000000000000', status: 404, body: fixture('lever-gone.html') })).toBe('gone')
    expect(verdict({ target: 'https://nvidia.wd5.myworkdayjobs.com/wday/cxs/nvidia/x/job/y/Engineer_JR1000001', status: 404, body: fixture('workday-job-gone.json') })).toBe('gone')
    expect(verdict({ target: 'https://www.arbeitnow.com/jobs/companies/acme/engineer-1000001', status: 410, body: fixture('arbeitnow-gone.html') })).toBe('gone')
  })

  it('reads Greenhouse sending a job to its board as gone, and a redirect that keeps the job as one to follow', () => {
    expect(verdict({ target: 'https://job-boards.greenhouse.io/hackerrank/jobs/1000001', status: 302, location: '/hackerrank?error=true' })).toBe('gone')
    expect(verdict({ target: 'https://www.amazon.jobs/en/jobs/10565380', status: 302, location: 'https://www.amazon.jobs/en/jobs/10565380/regional-environmental-engineer' })).toBe('follow')
  })

  it('reads Apple\'s 200 page that says the role is gone as gone, and an open page as live', () => {
    expect(verdict({ target: 'https://jobs.apple.com/en-in/details/200000001', status: 200, body: fixture('apple-role-gone.html') })).toBe('gone')
    expect(verdict({ target: 'https://internshala.com/internship/detail/java-development-internship-at-acme1790682829', status: 200, body: fixture('internshala-open.html') })).toBe('live')
  })

  // KPIT's apply page reads 410 or 404 as gone, and a record whose status is
  // no longer Published as closed.
  it("reads a KPIT job record that is gone, or no longer Published, as gone", () => {
    const target = 'https://talentojo.kpit.com/service/jobs/82118'
    expect(verdict({ target, status: 410 })).toBe('gone')
    expect(verdict({ target, status: 200, body: '{"job":{"id":"82118","title":"Trainee","status":"Closed"}}' })).toBe('gone')
    expect(verdict({ target, status: 200, body: '{"job":{"id":"82118","title":"Trainee","status":"Published"}}' })).toBe('live')
  })

  it('learns nothing from a server error, a block or a refusal', () => {
    for (const status of [500, 503, 403, 429, 401]) expect(verdict({ target: 'https://x.example/job/12345', status })).toBe('unknown')
  })

  it('finds the job in a link by its UUID or its longest run of digits', () => {
    expect(jobToken('https://jobs.lever.co/meesho/7D9AF9B5-C1C7-48EC-BBB5-9B25E49F6596')).toBe('7d9af9b5-c1c7-48ec-bbb5-9b25e49f6596')
    expect(jobToken('https://internshala.com/internship/detail/java-at-acme1790682829')).toBe('1790682829')
    expect(jobToken('https://example.com/careers/engineer')).toBeNull()
    expect(dropsJob('https://example.com/careers/engineer', '/careers')).toBe(false)
  })
})

describe('checkLinks', () => {
  const allowAll = async () => true
  const replies = {
    'https://job-boards.greenhouse.io/acme/jobs/1000001': { status: 302, location: '/acme?error=true' },
    'https://jobs.lever.co/acme/00000000-0000-4000-8000-000000000000': { status: 404 },
    'https://internshala.com/internship/detail/java-at-acme1790682829': { status: 200, body: fixture('internshala-open.html') },
    'https://internshala.com/internship/detail/busy-at-acme1790682830': { status: 503 },
  }
  const http = async (url) => {
    const reply = replies[url] ?? { status: 500 }
    return { status: reply.status, headers: new Headers(reply.location ? { location: reply.location } : {}), text: async () => reply.body ?? '' }
  }
  const rows = [
    { id: 'gh', source: 'greenhouse:acme', url: 'https://job-boards.greenhouse.io/acme/jobs/1000001' },
    { id: 'lever', source: 'lever:acme', url: 'https://jobs.lever.co/acme/00000000-0000-4000-8000-000000000000' },
    { id: 'open', source: 'internshala', url: 'https://internshala.com/internship/detail/java-at-acme1790682829' },
    { id: 'busy', source: 'internshala', url: 'https://internshala.com/internship/detail/busy-at-acme1790682830' },
    { id: 'li', source: 'linkedin', url: 'https://www.linkedin.com/jobs/view/4301234567' },
  ]

  it('sorts the postings it can check into gone and live, and leaves the rest alone', async () => {
    const out = await checkLinks(rows, { http, allowed: allowAll })
    expect(out.gone.sort()).toEqual(['gh', 'lever'])
    expect(out.live).toEqual(['open'])
    expect(out.checked).toBe(4)
  })

  it('spends no budget on a link robots.txt disallows, and stops at the budget', async () => {
    const noInternshala = async (url) => !url.includes('internshala.com')
    const out = await checkLinks(rows, { http, allowed: noInternshala, budget: 1 })
    expect(out.checked).toBe(1)
    expect(out.gone).toHaveLength(1)
  })
})

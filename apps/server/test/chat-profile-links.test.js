import { describe, it, expect } from 'vitest'
import { validateProfileProposal, applyProfileOps } from '@jobdekho/server/chat/profile-proposal.js'
import { profileView } from '@jobdekho/server/chat/profile-view.js'
import { PROFILE_RULES } from '@jobdekho/server/chat/prompt-proposal-rules.js'

const CODE = { kind: 'code', url: 'https://github.com/demo/tracker', label: '' }
const LIVE = { kind: 'live', url: 'https://tracker.vercel.app', label: '' }
const entry = (id, title, over = {}) => ({
  id, order: 0, title, organisation: '', location: '', startDate: '2025', endDate: '',
  bullets: ['Shipped the portal'], tech: ['react'], links: [], link: '', pinned: false, weight: 0, ...over,
})
const RECORD = {
  basics: { name: 'Demo Candidate', headline: '', email: '', phone: '', location: 'Pune', links: { github: '', linkedin: '', portfolio: '' }, moreLinks: [] },
  experience: [], projects: [entry('p1', 'Job tracker', { links: [CODE, LIVE], link: CODE.url })],
  education: [], certifications: [], achievements: [], skillGroups: [],
  skills: ['react'], titles: [], locations: [], years: 1, degree: 'bachelors',
}
const propose = (...ops) => validateProfileProposal({ ops }, RECORD)

describe('a profile proposal with links', () => {
  it('adds an entry with its links cleaned, and shows each link on the card', () => {
    const { ops, diff } = propose({
      op: 'add', section: 'projects', position: 'first',
      entry: { title: 'CLI tool', links: [{ url: 'github.com/demo/cli' }, { kind: 'video', url: 'https://youtu.be/abc', label: 'Demo video' }, { url: 'javascript:alert(1)' }, 'https://cli.pages.dev'] },
    })
    expect(ops[0].entry.links).toEqual([
      { kind: 'code', url: 'https://github.com/demo/cli', label: '' },
      { kind: 'video', url: 'https://youtu.be/abc', label: 'Demo video' },
      { kind: 'live', url: 'https://cli.pages.dev', label: '' },
    ])
    expect(diff).toEqual([{
      label: 'Projects: add', before: '',
      after: 'CLI tool\nCode: https://github.com/demo/cli\nDemo video: https://youtu.be/abc\nLive: https://cli.pages.dev',
    }])
  })

  it('replaces an entry\'s whole list on update, showing the list before and after', () => {
    const { ops, diff } = propose({ op: 'update', section: 'projects', id: 'p1', fields: { links: [CODE, { kind: 'figma', url: 'https://figma.com/file/x', label: '' }] } })
    expect(ops[0].before).toEqual({ links: [CODE, LIVE] })
    expect(diff).toEqual([{
      label: 'Projects: Job tracker, links',
      before: 'Code: https://github.com/demo/tracker\nLive: https://tracker.vercel.app',
      after: 'Code: https://github.com/demo/tracker\nFigma: https://figma.com/file/x',
    }])
    const { profile } = applyProfileOps(ops, RECORD)
    expect(profile.projects[0].links.map((l) => l.kind)).toEqual(['code', 'figma'])
    expect(profile.projects[0].link).toBe(CODE.url)
  })

  it('reads a reply still writing the single link as the first link, leaving the rest', () => {
    const { ops, diff } = propose({ op: 'update', section: 'projects', id: 'p1', fields: { link: 'gitlab.com/demo/tracker' } })
    expect(diff).toEqual([{ label: 'Projects: Job tracker, link', before: CODE.url, after: 'https://gitlab.com/demo/tracker' }])
    const { profile } = applyProfileOps(ops, RECORD)
    expect(profile.projects[0].links.map((l) => l.url)).toEqual(['https://gitlab.com/demo/tracker', LIVE.url])
  })

  it('takes the list when a reply sends both, and refuses links that are not a list', () => {
    const { ops } = propose({ op: 'update', section: 'projects', id: 'p1', fields: { links: [LIVE], link: 'https://x.dev' } })
    expect(ops[0].fields).toEqual({ links: [LIVE] })
    expect(propose({ op: 'update', section: 'projects', id: 'p1', fields: { links: 'https://x.dev' } })).toBeNull()
  })

  it('sets the basics\' more links as a whole list under their own label', () => {
    const { ops, diff } = propose({ op: 'set', field: 'moreLinks', value: [{ url: 'kaggle.com/demo' }, { url: 'https://leetcode.com/u/demo', label: 'LeetCode' }] })
    expect(diff).toEqual([{ label: 'More links', before: '', after: 'Kaggle: https://kaggle.com/demo\nLeetCode: https://leetcode.com/u/demo' }])
    const { profile } = applyProfileOps(ops, RECORD)
    expect(profile.basics.moreLinks).toHaveLength(2)
    expect(applyProfileOps(ops, { ...RECORD, basics: { ...RECORD.basics, moreLinks: [LIVE] } }).conflict).toMatch(/^Your moreLinks changed/)
    expect(propose({ op: 'set', field: 'moreLinks', value: 'kaggle.com/demo' })).toBeNull()
  })
})

describe('what the chat is shown and told', () => {
  it('shows an entry\'s links as the list, never the old single field', () => {
    const view = profileView(RECORD)
    expect(view.projects[0].links).toEqual([CODE, LIVE])
    expect(view.projects[0]).not.toHaveProperty('link')
  })

  it('tells the model to propose links as a list, and the basics\' other profiles as moreLinks', () => {
    expect(PROFILE_RULES).toContain('links (a list of {"kind":K,"url":"https://...","label":"..."}')
    expect(PROFILE_RULES).toContain('bullets, tech and links replace the whole list')
    expect(PROFILE_RULES).toContain('moreLinks')
  })
})

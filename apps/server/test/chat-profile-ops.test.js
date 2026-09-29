import { describe, it, expect } from 'vitest'
import { validateProfileProposal, applyProfileOps } from '@jobdekho/server/chat/profile-proposal.js'
import { cleanOp } from '@jobdekho/server/chat/profile-ops-clean.js'

const entry = (id, title, over = {}) => ({
  id, order: 0, title, organisation: 'Acme', location: 'Pune', startDate: 'Jul 2023', endDate: 'Present',
  bullets: ['Shipped the portal'], tech: ['react'], link: '', pinned: false, weight: 0, ...over,
})
const RECORD = {
  basics: { name: 'Jane Doe', headline: '', email: 'jane@example.com', phone: '', location: 'Pune', links: { github: '', linkedin: '', portfolio: '' } },
  experience: [entry('e1', 'Engineer')], projects: [entry('p1', 'Job tracker', { organisation: '', startDate: '2025', endDate: '' })],
  education: [], certifications: [], achievements: [],
  skillGroups: [{ id: 'g1', order: 0, name: 'Languages', items: ['JavaScript'] }],
  skills: ['react', 'node'], titles: ['frontend developer'], locations: ['pune'], years: 2, degree: 'bachelors',
}
const propose = (...ops) => validateProfileProposal({ ops }, RECORD)

describe('validateProfileProposal: adding', () => {
  it('adds an entry with no id of the model\'s, and describes it the way the card reads', () => {
    const result = propose({ op: 'add', section: 'projects', position: 'first', entry: { id: 'e1', title: 'CLI tool', startDate: 2024, tech: ['Go'], bullets: ['Built a CLI for log search'] } })
    expect(result.ops).toEqual([{ op: 'add', section: 'projects', position: 'first', entry: { title: 'CLI tool', startDate: '2024', tech: ['Go'], bullets: ['Built a CLI for log search'] } }])
    expect(result.diff).toEqual([{ label: 'Projects: add', before: '', after: 'CLI tool (2024): Go\n- Built a CLI for log search' }])
  })

  it('clamps and cleans what it keeps, and drops unknown fields', () => {
    const { ops } = propose({ op: 'add', section: 'projects', entry: { title: `  A\n${'x'.repeat(500)}`, bullets: Array.from({ length: 20 }, (_, i) => `b${i}`), secret: 'x', tech: 'not a list' } })
    const added = ops[0].entry
    expect(added.title).toHaveLength(200)
    expect(added.title.startsWith('A x')).toBe(true)
    expect(added.bullets).toHaveLength(12)
    expect(added).not.toHaveProperty('secret')
    expect(added).not.toHaveProperty('tech')
    expect(ops[0].position).toBe('last')
  })

  it('drops an entry with neither a title nor an organisation, and unknown sections and ops', () => {
    expect(propose({ op: 'add', section: 'projects', entry: { bullets: ['x'] } })).toBeNull()
    expect(propose({ op: 'add', section: 'hobbies', entry: { title: 'Chess' } })).toBeNull()
    expect(propose({ op: 'constructor', section: 'projects' }, { op: 'drop table' })).toBeNull()
    expect(cleanOp({ op: 'toString' })).toBeNull()
  })
})

describe('validateProfileProposal: changing and removing', () => {
  it('updates only the fields given, one diff line per field that really changed', () => {
    const { ops, diff } = propose({ op: 'update', section: 'experience', id: 'e1', fields: { title: 'Software Engineer', location: 'Pune', bullets: ['Shipped the portal', 'Led the migration'] } })
    expect(ops[0]).toMatchObject({ op: 'update', id: 'e1', title: 'Engineer', before: { title: 'Engineer', location: 'Pune', bullets: ['Shipped the portal'] } })
    expect(diff).toEqual([
      { label: 'Experience: Engineer, title', before: 'Engineer', after: 'Software Engineer' },
      { label: 'Experience: Engineer, bullets', before: '- Shipped the portal', after: '- Shipped the portal\n- Led the migration' },
    ])
  })

  it('drops an op naming an id the record does not have, or changing nothing', () => {
    expect(propose({ op: 'update', section: 'experience', id: 'nope', fields: { title: 'X' } })).toBeNull()
    expect(propose({ op: 'update', section: 'projects', id: 'e1', fields: { title: 'X' } })).toBeNull()
    expect(propose({ op: 'update', section: 'experience', id: 'e1', fields: { title: 'Engineer' } })).toBeNull()
    expect(propose({ op: 'remove', section: 'experience', id: 'ghost' })).toBeNull()
  })

  it('removes an entry, showing what goes', () => {
    expect(propose({ op: 'remove', section: 'projects', id: 'p1' }).diff).toEqual([
      { label: 'Projects: remove', before: 'Job tracker (2025): react\n- Shipped the portal', after: '' },
    ])
  })

  it('reads ops in order, so a later op sees what an earlier one did', () => {
    const result = propose({ op: 'remove', section: 'projects', id: 'p1' }, { op: 'update', section: 'projects', id: 'p1', fields: { title: 'X' } })
    expect(result.ops.map((op) => op.op)).toEqual(['remove'])
  })
})

describe('validateProfileProposal: set and skill groups', () => {
  it('sets lists as the store will hold them, and drops a set that changes nothing', () => {
    expect(propose({ op: 'set', field: 'skills', value: ['React', 'Node', 'Go'] }).diff).toEqual([{ label: 'Skills', before: 'react, node', after: 'react, node, go' }])
    expect(propose({ op: 'set', field: 'skills', value: ['REACT', 'node'] })).toBeNull()
  })

  it('sets basics, merges links, and refuses values of the wrong kind', () => {
    const { diff } = propose(
      { op: 'set', field: 'headline', value: 'Backend engineer' },
      { op: 'set', field: 'links', value: { github: 'github.com/jane', evil: 'x' } },
      { op: 'set', field: 'years', value: '3' },
      { op: 'set', field: 'degree', value: 'phd' },
    )
    expect(diff).toEqual([
      { label: 'Headline', before: '', after: 'Backend engineer' },
      { label: 'GitHub link', before: '', after: 'github.com/jane' },
      { label: 'Years of experience', before: '2', after: '3' },
      { label: 'Highest degree', before: 'bachelors', after: 'phd' },
    ])
    for (const bad of [{ field: 'years', value: -3 }, { field: 'years', value: 'many' }, { field: 'degree', value: 'diploma' }, { field: 'resumeText', value: 'x' }, { field: 'links', value: 'x' }]) {
      expect(propose({ op: 'set', ...bad })).toBeNull()
    }
  })

  it('adds, renames, refills and removes skill groups by id', () => {
    const { diff } = propose(
      { op: 'addGroup', name: 'Tools', items: ['Git', 'Docker'] },
      { op: 'renameGroup', id: 'g1', name: 'Programming languages' },
      { op: 'setGroupItems', id: 'g1', items: ['JavaScript', 'Go'] },
    )
    expect(diff).toEqual([
      { label: 'Skill groups: add', before: '', after: 'Tools: Git, Docker' },
      { label: 'Skill groups: rename', before: 'Languages', after: 'Programming languages' },
      { label: 'Skill group Programming languages', before: 'JavaScript', after: 'JavaScript, Go' },
    ])
    expect(propose({ op: 'removeGroup', id: 'g1' }).diff[0]).toEqual({ label: 'Skill groups: remove', before: 'Languages: JavaScript', after: '' })
    expect(propose({ op: 'removeGroup', id: 'g9' })).toBeNull()
  })

  it('keeps at most twenty ops', () => {
    const ops = Array.from({ length: 30 }, (_, i) => ({ op: 'add', section: 'achievements', entry: { title: `Prize ${i}` } }))
    expect(propose(...ops).ops).toHaveLength(20)
  })
})

describe('applyProfileOps', () => {
  it('applies the stored ops to the record as it is now, giving a new entry its own id', () => {
    const { ops } = propose({ op: 'add', section: 'projects', position: 'first', entry: { title: 'CLI tool', tech: ['Go'] } })
    const { profile, conflict } = applyProfileOps(ops, RECORD)
    expect(conflict).toBeUndefined()
    expect(profile.projects.map((p) => p.title)).toEqual(['CLI tool', 'Job tracker'])
    expect(profile.projects[0].id).toEqual(expect.any(String))
    expect(profile.projects[0].id).not.toBe('p1')
    expect(profile.projects.map((p) => p.order)).toEqual([0, 1])
    expect(profile).not.toHaveProperty('resumeText')
    expect(profile).not.toHaveProperty('resumeName')
  })

  it('stops, and says why, when an entry the change edits is gone', () => {
    const { ops } = propose({ op: 'update', section: 'projects', id: 'p1', fields: { title: 'Tracker' } })
    const { conflict } = applyProfileOps(ops, { ...RECORD, projects: [] })
    expect(conflict).toBe('The project "Job tracker" this change edits is no longer in your profile. Nothing was applied; ask again for a fresh change.')
  })

  it('stops rather than undo an edit made after the proposal', () => {
    const { ops } = propose({ op: 'set', field: 'skills', value: ['react', 'node', 'go'] })
    const { conflict } = applyProfileOps(ops, { ...RECORD, skills: ['react', 'node', 'python'] })
    expect(conflict).toMatch(/^Your skills changed after this was proposed/)
    const renamed = propose({ op: 'setGroupItems', id: 'g1', items: ['Go'] }).ops
    expect(applyProfileOps(renamed, { ...RECORD, skillGroups: [{ id: 'g1', name: 'Languages', items: ['Rust'] }] }).conflict).toMatch(/^The skill group "Languages" changed/)
  })

  it('applies a whole change or none of it', () => {
    const { ops } = propose({ op: 'add', section: 'projects', entry: { title: 'A' } }, { op: 'remove', section: 'experience', id: 'e1' })
    expect(applyProfileOps(ops, { ...RECORD, experience: [] })).toEqual({ conflict: expect.stringMatching(/no longer in your profile/) })
  })
})

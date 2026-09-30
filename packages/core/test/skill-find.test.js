import { describe, it, expect } from 'vitest'
import { findSkills, canonicalSkill, skillLabel, spellingsOf } from '@jobdekho/core/skill-find.js'

const ids = (text) => findSkills(text).map((h) => h.id)

describe('findSkills', () => {
  // The misses that sank the old exact matcher on real postings.
  it('reads every spelling of a skill as one skill', () => {
    expect(ids('PostgreSQL and Postgres')).toEqual(['postgres', 'postgres'])
    expect(ids('ReactJS or React.js')).toEqual(['react', 'react'])
    expect(ids('NodeJS, Node.js')).toEqual(['node', 'node'])
    expect(ids('AI/ML engineer')).toEqual(['machine learning'])
  })

  it('reads the longer name first, so a skill is never read inside another', () => {
    expect(ids('React Native')).toEqual(['react native'])
    expect(ids('Java Script')).toEqual(['javascript'])
    expect(ids('JavaScript and Java')).toEqual(['javascript', 'java'])
  })

  // "JS" is its own spelling, but the "js" in "Node.js" is already Node.
  it('reads JS as JavaScript except inside a longer name', () => {
    expect(ids('JS/TS')).toEqual(['javascript', 'typescript'])
    expect(ids('Node.js')).toEqual(['node'])
  })

  it('leaves everyday words alone', () => {
    expect(ids('go to market fast and excel in a team')).toEqual([])
    expect(ids('Excel in a fast-paced team')).toEqual([])
    expect(ids('spring internship, rest of the week, R&D budget')).toEqual([])
    expect(ids('Kubernetes node pools')).toEqual(['kubernetes'])
  })

  it('reads the same words where a tech list writes them', () => {
    expect(ids('Go, Python, R and SAS')).toEqual(['python', 'sas', 'go', 'r'])
    expect(ids('Java, Python and Go.')).toEqual(['java', 'python', 'go'])
    expect(ids('Senior Go Developer')).toEqual(['go'])
    expect(ids('and go to market')).toEqual([])
    expect(ids('Spring Boot and REST')).toEqual(['spring', 'rest api'])
    expect(ids('MS Excel, Advanced Excel')).toEqual(['excel', 'excel'])
  })

  it('finds skills whose names carry symbols', () => {
    expect(ids('C++, C#, ASP.NET')).toEqual(['cpp', 'csharp', 'dotnet'])
    expect(ids('CI/CD pipelines')).toEqual(['ci/cd'])
  })

  // Two tools are never one skill, however close: Tableau is not Power BI.
  it('keeps close tools apart', () => {
    expect(ids('Tableau or Power BI')).toEqual(['tableau', 'power bi'])
  })

  // "DL" is a driving licence in many Indian ads.
  it('never reads a spelling-only alias out of a posting', () => {
    expect(ids('Must have a valid DL')).toEqual([])
  })

  it('gives each hit its offset in the text', () => {
    expect(findSkills('We use Python')).toEqual([{ id: 'python', index: 7 }])
  })
})

describe('canonicalSkill', () => {
  it('maps what a person typed to the table id', () => {
    expect(canonicalSkill('ReactJS')).toBe('react')
    expect(canonicalSkill('golang')).toBe('go')
    expect(canonicalSkill('Postgres')).toBe('postgres')
    expect(canonicalSkill('ML')).toBe('machine learning')
    expect(canonicalSkill('node')).toBe('node')
  })

  it('is null for a skill the table does not know', () => {
    expect(canonicalSkill('fortran 77')).toBeNull()
    expect(canonicalSkill('c')).toBeNull()
  })
})

describe('skillLabel', () => {
  it('prints the name a person reads, and anything else as it is', () => {
    expect(skillLabel('postgres')).toBe('PostgreSQL')
    expect(skillLabel('fortran 77')).toBe('fortran 77')
  })
})

// The resume check reads these: a spelling shows the skill, a variant shows
// what it is a variant of, and a skill it only implies does not.
describe('spellingsOf', () => {
  it('lists the term, its plural and its other spellings', () => {
    expect(spellingsOf('rest api')).toContain('rest apis')
    expect(spellingsOf('react')).toEqual(expect.arrayContaining(['react', 'reacts', 'reactjs', 'react.js']))
  })

  it('counts a variant as showing what it is a variant of', () => {
    expect(spellingsOf('sql')).toEqual(expect.arrayContaining(['mysql', 'postgresql', 'mssql', 'sqlite']))
  })

  it('does not count a skill that only implies it', () => {
    expect(spellingsOf('python')).not.toContain('django')
    expect(spellingsOf('javascript')).not.toContain('typescript')
  })

  it('keeps an unknown term as itself and its plural', () => {
    expect(spellingsOf('api')).toEqual(['api', 'apis'])
  })
})

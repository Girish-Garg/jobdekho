import { describe, it, expect } from 'vitest'
import { postingFeatures, featuresOf, FEATURES_VERSION } from '@jobdekho/core/posting-features.js'

describe('postingFeatures', () => {
  it('records each skill at the best place it was named', () => {
    const f = postingFeatures({
      title: 'React Developer',
      description: 'Requirements: - React and TypeScript. - Bonus points for GraphQL. You will: - Build APIs in Node.js.',
      tags: ['Docker'],
    })
    expect(f.skills).toEqual({ react: 'title', typescript: 'req', graphql: 'nice', node: 'resp', docker: 'tags' })
    expect(f.v).toBe(FEATURES_VERSION)
  })

  // About-us, benefits and EEO copy say nothing about the role.
  it('never reads skills out of company copy', () => {
    const f = postingFeatures({ title: 'Engineer', description: 'About us: We love Kubernetes. Requirements: - Python.' })
    expect(f.skills).toEqual({ python: 'req' })
  })

  // "MongoDB Atlas" in a MongoDB ad is the product, not a requirement.
  it('blanks the company naming itself', () => {
    const f = postingFeatures({ title: 'Engineer', company: 'MongoDB', description: 'Requirements: - Build MongoDB Atlas in Go, and more.' })
    expect(f.skills).toEqual({ go: 'req' })
  })

  it('reads the years asked from the requirement lines', () => {
    const f = postingFeatures({ title: 'Senior Engineer', description: 'Requirements: - 3+ years of experience.' })
    expect(f).toMatchObject({ band: [3, 7], from: 'years', titleLevel: 'senior' })
  })

  it('works on a posting with no text at all', () => {
    const f = postingFeatures({ title: 'Full Stack Developer', tags: ['React.js', 'Node.js'] })
    expect(f.skills).toEqual({ react: 'tags', node: 'tags' })
    expect(f.band).toBeNull()
  })
})

describe('featuresOf', () => {
  it('uses the features a row already carries', () => {
    const stored = { v: FEATURES_VERSION, skills: { go: 'title' }, band: null, from: null, titleLevel: null }
    expect(featuresOf({ title: 'React Developer', features: stored })).toBe(stored)
  })

  // Rows stored before features existed, or under an older version, are
  // read now from the text they kept.
  it('reads features for a row without them, or with an old version', () => {
    expect(featuresOf({ title: 'React Developer' }).skills).toEqual({ react: 'title' })
    expect(featuresOf({ title: 'React Developer', features: { v: 0, skills: {} } }).skills).toEqual({ react: 'title' })
    expect(featuresOf({ title: 'Dev', descriptionText: 'Requirements: - Python.' }).skills).toEqual({ python: 'req' })
    expect(featuresOf({ title: 'Dev', descriptionSnippet: 'Requirements: - Python.' }).skills).toEqual({ python: 'req' })
  })
})

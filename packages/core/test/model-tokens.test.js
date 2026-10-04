import { describe, it, expect } from 'vitest'
import { words, content, pairs, units } from '@jobdekho/core/model/tokens.js'
import { levelFeatures, titleWords, textWords, hiddenUnit } from '@jobdekho/core/model/level-features.js'
import { lineFeatures } from '@jobdekho/core/model/section-features.js'

// The shipped weights were learned on exactly these outputs: a change here
// means training the models again, so these cases pin them.
describe('model tokens', () => {
  it('reads words the way training did', () => {
    expect(words('Senior C++ / C# dev, L2, 5+ years, 2026 batch, node.js')).toEqual(['senior', 'c++', 'c#', 'dev', 'l2', 'years', 'batch', 'node', 'js'])
    expect(content('You will mentor the junior engineers')).toEqual(['mentor', 'junior', 'engineers'])
    expect(pairs(['mentor', 'junior', 'engineers'])).toEqual(['mentor junior', 'junior engineers'])
  })

  it('cuts a description into sentences and bullets, knowing which were bullets', () => {
    expect(units('We build APIs. You will ship weekly.\n- Go and Kafka\nKey Responsibilities • PID tuning • Setup 1. Write tests 2) Review code')).toEqual([
      { text: 'We build APIs.', bullet: false },
      { text: 'You will ship weekly.', bullet: false },
      { text: 'Go and Kafka', bullet: true },
      { text: 'Key Responsibilities', bullet: false },
      { text: 'PID tuning', bullet: true },
      { text: 'Setup', bullet: true },
      { text: 'Write tests', bullet: true },
      { text: 'Review code', bullet: true },
    ])
    expect(units('')).toEqual([])
  })
})

describe('level features', () => {
  it('hides the title words the step 1 rules read', () => {
    expect(titleWords('Senior Software Engineer II')).toEqual(['software', 'engineer'])
    expect(titleWords('Intern_2027_SW')).toEqual(['sw'])
    expect(titleWords('Lead Data Architect, VP')).toEqual(['data'])
  })

  it('hides every sentence that states years or names an internship', () => {
    expect(hiddenUnit('You have 5+ years of Python')).toBe(true)
    expect(hiddenUnit('Experience: 3 to 5 years')).toBe(true)
    expect(hiddenUnit('This is a 6-month internship')).toBe(true)
    expect(hiddenUnit('Strong internship or project work')).toBe(true)
    expect(hiddenUnit('You will mentor engineers')).toBe(false)
  })

  it('reads title, company and description, each block scaled to unit length', () => {
    const features = levelFeatures({ title: 'Senior Data Engineer', company: 'Acme Pvt Ltd', description: 'You will mentor engineers. You need 5+ years of Go.' })
    expect([...features.keys()].sort()).toEqual(['c:acme', 'd:engineers', 'd:mentor', 'd:mentor engineers', 't:data', 't:data engineer', 't:engineer'])
    expect(features.get('t:data')).toBeCloseTo(1 / Math.sqrt(3))
    expect(features.get('d:mentor')).toBeCloseTo(1 / Math.sqrt(3))
    expect(features.get('c:acme')).toBe(1)
  })

  it('marks a title or a text with nothing left to read', () => {
    const features = levelFeatures({ title: 'Senior Lead', company: 'Acme', description: '' })
    expect(features.get('t:#none')).toBe(1)
    expect(features.get('d:#none')).toBe(1)
    expect(textWords('One two three 2026')).toBe(3)
  })
})

describe('section features', () => {
  it('reads a line, its shape, its place and its neighbours', () => {
    const lines = ['We are hiring.', '- Build APIs in Go', 'Benefits include insurance']
    const features = lineFeatures(lines, 1)
    expect([...features.keys()].sort()).toEqual([
      'f:build', 'len:xs', 'list', 'n:benefits', 'n:include', 'n:insurance', 'p:hiring', 'pos:3',
      'w:apis', 'w:apis go', 'w:build', 'w:build apis', 'w:go',
    ])
    expect(lineFeatures(lines, 0).get('p:#edge')).toBe(0.3)
  })
})

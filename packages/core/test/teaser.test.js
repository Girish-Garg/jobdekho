import { describe, it, expect } from 'vitest'
import { isTeaser, teasingBoard } from '@jobdekho/core/teaser.js'

const TEASER = 'As a React Native Development intern at Krazio Cloud, you will have the exciting opportunity t'

describe('isTeaser', () => {
  it("knows an Internshala card's first line from its page's description", () => {
    expect(isTeaser({ source: 'internshala', descriptionText: TEASER })).toBe(true)
    expect(isTeaser({ source: 'internshala', descriptionText: '' })).toBe(true)
    expect(isTeaser({ source: 'internshala', descriptionText: 'About the internship\n\nBuild apps.' })).toBe(false)
    expect(isTeaser({ source: 'internshala', descriptionText: 'About the job\n\nShip it.' })).toBe(false)
    expect(isTeaser({ source: 'internshala', descriptionText: 'x'.repeat(250) })).toBe(false)
  })

  // Short text from any other board is all that posting says.
  it('reads short text from any other board as the description', () => {
    expect(isTeaser({ source: 'adzuna:in', descriptionText: TEASER })).toBe(false)
    expect(isTeaser({ source: 'linkedin', descriptionText: '' })).toBe(false)
    expect(isTeaser(null)).toBe(false)
    expect(teasingBoard('internshala')).toBe(true)
    expect(teasingBoard('lever:acme')).toBe(false)
  })
})

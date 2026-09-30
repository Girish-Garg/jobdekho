import { describe, it, expect } from 'vitest'
import { experienceFit, askedPhrase } from '@jobdekho/core/experience-fit.js'

const asked = (band, from = 'years', titleLevel = null) => ({ band, from, titleLevel })

describe('experienceFit', () => {
  it('is full inside the band', () => {
    expect(experienceFit(asked([1, 4]), 2)).toEqual({ value: 1, why: 'suits your experience' })
  })

  // A two year person cannot get a five year job.
  it('costs more the further short of the floor', () => {
    expect(experienceFit(asked([3, 5]), 2).value).toBe(0.75)
    expect(experienceFit(asked([4, 8]), 2).value).toBe(0.5)
    expect(experienceFit(asked([5, 9]), 2)).toEqual({ value: 0.3, why: 'asks at least 5 years, you have 2 years' })
  })

  // ...while a five year person can take a two year one, if they want it.
  it('costs less for being over the ceiling', () => {
    expect(experienceFit(asked([0, 2]), 3).value).toBe(1)
    expect(experienceFit(asked([0, 2]), 5).value).toBe(0.7)
    expect(experienceFit(asked([0, 2]), 9).value).toBe(0.55)
  })

  it('holds a staff or executive title back below six years, whatever it asks', () => {
    expect(experienceFit(asked([4, 8], 'years', 'staff'), 3)).toEqual({ value: 0.2, why: 'a staff-level role, you have 3 years' })
    expect(experienceFit(asked([7, 15], 'title', 'staff'), 8).value).toBe(1)
  })

  it('names the title level when that is all the ad said', () => {
    expect(experienceFit(asked([4, 8], 'title', 'senior'), 2).why).toBe('a senior role, you have 2 years')
  })

  it('treats an unstated ask as a small unknown', () => {
    expect(experienceFit(asked(null, null), 2).value).toBe(0.85)
  })

  // A resume that never said how long is not a reason to rank anything down.
  it('is neutral when the person gave no years', () => {
    expect(experienceFit(asked([8, 12]), null)).toEqual({ value: 1, why: null })
  })
})

describe('askedPhrase', () => {
  it('reads a floor, a range, an exact count and a title level', () => {
    expect(askedPhrase(asked([5, 9]))).toBe('at least 5 years')
    expect(askedPhrase(asked([3, 5]))).toBe('3 to 5 years')
    expect(askedPhrase(asked([1, 1]))).toBe('1 year')
    expect(askedPhrase(asked([0, 2], 'title', 'entry'))).toBe('an entry-level role')
    expect(askedPhrase(asked(null, null))).toBeNull()
  })
})

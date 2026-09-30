import { describe, it, expect } from 'vitest'
import { placeFit, wantedPlaces } from '@jobdekho/core/place-fit.js'

const want = wantedPlaces(['pune', 'bangalore', 'remote'])
const fit = (location, workMode = 'onsite', w = want) => placeFit(location, workMode, w)

describe('wantedPlaces', () => {
  it('reads cities, remote, and places the list does not know', () => {
    const w = wantedPlaces(['Pune', 'bangalore', 'Remote', 'London'])
    expect([...w.cities]).toEqual(['pune', 'bengaluru'])
    expect(w.remote).toBe(true)
    expect(w.words).toEqual(['london'])
    expect(w.any).toBe(true)
  })

  it('wants nothing in particular when the profile names no place', () => {
    expect(wantedPlaces([]).any).toBe(false)
  })
})

describe('placeFit', () => {
  it('is full for a city the person wants, however it is spelled', () => {
    expect(fit('Bengaluru, Karnataka, India')).toEqual({ value: 1, why: 'in Bengaluru' })
    expect(fit('Hybrid in Bangalore, India', 'hybrid').value).toBe(1)
  })

  // A new city is a move, not a wall.
  it('costs something, not everything, for another Indian city', () => {
    expect(fit('Chennai, TN, India')).toEqual({ value: 0.6, why: 'in Chennai, not a place you listed' })
  })

  it('counts a commutable city in the same metro nearly in full', () => {
    const w = wantedPlaces(['mumbai'])
    expect(fit('Thane', 'onsite', w).value).toBe(0.9)
  })

  it('accepts remote work that is open to India', () => {
    expect(fit('Remote, Global', 'remote').value).toBe(1)
    expect(fit('Remote - NA, APAC, EMEA', 'remote').value).toBe(1)
    expect(fit('Work from home', 'remote').value).toBe(1)
  })

  // The same rule location.js applies to its filter: a remote role locked
  // to another country is not remote for someone in India.
  it('treats remote locked to another region as nearly closed', () => {
    expect(fit('Remote, United States', 'remote')).toEqual({ value: 0.2, why: 'remote, but only for another region' })
  })

  it('costs remote a little for a person who did not ask for it', () => {
    expect(fit('Remote', 'remote', wantedPlaces(['pune'])).value).toBe(0.85)
  })

  it('takes the best of several places', () => {
    expect(fit('Bangalore, India; Remote, Canada').value).toBe(1)
  })

  it('costs most for a job abroad', () => {
    expect(fit('San Francisco, CA')).toEqual({ value: 0.15, why: 'outside India' })
  })

  it('reads a bare country as a city not named', () => {
    expect(fit('India').value).toBe(0.8)
  })

  it('reads an unstated place as a small unknown', () => {
    expect(fit('')).toEqual({ value: 0.8, why: 'place not stated' })
    expect(fit('', 'remote').value).toBe(1)
  })

  it('matches a place the list does not know as the person typed it', () => {
    expect(fit('London, UK', 'onsite', wantedPlaces(['london'])).value).toBe(1)
  })

  // With no preference there is nothing to hold a posting back for.
  it('is neutral and silent when the profile names no place', () => {
    expect(fit('San Francisco, CA', 'onsite', wantedPlaces([]))).toEqual({ value: 1, why: null })
  })
})

import { describe, it, expect } from 'vitest'
import { citiesIn, canonicalCity, cityName, metroOf, inIndia } from '@jobdekho/core/india-places.js'

describe('citiesIn', () => {
  // Boards spell the same city both ways, and the fit must read them as one.
  it('reads every spelling of a city as its one canonical name', () => {
    expect(citiesIn('Bangalore, India')).toEqual(['bengaluru'])
    expect(citiesIn('Bengaluru, Karnataka, India')).toEqual(['bengaluru'])
    expect(citiesIn('Gurgaon, Haryana')).toEqual(['gurugram'])
    expect(citiesIn('Greater Bengaluru Area')).toEqual(['bengaluru'])
  })

  it('lists each city a location names, once, in order', () => {
    expect(citiesIn('Delhi,Gurgaon,Noida')).toEqual(['delhi', 'gurugram', 'noida'])
    expect(citiesIn('Bangalore,Mumbai; Bangalore')).toEqual(['bengaluru', 'mumbai'])
  })

  // "Navi Mumbai" is its own city: read as "Mumbai" it would pass for the
  // city itself rather than the one next to it.
  it('prefers the longer name where one city name holds another', () => {
    expect(citiesIn('Navi Mumbai, Maharashtra')).toEqual(['navi mumbai'])
    expect(citiesIn('New Delhi')).toEqual(['delhi'])
  })

  it('reads the Pune board spellings as Pune', () => {
    expect(citiesIn('Pune City, Maharashtra, India')).toEqual(['pune'])
    expect(citiesIn('Pune Division, Maharashtra, India')).toEqual(['pune'])
  })

  it('finds nothing where no city is named', () => {
    expect(citiesIn('Remote, Global')).toEqual([])
    expect(citiesIn('')).toEqual([])
    expect(citiesIn(null)).toEqual([])
  })
})

describe('canonicalCity', () => {
  it('turns one typed place into its canonical id', () => {
    expect(canonicalCity('bangalore')).toBe('bengaluru')
    expect(canonicalCity(' Gurgaon ')).toBe('gurugram')
    expect(canonicalCity('bombay')).toBe('mumbai')
  })

  it('is null for a place the list does not know', () => {
    expect(canonicalCity('london')).toBeNull()
    expect(canonicalCity('remote')).toBeNull()
  })
})

describe('city names and metros', () => {
  it('gives the display name the scraper can normalise to', () => {
    expect(cityName('bengaluru')).toBe('Bengaluru')
    expect(cityName('gurugram')).toBe('Gurugram')
    expect(cityName('nowhere')).toBeNull()
  })

  // A job in the next city over is not a move.
  it('groups commutable cities under one metro', () => {
    expect(metroOf('thane')).toBe('mumbai')
    expect(metroOf('gurugram')).toBe('delhi')
    expect(metroOf('pune')).toBe('pune')
  })
})

describe('inIndia', () => {
  it('knows a city, a state or the country itself', () => {
    expect(inIndia('Hyderabad')).toBe(true)
    expect(inIndia('Karnataka')).toBe(true)
    expect(inIndia('India')).toBe(true)
  })

  it('knows a place abroad is not in India', () => {
    expect(inIndia('San Francisco, CA')).toBe(false)
    expect(inIndia('London, United Kingdom')).toBe(false)
  })
})

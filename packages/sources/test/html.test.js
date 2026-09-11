import { describe, it, expect } from 'vitest'
import { stripHtml } from '@jobdekho/sources/html.js'

describe('stripHtml', () => {
  it('removes ordinary tags and decodes what is left', () => {
    expect(stripHtml('<p>Hello <b>world</b></p>').replace(/\s+/g, ' ').trim()).toBe('Hello world')
    expect(stripHtml('R&amp;D team')).toBe('R&D team')
    expect(stripHtml('a&nbsp;b')).toBe('a b')
  })

  // Greenhouse escapes its HTML on every posting, and Ashby, Lever, Workable
  // and Internshala on some. Stripping real tags found nothing, and the entity
  // pass then removed only the angle brackets, so the tag names survived as
  // words: 47% of stored bodies carried "/p div class=" mixed into their own
  // prose.
  it('removes tags that arrived escaped', () => {
    const body = '&lt;p&gt;&lt;strong&gt;Team:&lt;/strong&gt; Product&lt;br&gt;Bangalore&lt;/p&gt;'
    expect(stripHtml(body).replace(/\s+/g, ' ').trim()).toBe('Team: Product Bangalore')
  })

  it('removes an escaped tag carrying attributes', () => {
    const body = '&lt;div class="bb-jobs-posting-header" style="font-weight: 400"&gt;Job Title&lt;/div&gt;'
    expect(stripHtml(body).replace(/\s+/g, ' ').trim()).toBe('Job Title')
  })

  // The fixture above uses a literal quote, and it passed while every real
  // body with an attribute still leaked "div class= content-intro": Greenhouse
  // escapes the attribute quotes along with the brackets. This one is copied
  // from a live HackerRank posting, which is the shape that actually arrives.
  it('removes an escaped tag whose attribute quotes are escaped too', () => {
    const body = '&lt;div class=&quot;content-intro&quot;&gt;&lt;p&gt;HackerRank helps companies&lt;/p&gt;&lt;/div&gt;'
    expect(stripHtml(body).replace(/\s+/g, ' ').trim()).toBe('HackerRank helps companies')
  })

  it('removes an escaped tag whose attribute holds an escaped ampersand', () => {
    const body = '&lt;a href=&quot;/jobs?team=1&amp;role=2&quot;&gt;Apply&lt;/a&gt;'
    expect(stripHtml(body).replace(/\s+/g, ' ').trim()).toBe('Apply')
  })

  // Decoding &lt; back into "<" would have been the obvious fix, and it would
  // have let the next pass eat everything from a literal less-than up to the
  // following ">". Escaped tags are removed whole so that cannot happen.
  it('does not eat prose after a literal less-than', () => {
    expect(stripHtml('salary &lt; 10 LPA and experience &gt; 5 years'))
      .toContain('10 LPA and experience')
  })

  it('leaves text that merely mentions a tag name alone', () => {
    expect(stripHtml('experience with div and span layout')).toBe('experience with div and span layout')
  })

  it('survives an empty or missing body', () => {
    expect(stripHtml('')).toBe('')
    expect(stripHtml(null)).toBe('')
    expect(stripHtml(undefined)).toBe('')
  })
})

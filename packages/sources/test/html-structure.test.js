import { describe, it, expect } from 'vitest'
import { stripHtml } from '@jobdekho/sources/html.js'

// stripHtml once turned every tag into a space, so not one of the 2612 stored
// bodies carried a line break and the pane showed each as one wall of text.
describe('stripHtml keeps the structure its tags described', () => {
  it('turns paragraphs into blocks separated by a blank line', () => {
    expect(stripHtml('<p>One.</p><p>Two.</p>')).toBe('One.\n\nTwo.')
  })

  it('turns list items into lines starting with "- "', () => {
    expect(stripHtml('<p>Duties:</p><ul><li>Build</li><li>Ship</li></ul><p>After.</p>'))
      .toBe('Duties:\n\n- Build\n- Ship\n\nAfter.')
  })

  it('puts a blank line on both sides of a heading', () => {
    expect(stripHtml('Intro<h3>About the role</h3>Body')).toBe('Intro\n\nAbout the role\n\nBody')
  })

  it('turns br into a line break inside a block', () => {
    expect(stripHtml('<p>Line one<br>Line two<br/>Line three</p>')).toBe('Line one\nLine two\nLine three')
  })

  it('treats section, article, div and tr as breaks too', () => {
    const out = stripHtml('<section>A</section><article>B</article><div>C</div><table><tr><td>D</td></tr><tr><td>E</td></tr></table>')
    expect(out.split('\n').filter(Boolean)).toEqual(['A', 'B', 'C', 'D', 'E'])
  })

  // How Greenhouse writes nearly every list item.
  it('joins a bullet to the paragraph wrapped inside its list item', () => {
    expect(stripHtml('<ul><li><p>First</p></li><li><p>Second</p></li></ul>')).toBe('- First\n- Second')
  })

  it('leaves nothing behind for an empty list item', () => {
    expect(stripHtml('<ul><li></li><li>Real</li><li> </li></ul>')).toBe('- Real')
  })

  it('does the same for tags that arrived escaped', () => {
    const body = '&lt;h4&gt;&lt;strong&gt;What you&amp;#39;ll do&lt;/strong&gt;&lt;/h4&gt;&lt;ul&gt;&lt;li&gt;Close deals&lt;/li&gt;&lt;li&gt;Grow L&amp;amp;D&lt;/li&gt;&lt;/ul&gt;'
    expect(stripHtml(body)).toBe("What you'll do\n\n- Close deals\n- Grow L&D")
  })

  it('collapses runs of spaces but never a line break, and keeps at most one blank line', () => {
    expect(stripHtml('<p>a   \t b</p><p></p><p></p><div></div><p>c</p>')).toBe('a b\n\nc')
  })

  // Pretty-printed HTML puts newlines between tags and inside long lines; a
  // browser ignores them, so they must not become structure here either.
  it('ignores newlines that are only the layout of the HTML source', () => {
    expect(stripHtml('<p>A long\nwrapped sentence.</p>\n<ul>\n  <li>x</li>\n</ul>')).toBe('A long wrapped sentence.\n\n- x')
  })

  // A board that sends plain text has no tags to say where a paragraph ends:
  // its own newlines are the only structure it has.
  it('keeps the newlines of a body that has no tags at all', () => {
    expect(stripHtml('About us\n\nWe build.\r\nWe ship.')).toBe('About us\n\nWe build.\nWe ship.')
  })

  it('drops the space an inline tag leaves before punctuation, but not before .NET', () => {
    expect(stripHtml('Extreme <b>Ownership</b>.')).toBe('Extreme Ownership.')
    expect(stripHtml('<p>Experience in .NET and C#</p>')).toBe('Experience in .NET and C#')
  })

  it('keeps apostrophes and quotes that arrive as entities inside the word', () => {
    expect(stripHtml('PhonePe&#39;s &quot;Pincode&quot; app, we&rsquo;re hiring')).toBe('PhonePe\'s "Pincode" app, we\'re hiring')
  })

  it('never decodes a less-than or greater-than back into a bracket', () => {
    const out = stripHtml('salary &#60; 10 LPA and &#x3e; 5 years &lt; 3')
    expect(out).not.toMatch(/[<>]/)
    expect(out).toContain('10 LPA and')
  })
})

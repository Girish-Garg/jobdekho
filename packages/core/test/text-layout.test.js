import { describe, it, expect } from 'vitest'
import { tidyLines, oneLine, clipText } from '@jobdekho/core/text-layout.js'

describe('tidyLines', () => {
  it('collapses spaces within a line, never across one, and keeps one blank line at most', () => {
    expect(tidyLines(' a \t b \r\n\r\n\r\n\n c  d \n')).toBe('a b\n\nc d')
  })
  it('survives a missing body', () => {
    expect(tidyLines(null)).toBe('')
  })
})

describe('oneLine', () => {
  it('flattens every break into a space', () => {
    expect(oneLine('a\n\n- b\n- c ')).toBe('a - b - c')
  })
})

describe('clipText', () => {
  it('leaves a body inside the budget alone', () => {
    expect(clipText('About\n\n- a\n- b', 20)).toBe('About\n\n- a\n- b')
  })

  // The budget was set on flat text; layout must not spend it, or the scorer
  // reads fewer words than it used to.
  it('does not spend the budget on line breaks and list markers', () => {
    const body = Array.from({ length: 50 }, (_, i) => `- item${i}`).join('\n')
    const flat = oneLine(body.replace(/^- /gm, ''))
    const clipped = clipText(body, 100)
    expect(oneLine(clipped.replace(/^- /gm, ''))).toBe(flat.slice(0, 100).trimEnd())
    expect(clipped.length).toBeGreaterThan(100)
  })
})

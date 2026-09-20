import { describe, it, expect } from 'vitest'
import { escapeLatex, escapeLine, texLink } from '@jobdekho/server/resume/escape.js'

describe('escapeLatex', () => {
  it('escapes every LaTeX special character', () => {
    expect(escapeLatex('\\')).toBe('\\textbackslash{}')
    expect(escapeLatex('{')).toBe('\\{')
    expect(escapeLatex('}')).toBe('\\}')
    expect(escapeLatex('$')).toBe('\\$')
    expect(escapeLatex('&')).toBe('\\&')
    expect(escapeLatex('#')).toBe('\\#')
    expect(escapeLatex('^')).toBe('\\textasciicircum{}')
    expect(escapeLatex('_')).toBe('\\_')
    expect(escapeLatex('~')).toBe('\\textasciitilde{}')
    expect(escapeLatex('%')).toBe('\\%')
  })

  // The security boundary the module header promises: a single pass over the
  // original string, so a backslash escaped into "\textbackslash{}" never has
  // its own braces picked up and escaped a second time.
  it('renders an attempted command injection as inert literal text', () => {
    const out = escapeLatex('100% \\newcommand{\\x}{pwned}')
    expect(out).toBe('100\\% \\textbackslash{}newcommand\\{\\textbackslash{}x\\}\\{pwned\\}')
  })

  it('strips control characters but keeps newlines and tabs', () => {
    expect(escapeLatex('a\x00b\x1fc\nd\te')).toBe('abc\nd\te')
  })

  it('coerces null and undefined to an empty string', () => {
    expect(escapeLatex(null)).toBe('')
    expect(escapeLatex(undefined)).toBe('')
  })

  it('leaves ordinary text untouched', () => {
    expect(escapeLatex('Backend Engineer at Acme Corp')).toBe('Backend Engineer at Acme Corp')
  })
})

describe('escapeLine', () => {
  it('collapses newlines and repeated whitespace to single spaces', () => {
    expect(escapeLine('Line one\n\nLine   two\ttwo')).toBe('Line one Line two two')
  })

  it('trims leading and trailing whitespace after escaping', () => {
    expect(escapeLine('  padded  ')).toBe('padded')
  })
})

describe('texLink', () => {
  it('wraps a plain https URL in a live, ATS-visible href', () => {
    expect(texLink('https://github.com/example')).toBe('\\href{https://github.com/example}{https://github.com/example}')
  })

  it('falls back to plain escaped text for anything that is not a clean URL', () => {
    expect(texLink('not a url')).toBe('not a url')
    expect(texLink('javascript:alert(1)')).toBe('javascript:alert(1)')
  })

  // The one argument \href parses outside the normal escaper's rules (see
  // escape.js): a value carrying a brace or a backslash must never reach it.
  it('never treats a value with LaTeX-special characters as a link target', () => {
    const evil = 'https://example.com/}{\\input{/etc/passwd'
    const out = texLink(evil)
    expect(out).not.toContain('\\href')
    expect(out).not.toContain('\\input')
  })

  it('returns an empty string for an empty value', () => {
    expect(texLink('')).toBe('')
  })
})

import { describe, it, expect } from 'vitest'
import { texToText } from '@jobdekho/server/documents/tex-text.js'
import { documentFactFlags } from '@jobdekho/server/documents/fact-flags.js'
import { renderTex } from '@jobdekho/server/resume/render.js'
import { listTemplates } from '@jobdekho/server/resume/templates/registry.js'
import { PROFILE_SHAPES } from '@jobdekho/server/resume/check-shapes.js'

const profile = PROFILE_SHAPES['everything filled']

describe('texToText', () => {
  it('keeps the words a reader sees, one line per line of the page, and drops the preamble', () => {
    const tex = '\\documentclass{article}\\usepackage[margin=1in]{geometry}\\begin{document}\n'
      + '\\resEntryHeader{Engineer}{Acme \\& Co | Pune}{Jul 2023 - Present}\n\\begin{resItems}\n  \\item Cut costs 40\\% in R\\&D.\n\\end{resItems}\n'
      + '\\vspace{-6pt}\\\\[4pt]\\textbf{Stack:} Node % a comment with 99 in it\n\\href{https://x.dev}{x.dev}\\end{document}'
    expect(texToText(tex)).toBe('Engineer\nAcme & Co | Pune\nJul 2023 - Present\n- Cut costs 40% in R&D.\nStack: Node\nx.dev')
  })

  it('reads a whole source without a document environment as body', () => {
    expect(texToText('Plain \\emph{words} here')).toBe('Plain words here')
  })
})

describe('documentFactFlags', () => {
  // A first draft is the profile itself, so it must raise nothing, for
  // every template and every shape a profile takes.
  it('raises nothing for a document made from the profile', () => {
    for (const { id } of listTemplates()) {
      for (const shape of Object.values(PROFILE_SHAPES)) {
        expect(documentFactFlags({ tex: renderTex(id, shape, {}), profile: shape })).toEqual([])
      }
    }
  })

  it('raises nothing for a change that only moves the layout, as fitting one page does', () => {
    const tex = renderTex('compact', profile, {})
    const tighter = tex.replace('margin=0.55in', 'margin=0.4in').replace('\\vspace{4pt}', '\\vspace{1pt}').replace('\\resEntrySpace', '')
    expect(documentFactFlags({ tex: tighter, profile, currentTex: tex })).toEqual([])
  })

  it('flags invented figures, names, titles and technologies', () => {
    const tex = renderTex('compact', profile, {})
    const embellished = tex
      .replace('used by 40,000 people a month', 'used by 75,000 people a month, cutting latency 35\\% with Kubernetes at Google Cloud India')
      .replace('Software Engineer', 'Senior Software Engineer')
    expect(documentFactFlags({ tex: embellished, profile, currentTex: tex })).toEqual([
      '75,000', '35%', 'kubernetes', 'Senior Software Engineer', 'Google Cloud India',
    ])
  })

  it('counts what the document already says as known, and a date moved a year as new', () => {
    const current = '\\begin{document}Led the Payments Guild at Acme since 2021.\\end{document}'
    expect(documentFactFlags({ tex: current, profile: null, currentTex: current })).toEqual([])
    expect(documentFactFlags({ tex: current.replace('2021', '2020'), profile: null, currentTex: current })).toEqual(['2020'])
  })
})

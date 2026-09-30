import { describe, it, expect } from 'vitest'
import { applyEdits, MAX_EDITS } from '@jobdekho/server/chat/document-edits.js'
import { renderTex } from '@jobdekho/server/resume/render.js'
import { PROFILE_SHAPES } from '@jobdekho/server/resume/check-shapes.js'

// A real resume source, from the classic template, with two jobs so that
// the lines every entry shares (\begin{resItems}, \end{resItems}) repeat
// the way they do in anyone's resume.
const base = PROFILE_SHAPES['everything filled']
const intern = {
  ...base.experience[0], id: 'e2', title: 'Engineering Intern', organisation: 'Acme Labs',
  startDate: 'Jan 2023', endDate: 'Jun 2023', bullets: ['Wrote the billing export in Python.', 'Cut the nightly job from 40 to 12 minutes.'],
}
const TEX = renderTex('classic', { ...base, experience: [base.experience[0], intern] }, {})
const NAME = 'Classic resume'
const BULLET = '  \\item Built the onboarding portal in React, used by 40,000 people a month.\n'

describe('applyEdits on a real resume', () => {
  it('changes only the text each edit names, leaving every other line as it was', () => {
    const edit = { find: '\\resEntryHeader{Software Engineer}{Startup Co | Pune}{Jul 2023 - Present}', replace: '\\resEntryHeader{Senior Software Engineer}{Startup Co | Pune}{Jul 2023 - Present}' }
    const { tex } = applyEdits(TEX, [edit], NAME)
    expect(tex).toBe(TEX.replace(edit.find, edit.replace))
    expect(tex.split('\n').length).toBe(TEX.split('\n').length)
  })

  it('matches every edit against the source as it is, whatever order they come in', () => {
    const edits = [
      { find: '\\usepackage[margin=0.75in]{geometry}', replace: '\\usepackage[margin=0.6in]{geometry}' },
      { find: '  \\item Cut the nightly job from 40 to 12 minutes.\n', replace: '' },
      { find: BULLET, replace: `${BULLET}  \\item Led the move to TypeScript.\n` },
    ]
    const forward = applyEdits(TEX, edits, NAME).tex
    expect(applyEdits(TEX, [...edits].reverse(), NAME).tex).toBe(forward)
    expect(forward).toContain('margin=0.6in')
    expect(forward).toContain('\\item Led the move to TypeScript.')
    expect(forward).not.toContain('nightly job')
    expect(forward).toContain('\\item Wrote the billing export in Python.')
  })

  it('refuses text that is not in the source, quoting it and naming the document', () => {
    const retyped = { find: '\\item Built the onboarding portal in React used by 40,000 people a month.', replace: 'x' }
    const { refused } = applyEdits(TEX, [retyped], NAME)
    expect(refused).toBe('The change could not be made: the text it replaces ("\\item Built the onboarding portal in React used by 40,000...") is not in "Classic resume" as it is now. Ask again, and the change will start from the current text.')
  })

  it('refuses text that appears more than once, saying how often, rather than guessing which', () => {
    const { refused } = applyEdits(TEX, [{ find: '\\begin{resItems}', replace: '\\begin{resItems}\\small' }], NAME)
    expect(refused).toContain('("\\begin{resItems}") appears 2 times in "Classic resume"')
    expect(refused).toContain('cannot tell which one was meant')
  })

  it('refuses the whole change when any one edit does not fit, and when two edits overlap', () => {
    const good = { find: '\\usepackage{charter}', replace: '\\usepackage{lmodern}' }
    expect(applyEdits(TEX, [good, { find: 'Worked at Google', replace: 'x' }], NAME).tex).toBeUndefined()
    const overlapping = [
      { find: '\\resSection{Experience}\n\\resEntryHeader{Software Engineer}', replace: 'a' },
      { find: '\\resEntryHeader{Software Engineer}{Startup Co | Pune}', replace: 'b' },
    ]
    expect(applyEdits(TEX, overlapping, NAME).refused).toContain('two of its edits change the same text')
  })

  it('matches a source saved with Windows line breaks', () => {
    const { tex } = applyEdits(TEX.replace(/\n/g, '\r\n'), [{ find: BULLET, replace: '' }], NAME)
    expect(tex).toBe(TEX.replace(BULLET, ''))
  })

  it('refuses an edit with nothing to find or nothing to put in its place, and more edits than one change needs', () => {
    expect(applyEdits(TEX, [{ find: '  \n ', replace: 'x' }], NAME).refused).toContain('did not say which text to replace')
    expect(applyEdits(TEX, [{ find: '\\usepackage{charter}' }], NAME).refused).toContain('did not say which text to replace')
    const many = Array.from({ length: MAX_EDITS + 1 }, () => ({ find: '\\usepackage{charter}', replace: 'x' }))
    expect(applyEdits(TEX, many, NAME).refused).toContain(`more than ${MAX_EDITS} separate edits`)
  })
})

import { describe, it, expect } from 'vitest'
import { topicsOf, isSensitive } from '@jobdekho/server/memory/topics.js'
import { memoriesForCheck, memoriesForChat } from '@jobdekho/server/memory/picker.js'

const item = (text, scope = 'everywhere', id = text.slice(0, 8)) => ({ id, text, scope })

// The owner's own memory, the one the check used to ignore.
const SALARY_CHECK = item('When I ask if a job is real, also check salary for both intern and full-time roles', 'jobs')

describe('topicsOf', () => {
  it('reads what a line is about from its words and phrases', () => {
    expect([...topicsOf(SALARY_CHECK.text)].sort()).toEqual(['check', 'experience', 'pay'])
    expect(topicsOf('Is this real or a scam?')).toEqual(new Set(['check']))
    expect(topicsOf('Only remote roles in Bengaluru or Pune')).toEqual(new Set(['place']))
    expect(topicsOf('Keep my resume to one page')).toEqual(new Set(['resume']))
  })

  // "real" alone is everywhere ("real-time"), so it is not a check.
  it('does not take a passing word for a topic', () => {
    expect(topicsOf('I build real-time systems')).toEqual(new Set())
    expect(topicsOf('Check my resume')).toEqual(new Set(['resume']))
    expect(topicsOf('the constructor of this class')).toEqual(new Set())
  })

  it('knows a sensitive line', () => {
    expect(isSensitive('I am on an H1B visa')).toBe(true)
    expect(isSensitive('Only remote roles')).toBe(false)
  })
})

describe('memoriesForCheck', () => {
  const items = [
    SALARY_CHECK,
    item('I am on an H1B visa, check sponsorship', 'jobs'),
    item('Only remote roles', 'jobs'),
    item('Never put my current salary on my resume', 'resume'),
    item('Keep answers short'),
    item('Tell me about the company funding too'),
  ]

  // The one call that searches the web gets only what is about checking a
  // job, never a sensitive line or one kept for documents.
  it('gives the web-searching check only what is about checking a job', () => {
    expect(memoriesForCheck(items).map((m) => m.text)).toEqual([SALARY_CHECK.text, 'Tell me about the company funding too'])
  })

  it('gives nothing when nothing fits', () => {
    expect(memoriesForCheck([item('Keep answers short')])).toEqual([])
    expect(memoriesForCheck()).toEqual([])
  })
})

describe('memoriesForChat', () => {
  const items = [item('Keep answers short'), item('Only remote roles', 'jobs'), item('Keep my resume to one page', 'resume'), item('Sign my letters with my full name', 'letters')]
  const texts = (picked) => picked.map((m) => m.text)

  it('gives a page its own and the everywhere ones', () => {
    expect(texts(memoriesForChat(items, { page: 'postings', message: 'Which of these suit me?' }))).toEqual(['Keep answers short', 'Only remote roles'])
    expect(texts(memoriesForChat(items, { page: 'resume', message: 'Fix the dates' }))).toEqual(['Keep answers short', 'Keep my resume to one page', 'Sign my letters with my full name'])
    expect(texts(memoriesForChat(items, { page: 'settings', message: 'How do I install LaTeX?' }))).toEqual(['Keep answers short'])
  })

  // A letter asked for on the feed brings the letter preference along.
  it('adds any other the question touches', () => {
    expect(texts(memoriesForChat(items, { page: 'postings', message: 'Write a cover letter for this job' }))).toContain('Sign my letters with my full name')
  })
})

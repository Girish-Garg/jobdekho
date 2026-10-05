import { describe, it, expect } from 'vitest'
import { validateActions } from '@jobdekho/server/chat/actions.js'
import { parseChatReply } from '@jobdekho/server/chat/parse.js'

describe('validateActions', () => {
  it('drops anything that is not an array of actions', () => {
    expect(validateActions(undefined)).toEqual([])
    expect(validateActions('nope')).toEqual([])
  })

  // A small local model can write the patch as a bare word: no patch, not
  // a failed answer.
  it('drops a filters action whose patch is not an object', () => {
    for (const patch of ['remote', 5, true]) expect(validateActions([{ type: 'filters', patch }])).toEqual([])
  })

  it('accepts a filters action naming only known keys, labelled from the cleaned patch', () => {
    const [action] = validateActions([{ type: 'filters', patch: { levels: ['mid'], minFit: '55' } }])
    expect(action).toEqual({ type: 'filters', patch: { levels: ['mid'], minFit: '55' }, label: 'Show mid level, grade A' })
  })

  // The Fit filter is graded now, so the floors are the grade bounds and the
  // label names the letter; the old "Good fit" floor of 44 is not one.
  it('takes each grade floor and names it by its letter', () => {
    const label = (minFit) => validateActions([{ type: 'filters', patch: { minFit } }])[0]?.label
    expect(label('40')).toBe('Show grade B or better')
    expect(label('25')).toBe('Show grade C or better')
    expect(label('12')).toBe('Show grade D or better')
    expect(label('44')).toBeUndefined()
    // The floors before these; the chat never offers them again.
    expect(label('62')).toBeUndefined()
  })

  it('takes the slider steps for pay and experience, and says fresher for 0', () => {
    const [pay] = validateActions([{ type: 'filters', patch: { minStipend: 35000 } }])
    expect(pay.label).toBe('Show Rs 35,000+/mo')
    const [fresher] = validateActions([{ type: 'filters', patch: { maxExp: '0' } }])
    expect(fresher.label).toBe('Show fresher roles')
    const [seven] = validateActions([{ type: 'filters', patch: { maxExp: 7 } }])
    expect(seven.label).toBe('Show up to 7 years experience')
    expect(validateActions([{ type: 'filters', patch: { minStipend: '12345' } }])).toEqual([])
  })

  // "Show me only Razorpay and Swiggy" is the company filter, by name; the
  // feed matches each name by its key, so the spelling need not be exact.
  it('takes the companies to show only, and the empty list as every company', () => {
    const [only] = validateActions([{ type: 'filters', patch: { companies: [' Razorpay ', 'Swiggy', 3, ''] } }])
    expect(only).toEqual({ type: 'filters', patch: { companies: ['Razorpay', 'Swiggy'] }, label: 'Show only Razorpay, Swiggy' })
    const [every] = validateActions([{ type: 'filters', patch: { companies: [] } }])
    expect(every.label).toBe('Show every company')
  })

  it('drops a key that is not one of EMPTY_FILTERS\' own', () => {
    const [action] = validateActions([{ type: 'filters', patch: { levels: ['mid'], notAKey: 'x' } }])
    expect(action.patch).toEqual({ levels: ['mid'] })
  })

  it('drops a bad level from the array rather than the whole action', () => {
    const [action] = validateActions([{ type: 'filters', patch: { levels: ['mid', 'wizard'] } }])
    expect(action.patch.levels).toEqual(['mid'])
  })

  it('drops a bad work mode the same way', () => {
    const [action] = validateActions([{ type: 'filters', patch: { workModes: ['remote', 'moon-base'] } }])
    expect(action.patch.workModes).toEqual(['remote'])
  })

  it('drops the whole filters action when nothing in the patch survives', () => {
    expect(validateActions([{ type: 'filters', patch: { notAKey: 'x', levels: ['wizard'] } }])).toEqual([])
  })

  it('accepts a numeric floor sent as a number, not only as a string', () => {
    const [action] = validateActions([{ type: 'filters', patch: { minFit: 55 } }])
    expect(action.patch.minFit).toBe('55')
  })

  it('drops a floor that is not one of the known ones', () => {
    expect(validateActions([{ type: 'filters', patch: { minFit: '73' } }])).toEqual([])
  })

  it('accepts a sort action only when it names one of the five sorts', () => {
    expect(validateActions([{ type: 'sort', value: 'newest' }])).toEqual([{ type: 'sort', value: 'newest', label: 'Sort by newest first' }])
    expect(validateActions([{ type: 'sort', value: 'random' }])).toEqual([])
  })

  it('drops an action of a type this release does not offer', () => {
    expect(validateActions([{ type: 'open-posting', id: 'p1' }])).toEqual([])
  })

  it('keeps only the first few actions when the model offers a pile of them', () => {
    const raw = Array.from({ length: 6 }, () => ({ type: 'sort', value: 'newest' }))
    expect(validateActions(raw)).toHaveLength(3)
  })

  it('lets a boolean and an explicit "clear" value through as real patches', () => {
    const [action] = validateActions([{ type: 'filters', patch: { includeStale: true, minFit: '' } }])
    expect(action.patch).toEqual({ includeStale: true, minFit: '' })
    expect(action.label).toBe('Show any fit, include stale postings')
  })
})

// "Block xyz" is a button that blocks exactly the companies its label names.
describe('validateActions: block', () => {
  it('takes the companies to block, trimmed, and names each in its label', () => {
    expect(validateActions([{ type: 'block', companies: [' Acme Foundation '] }])).toEqual([
      { type: 'block', companies: ['Acme Foundation'], label: 'Block Acme Foundation' },
    ])
    expect(validateActions([{ type: 'block', companies: ['Acme', 'Beta'] }])[0].label).toBe('Block Acme and Beta')
    expect(validateActions([{ type: 'block', companies: ['Acme', 'Beta', 'Gamma'] }])[0].label).toBe('Block Acme, Beta and Gamma')
  })

  // Two spellings of one company are one block, and a name with nothing to
  // know a company by blocks nothing, so the label never names either.
  it('drops what is not a name, and counts a company once however it is spelled', () => {
    const [action] = validateActions([{ type: 'block', companies: ['PHONEPE LIMITED', 'PhonePe', 7, '', '  ', '...', null, 'Acme'] }])
    expect(action).toEqual({ type: 'block', companies: ['PHONEPE LIMITED', 'Acme'], label: 'Block PHONEPE LIMITED and Acme' })
  })

  // A company no posting carries yet still blocks by its key.
  it('keeps a company the feed has never shown', () => {
    expect(validateActions([{ type: 'block', companies: ['Nowhere Yet Pvt Ltd'] }])[0].companies).toEqual(['Nowhere Yet Pvt Ltd'])
  })

  it('blocks at most ten in one go', () => {
    const names = Array.from({ length: 14 }, (_, i) => `Company ${String.fromCharCode(65 + i)}`)
    const [action] = validateActions([{ type: 'block', companies: names }])
    expect(action.companies).toEqual(names.slice(0, 10))
  })

  it('offers nothing when no company survives', () => {
    expect(validateActions([{ type: 'block', companies: [] }])).toEqual([])
    expect(validateActions([{ type: 'block', companies: 'Acme' }])).toEqual([])
    expect(validateActions([{ type: 'block' }])).toEqual([])
  })

  // The block action belongs to the feed, as filters and sorts do.
  it('is dropped from an answer on any other page', () => {
    const raw = JSON.stringify({ reply: 'Done.', actions: [{ type: 'block', companies: ['Acme'] }] })
    expect(parseChatReply(raw, { page: 'postings' }).actions).toHaveLength(1)
    expect(parseChatReply(raw, { page: 'resume' }).actions).toEqual([])
  })
})

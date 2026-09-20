import { describe, it, expect } from 'vitest'
import { validateActions } from '@jobdekho/server/chat/actions.js'

describe('validateActions', () => {
  it('drops anything that is not an array of actions', () => {
    expect(validateActions(undefined)).toEqual([])
    expect(validateActions('nope')).toEqual([])
  })

  it('accepts a filters action naming only known keys, labelled from the cleaned patch', () => {
    const [action] = validateActions([{ type: 'filters', patch: { levels: ['mid'], minFit: '62' } }])
    expect(action).toEqual({ type: 'filters', patch: { levels: ['mid'], minFit: '62' }, label: 'Show mid level, fit 62 and up' })
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
    const [action] = validateActions([{ type: 'filters', patch: { minFit: 62 } }])
    expect(action.patch.minFit).toBe('62')
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

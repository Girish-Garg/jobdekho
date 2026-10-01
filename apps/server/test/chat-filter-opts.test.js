import { describe, it, expect } from 'vitest'
import { toListOpts } from '@jobdekho/server/chat/filter-opts.js'

// A question about "what is on screen" reads the feed the screen shows, the
// picked companies included.
describe('toListOpts', () => {
  it('carries the picked companies, by name, and drops what is not one', () => {
    expect(toListOpts({ companies: ['Razorpay', ' Acme, Inc. ', '', 7] }, 'match', null).companies).toEqual(['Razorpay', 'Acme, Inc.'])
    expect(toListOpts({ companies: [] }, 'match', null).companies).toBeUndefined()
    expect(toListOpts({}, 'match', null).companies).toBeUndefined()
  })
})

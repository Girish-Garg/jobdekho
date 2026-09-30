import { readFileSync } from 'node:fs'
import { profileValues } from '../apply/profile-values.js'
import { phoneFor } from '../apply/phone-format.js'

// The copy panel: everything Apply assist would have filled, for the person
// to paste into a form in their own browser. It is the way through whenever
// the Apply browser cannot be (a site blocking automated browsers, a
// "Continue with Google" sign-in, no Chrome or Edge on this computer), so it
// needs no session and no browser at all.
const ROWS = [
  ['fullName', 'Full name'], ['firstName', 'First name'], ['lastName', 'Last name'],
  ['email', 'Email'], ['phone', 'Phone'], ['city', 'City'], ['country', 'Country'],
  ['linkedin', 'LinkedIn'], ['github', 'GitHub'], ['portfolio', 'Portfolio'],
  ['company', 'Current company'], ['title', 'Current title'], ['years', 'Years of experience'],
  ['school', 'College or university'], ['degree', 'Degree'], ['discipline', 'Discipline'], ['gradYear', 'Graduation year'],
]

export function copyRows(values) {
  return ROWS.map(([key, label]) => ({ label, value: key === 'phone' ? phoneFor(values.phone) : values[key] ?? '' }))
    .filter((row) => row.value)
}

export function copyRoutes(app, registry) {
  const auth = { preHandler: app.requireAuth }

  app.get('/api/apply/copy/:postingId', auth, async (request) => {
    const userId = request.user.sub
    const values = profileValues(await app.dashboard.getProfile(userId))
    const saved = await app.dashboard.getAiResult?.(userId, request.params.postingId, 'cover-letter')
    return { rows: copyRows(values), coverLetter: saved?.result?.letter ?? '' }
  })

  // The files an open application prepared, to download and attach by hand.
  app.get('/api/apply/sessions/:id/files/:kind', auth, async (request, reply) => {
    const s = registry.get(request.params.id)
    const file = s && ['resume', 'cover'].includes(request.params.kind) ? (await s.files)?.[request.params.kind] : null
    if (!file) return reply.code(404).send({ error: 'That file is not there.' })
    reply.type('application/pdf')
    reply.header('content-disposition', `attachment; filename="${file.name.replace(/"/g, '')}"`)
    return readFileSync(file.path)
  })
}

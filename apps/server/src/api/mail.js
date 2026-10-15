import { mailView, connectMail, disconnectMail } from '../mail/account.js'

// The length caps only stop a pasted page from being taken for an address
// or a password; Fastify's own message for one names the field, never what
// was in it.
const connectSchema = {
  body: {
    type: 'object',
    required: ['address', 'password'],
    properties: { address: { type: 'string', maxLength: 254 }, password: { type: 'string', maxLength: 64 } },
  },
}

// The Gmail card in Settings (see the web's GmailCard.jsx). GET says which
// address is connected, where its app password is kept and how many mails
// went out in the last day; PUT checks a pair against Gmail and keeps it;
// DELETE forgets both. Only PUT's body ever carries the password, and
// Fastify's request log records the method and URL alone, so no log line
// holds it either.
export async function mailRoutes(app) {
  const auth = { preHandler: app.requireAuth }
  const deps = () => app.mail()

  app.get('/api/mail', auth, async (request) => mailView(deps().store, request.user.sub))

  app.put('/api/mail', { ...auth, schema: connectSchema }, async (request, reply) => {
    const { store, secrets, make } = deps()
    const result = await connectMail({ store, userId: request.user.sub, input: request.body, secrets, make })
    if (result.error) return reply.code(400).send({ error: result.error })
    return result.view
  })

  app.delete('/api/mail', auth, async (request) => {
    const { store, secrets } = deps()
    return disconnectMail({ store, userId: request.user.sub, secrets })
  })
}

import { applyProposal, discardProposal } from '../chat/apply-proposal.js'
import { editMailDraft } from '../chat/mail-edit.js'
import { compileTex } from '../resume/compile.js'

const mailEditSchema = {
  body: {
    type: 'object',
    properties: {
      to: { type: 'string', maxLength: 254 },
      subject: { type: 'string', maxLength: 400 },
      body: { type: 'string', maxLength: 12000 },
      attach: { type: 'string', maxLength: 80 },
    },
  },
}

// The Apply and Discard buttons on a chat proposal card (see chat/
// proposals.js), and Send on a mail's (see mail/send-draft.js). The body is
// ignored on purpose: what gets applied or sent is the proposal the server
// validated and saved with the turn, found by its id in whichever chat
// offered it, with only the person's own edits to a mail (PATCH .../mail).
// Tests decorate `chatStore`, `documentStore`, the dashboard and the mail
// seams with fakes before ready() (see chat/deps.js and mail/deps.js), and
// `resumeCompile` so an attachment needs no real pdflatex.
export async function chatProposalRoutes(app) {
  const auth = { preHandler: app.requireAuth }
  const compile = app.hasDecorator('resumeCompile') ? app.resumeCompile : compileTex
  const target = (request) => {
    const { store, documents } = app.chats()
    return { chat: store, documents, dashboard: app.dashboard, mail: app.mail, compile, userId: request.user.sub, proposalId: request.params.id }
  }

  app.post('/api/chat/proposals/:id/apply', auth, async (request, reply) => {
    const { status, body } = await applyProposal(target(request))
    return reply.code(status).send(body)
  })

  app.post('/api/chat/proposals/:id/discard', auth, async (request, reply) => {
    const { status, body } = await discardProposal(target(request))
    return status === 204 ? reply.code(204).send() : reply.code(status).send(body)
  })

  app.patch('/api/chat/proposals/:id/mail', { ...auth, schema: mailEditSchema }, async (request, reply) => {
    const { status, body } = await editMailDraft({ ...target(request), input: request.body ?? {} })
    return reply.code(status).send(body)
  })
}

import { applyProposal, discardProposal } from '../chat/apply-proposal.js'

// The Apply and Discard buttons on a chat proposal card (see chat/
// proposals.js). The body is ignored on purpose: what gets applied is the
// proposal the server validated and saved with the turn, found by its id
// in whichever chat offered it. Tests decorate `chatStore`,
// `documentStore` and the dashboard with fakes before ready() (see
// chat/deps.js).
export async function chatProposalRoutes(app) {
  const auth = { preHandler: app.requireAuth }
  const target = (request) => {
    const { store, documents } = app.chats()
    return { chat: store, documents, dashboard: app.dashboard, userId: request.user.sub, proposalId: request.params.id }
  }

  app.post('/api/chat/proposals/:id/apply', auth, async (request, reply) => {
    const { status, body } = await applyProposal(target(request))
    return reply.code(status).send(body)
  })

  app.post('/api/chat/proposals/:id/discard', auth, async (request, reply) => {
    const { status, body } = await discardProposal(target(request))
    return status === 204 ? reply.code(204).send() : reply.code(status).send(body)
  })
}

import { madeByAi } from '../chat/made-by-ai.js'

// GET /api/chat/made-by-ai { items }: everything the AI made for the
// person, across every chat (see chat/made-by-ai.js), for the Resume page's
// "Made by AI". Its own route because clearing or deleting a chat removes
// none of what is listed.
export async function madeByAiRoutes(app) {
  app.get('/api/chat/made-by-ai', { preHandler: app.requireAuth }, async (request) => {
    const { store, documents } = app.chats()
    return { items: await madeByAi({ store, documents, userId: request.user.sub }) }
  })
}

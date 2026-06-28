export async function postingsRoutes(app) {
  app.get('/api/postings', { preHandler: app.requireAuth }, async (request, reply) => {
    const { source, q, status: rawStatus } = request.query
    let status
    if (rawStatus === 'new') status = null
    else if (rawStatus !== undefined) status = rawStatus
    const postings = await app.dashboard.listPostingsForUser(request.user.sub, { source, q, status })
    return { postings }
  })

  app.patch('/api/postings/:id', { preHandler: app.requireAuth }, async (request, reply) => {
    const { id } = request.params
    const { status } = request.body
    await app.dashboard.setPostingStatus(request.user.sub, id, status)
    reply.code(204).send()
  })
}

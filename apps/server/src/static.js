import { existsSync } from 'node:fs'
import { join } from 'node:path'
import fastifyStatic from '@fastify/static'

export async function registerStatic(app, { distDir }) {
  const indexHtml = join(distDir, 'index.html')

  if (!existsSync(distDir) || !existsSync(indexHtml)) {
    app.log.info(`static: dist not found at ${distDir}, skipping static serving`)
    return
  }

  await app.register(fastifyStatic, { root: distDir, wildcard: false })

  app.setNotFoundHandler((request, reply) => {
    const isApi = request.url.startsWith('/api') || request.url.startsWith('/auth')
    if (request.method === 'GET' && !isApi) {
      return reply.sendFile('index.html')
    }
    reply.code(404).send({ error: 'not found' })
  })
}

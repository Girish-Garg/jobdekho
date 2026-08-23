import { notificationPrefsSchema } from './schemas.js'

const DEFAULTS = { channel: 'none', telegramChatId: null, enabled: true }

export async function notificationsRoutes(app) {
  app.get('/api/notifications', { preHandler: app.requireAuth }, async (request) => {
    const prefs = await app.dashboard.getNotificationPrefs(request.user.sub)
    return prefs ?? DEFAULTS
  })

  app.put('/api/notifications', {
    preHandler: app.requireAuth, schema: notificationPrefsSchema,
  }, async (request, reply) => {
    await app.dashboard.upsertNotificationPrefs(request.user.sub, request.body)
    reply.code(204).send()
  })
}

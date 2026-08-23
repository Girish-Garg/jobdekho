// Body schemas for routes whose input used to reach Postgres unchecked. A
// failure here becomes one of Fastify's own 400s, which the error handler in
// app.js passes through with its field-naming message intact.

// saved/applied/dismissed are the only statuses a posting can carry. null
// clears it, which is a real user action (unclicking an active Save button),
// not an omitted field, so it has to be an accepted value rather than a
// rejected one.
export const postingStatusSchema = {
  body: {
    type: 'object',
    required: ['status'],
    properties: {
      status: { type: ['string', 'null'], enum: ['saved', 'applied', 'dismissed', null] },
    },
  },
}

// email was deliberately removed from this project, so it is not a valid
// channel even though it once was.
export const notificationPrefsSchema = {
  body: {
    type: 'object',
    properties: {
      channel: { type: 'string', enum: ['none', 'telegram'] },
      telegramChatId: { type: ['string', 'null'] },
      enabled: { type: 'boolean' },
    },
  },
}

// coerceFilters already normalizes every field and tolerates a missing one;
// this only keeps a wrong-shaped body, an array or a string, from reaching it.
export const filtersBodySchema = {
  body: { type: 'object' },
}

// normalizeProfile already defends every field the same way; this only keeps
// a wrong-shaped body from reaching it.
export const profileBodySchema = {
  body: { type: 'object' },
}

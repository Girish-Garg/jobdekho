import { filter } from '@jobdekho/core/filter.js'
import { formatBatch } from '@jobdekho/notify/format.js'

function toRules(filters) {
  return { ...filters, internshipOnly: true }
}

export async function notifyUsers(freshPostings, { users, defaultRules, senders }) {
  const summary = []
  for (const { userId, filters, prefs } of users) {
    const rules = filters ? toRules(filters) : defaultRules
    const matches = freshPostings.filter((p) => filter(p, rules))
    if (matches.length === 0) {
      summary.push({ userId, sent: false, count: 0 })
      continue
    }
    const text = formatBatch(matches)
    if (prefs.channel === 'telegram' && prefs.telegramChatId) {
      await senders.telegram(prefs.telegramChatId, text)
      summary.push({ userId, sent: true, count: matches.length })
    } else if (prefs.channel === 'email' && prefs.email) {
      await senders.email(prefs.email, text)
      summary.push({ userId, sent: true, count: matches.length })
    } else {
      summary.push({ userId, sent: false, count: matches.length })
    }
  }
  return summary
}

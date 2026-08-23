import { filter } from '@jobdekho/core/filter.js'
import { formatBatch, formatOverflow, MAX_ALERTS } from '@jobdekho/notify/format.js'

export async function notifyUsers(freshPostings, { users, defaultRules, senders }) {
  const summary = []
  for (const { userId, filters, prefs } of users) {
    // A saved filter is used verbatim. It used to be forced to internships only,
    // which silently hid every job from anyone who customized their filters.
    const rules = filters ?? defaultRules
    const matches = freshPostings.filter((p) => filter(p, rules))
    if (matches.length === 0) {
      summary.push({ userId, sent: false, count: 0 })
      continue
    }
    const shown = matches.slice(0, MAX_ALERTS)
    const overflow = matches.length - shown.length
    const text = overflow > 0
      ? `${formatBatch(shown)}\n\n${formatOverflow(overflow)}`
      : formatBatch(shown)
    if (prefs.channel === 'telegram' && prefs.telegramChatId) {
      const result = await senders.telegram(prefs.telegramChatId, text)
      summary.push({ userId, sent: !!result?.ok, count: matches.length })
    } else {
      summary.push({ userId, sent: false, count: matches.length })
    }
  }
  return summary
}

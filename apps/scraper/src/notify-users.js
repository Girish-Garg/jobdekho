import { filter } from '@jobdekho/core/filter.js'
import { formatBatch, formatOverflow, packBatches, MAX_ALERTS } from '@jobdekho/notify/format.js'

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
    if (prefs.channel === 'telegram' && prefs.telegramChatId) {
      // One message per MAX_ALERTS postings blew past Telegram's 4096 char
      // limit and got the whole alert rejected, silently, for every user.
      let sent = true
      for (const group of packBatches(shown)) {
        const result = await senders.telegram(prefs.telegramChatId, formatBatch(group))
        if (!result?.ok) sent = false
      }
      if (overflow > 0) {
        const result = await senders.telegram(prefs.telegramChatId, formatOverflow(overflow))
        if (!result?.ok) sent = false
      }
      summary.push({ userId, sent, count: matches.length })
    } else {
      summary.push({ userId, sent: false, count: matches.length })
    }
  }
  return summary
}

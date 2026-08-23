export async function sendTelegram({ token, chatId }, text, fetchImpl = fetch) {
  if (!token || !chatId) return { ok: false, skipped: true }
  const res = await fetchImpl(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id: chatId, text, disable_web_page_preview: true }),
  })
  if (res.ok) return { ok: true }
  // A bare { ok: false } was indistinguishable from a bad token, a dead chat id,
  // or (as with the 4096-char overflow) a rejected message body. Telegram's own
  // description says which, so callers can log something worth reading.
  const body = await res.json().catch(() => ({}))
  return { ok: false, status: res.status, description: body.description }
}

export async function sendTelegram({ token, chatId }, text, fetchImpl = fetch) {
  if (!token || !chatId) return { ok: false, skipped: true }
  const res = await fetchImpl(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id: chatId, text, disable_web_page_preview: true }),
  })
  return { ok: res.ok }
}

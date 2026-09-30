// Whether a scrape reads LinkedIn at all: the "Include LinkedIn" switch in
// Settings, kept beside autoRefresh in the store's scrape-settings.json (the
// server's scrape/prefs.js writes it). Read here rather than there, because
// `npm run scrape` has no server to ask and must honour it too. On unless the
// person turned it off, like the other switches; anything but a real boolean
// reads as that default. Off means no request to LinkedIn of any kind.
export const DEFAULT_LINKEDIN = true

export const linkedinChoice = (value) => (typeof value === 'boolean' ? value : DEFAULT_LINKEDIN)

export function linkedinOn(db, userId) {
  return linkedinChoice(userId ? db.scrapeSettings.get(userId)?.linkedin : undefined)
}

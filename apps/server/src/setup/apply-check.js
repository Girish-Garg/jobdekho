// Whether Apply assist has a browser to drive: Chrome or Edge already on this
// computer (see apply/browser-find.js), handed in as { name, path } or null.
// Optional, never missing: without one, "Open posting" and the copy panel
// still take the person through an application by hand. JobDekho never
// downloads a browser, so the fix is an install the person makes.
//
// Left out (null) when the caller did not look at all, so a check of the
// other rows needs no browser lookup of its own.
const FIX = 'Install Google Chrome (google.com/chrome) or Microsoft Edge (microsoft.com/edge), then restart JobDekho.'

export function applyCheck(browser) {
  if (browser === undefined) return null
  const base = { id: 'apply', label: 'Apply assist' }
  if (!browser) {
    return { ...base, state: 'optional', detail: 'No Chrome or Edge was found, so Apply assist cannot open applications here.', fix: FIX }
  }
  return { ...base, state: 'ok', detail: `${browser.name} is here, so Apply assist can open and fill applications in it.`, fix: null }
}

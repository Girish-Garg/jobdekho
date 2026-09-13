// What an action may ask for beside the posting, by name. An action declares
// the names it needs and the route loads exactly those, so the resume is
// never in the room for a call that has no use for it. That is what lets the
// one tool-enabled action (the fake check, which browses) promise it carries
// no personal data: the guarantee is structural, not a matter of the prompt
// leaving a field out.
//
//   load     (dashboard, userId) -> the value, or null when the person has not
//            supplied it yet
//   missing  the sentence a 400 carries then, written to be shown as is
export const CONTEXT = {
  resumeText: {
    load: (dashboard, userId) => dashboard.getResumeText(userId),
    missing: 'Upload a resume first.',
  },
  profile: {
    load: (dashboard, userId) => dashboard.getProfile(userId),
    missing: 'Fill in your profile first.',
  },
}

// Resolves to { context } with every name loaded, or { error } naming the
// first thing the person still has to supply. A name this file does not know
// is a bug in the action and throws.
export async function loadContext(dashboard, userId, names = []) {
  const context = {}
  for (const name of names) {
    const entry = CONTEXT[name]
    if (!entry) throw new Error(`unknown action context "${name}"`)
    const value = await entry.load(dashboard, userId)
    if (value === null || value === undefined || value === '') return { error: entry.missing }
    context[name] = value
  }
  return { context }
}

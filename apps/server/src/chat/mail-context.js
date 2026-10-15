import { getMailAccount, lastMailed } from '@jobdekho/store/mail-log.js'

// What a chat question about a mail is asked with (see prompt-mail.js), or
// null for every other question, so the rule and the sender's details cost
// nothing on the questions that make up most of a chat. A question is about
// a mail when it names an address or says mail, follow-up and the like, or
// when the turn before offered one, so "make it shorter" redrafts it.
//
//   { said, mailed, connected, sender }
//
// `said` is every question the person asked in this chat, the only place a
// mail's address may come from (see mail-draft.js). `mailed` is when each
// address was last mailed, for the card to say so.
const ABOUT_MAIL = /@|\b(e-?mails?|mails?|mailing|follow[ -]?ups?|reach(ing)? out|write to|outreach|cold)\b/i

const offeredMail = (turn) => (turn?.proposals ?? []).some((p) => p.kind === 'mail')

export const aboutMail = (message, history = []) => ABOUT_MAIL.test(String(message ?? '')) || offeredMail(history.at(-1))

const clip = (list, n) => (Array.isArray(list) ? list.slice(0, n) : [])
const dates = (entry) => [entry.startDate, entry.endDate].filter(Boolean).join(' to ')

// The person as a mail introduces them: who they are, how to reach them,
// and the entries a short mail might point to. Their own data, read from
// their own record, the same as the profile pages show the model.
export function senderView(profile, account) {
  const basics = profile?.basics ?? {}
  return {
    name: basics.name ?? '',
    email: account?.address ?? basics.email ?? '',
    phone: basics.phone ?? '',
    headline: basics.headline ?? '',
    links: basics.links ?? {},
    education: clip(profile?.education, 2).map((e) => ({ title: e.title, organisation: e.organisation, dates: dates(e) })),
    experience: clip(profile?.experience, 3).map((e) => ({ title: e.title, organisation: e.organisation, dates: dates(e), bullets: clip(e.bullets, 2) })),
    projects: clip(profile?.projects, 4).map((e) => ({ title: e.title, tech: clip(e.tech, 8), bullet: clip(e.bullets, 1)[0] ?? '' })),
    skills: clip(profile?.skills, 25),
  }
}

// Asked on any page: a person may think of a mail wherever they are.
export async function chatMail({ store, dashboard, userId, message, history = [] }) {
  if (!aboutMail(message, history)) return null
  const account = getMailAccount(store, userId)
  return {
    said: [message, ...history.map((turn) => turn.question)].filter((text) => typeof text === 'string'),
    mailed: Object.fromEntries(lastMailed(store, userId)),
    connected: Boolean(account),
    sender: senderView(await dashboard.getProfile(userId), account),
  }
}

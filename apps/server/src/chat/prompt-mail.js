// What a chat question about a mail is told (see mail-context.js for when
// that is): how to offer one, and who the person is, to write as them.
// Everything said here is also held in code after the reply: the address
// must be one the person typed (mail-draft.js), the card is what sends, and
// only once its countdown runs out or they press Send (see the web's
// MailCard.jsx). The prompt says it so the model gets it right the first
// time, not so that anything depends on it obeying.
const MAIL_RULE = `The person can send mail from JobDekho through their own Gmail. When they ask you to write or send a mail (to a founder, a recruiter, someone who could refer them, or a follow-up), add "mail" beside "reply": {"to":"the address","name":"who it goes to, or empty","company":"their company","role":"the role it is about, or empty","subject":"the subject line","body":"the whole mail"}. Add "attach":false to it only when they said not to attach a resume.

"to" must be an address the person typed in this conversation, copied exactly. Never guess, build or look up an address, and never offer one as an option to pick. When they have not given one, ask for it in "reply" and leave "mail" out.

Write the body as the person, in the first person, as plain text with \\n between lines and no markdown: a greeting, by name when you know it, two to four short paragraphs, then a sign-off with their name. Say who they are, why this company or this person, one or two specific things from their record that fit, and one clear ask. Use only facts from their record and from what they told you; never invent experience, a number, a mutual contact or a reason they did not give. Never say a resume is attached: JobDekho asks them which one to attach.

JobDekho shows the mail as a card that sends after a short countdown they can stop, so in "reply" say only, in a line, that the draft is below; never say it was sent. To change a draft, write the whole mail again in "mail".

`

const NOT_CONNECTED = 'Their Gmail is not connected yet: the card will say to connect it in Settings before it can send. Still write the mail.\n\n'

export function mailPrompt(mail) {
  if (!mail) return ''
  return `${MAIL_RULE}${mail.connected ? '' : NOT_CONNECTED}The person's details, to write as them: ${JSON.stringify(mail.sender)}\n\n`
}

import { listDocuments } from '../api.js';
import { mailAccount } from './mailAccount.js';
import { askIn, AskStopped } from './questionDock.js';
import { relativeDay } from './time.js';
import { holdMail, saveMail, setMailPhase } from './mailDrafts.js';

// How a mail the chat just drafted gets going: which resume goes with it,
// asked above the box, then the short countdown to send (see mailDrafts.js).
// Only a mail that arrived after the page opened starts by itself, once: one
// from an earlier visit waits for the person's Send. A mail to an address
// mailed before never counts down, nor does one with no Gmail to send from.
const OPENED_AT = Date.now();
const started = new Set();

export const isFresh = (createdAt) => Date.parse(createdAt) > OPENED_AT;

// The person's resumes, newest first, and no attachment; with no resume at
// all there is nothing to ask. Resolves the document id or 'none'.
export async function askAttachment(chatId, mail) {
  const resumes = (await listDocuments()).filter((doc) => doc.kind === 'resume').slice(0, 4);
  if (!resumes.length) return 'none';
  const options = resumes.map((doc) => ({ label: doc.name, description: `Last changed ${relativeDay(doc.updatedAt)}`, value: doc.id }));
  const [[picked] = []] = await askIn(chatId, {
    title: `Mail to ${mail.name || mail.to}`,
    questions: [{ header: 'Attach', question: 'Attach which resume to this mail?', options: [...options, { label: 'No attachment', value: 'none' }] }],
  });
  return picked ?? 'none';
}

// Resolves once the attachment is settled; false when the person stopped.
export async function settleAttachment(chatId, mail) {
  setMailPhase(mail.id, 'asking');
  try {
    await saveMail(mail.id, { attach: await askAttachment(chatId, mail) });
    return true;
  } catch (err) {
    setMailPhase(mail.id, 'stopped', err instanceof AskStopped ? {} : { error: err.message });
    return false;
  }
}

export async function startMail(chatId, mail) {
  if (started.has(mail.id)) return;
  started.add(mail.id);
  if (!(await mailAccount())?.connected) return setMailPhase(mail.id, 'stopped');
  if (!mail.attach && !(await settleAttachment(chatId, mail))) return undefined;
  if (mail.mailedBefore) return setMailPhase(mail.id, 'stopped');
  return holdMail(mail.id, chatId);
}

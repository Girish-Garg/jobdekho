import { relativeDay } from './time.js';

// The words for one thing the AI made, as the Resume page's "Made by AI"
// lists it (see the server's chat/made-by-ai.js): what kind of thing it is,
// what it is called, and what it belongs to. A job a scrape has since
// dropped is still named as a job, since what was made for it is still there.
const GONE_JOB = 'A job JobDekho no longer lists';

const ACTION_WORDS = {
  'fake-check': 'Is it real? check',
  'cover-letter': 'Cover letter',
  'resume-tailor': 'Tailored resume',
};

const joined = (...parts) => parts.filter(Boolean).join(', ');

function versionsNote(count) {
  return count > 1 ? `${count} versions` : '';
}

export function describeMade(item) {
  const when = relativeDay(item.at);
  if (ACTION_WORDS[item.kind]) {
    return {
      word: ACTION_WORDS[item.kind],
      title: item.job?.title ?? GONE_JOB,
      detail: joined(item.job?.company, versionsNote(item.versions), when),
    };
  }
  if (item.kind === 'document') {
    const letter = item.documentKind === 'cover-letter';
    return {
      word: letter ? 'Cover letter document' : 'Resume document',
      title: item.name,
      detail: joined(item.job ? `For ${item.job.title} at ${item.job.company}` : 'Changed from the chat', when),
    };
  }
  return {
    word: 'Profile change',
    title: item.summary,
    detail: joined('Applied from a chat', when),
  };
}

export const isJobItem = (item) => Boolean(ACTION_WORDS[item.kind]);

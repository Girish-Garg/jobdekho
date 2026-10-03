// What an empty chat says and offers, so a first question is one click
// rather than a blank box. A job's chat asks about its job (the company
// ones are the questions that send the web a search), a comparison about
// its jobs side by side, and a document's chat for changes to it. A general
// chat follows the page, since the server answers it from the page it was
// asked on: the feed on screen, the profile, the documents on the Resume
// page. On the last two a change comes back as a card to apply, so the
// questions there are requests rather than questions.
const PAGES = {
  postings: {
    title: 'Ask about your feed',
    intro: 'Ask about the postings on screen, or open one to ask about it.',
    questions: ['Which of these fit me best?', 'Show only remote jobs', 'Which companies here are hiring freshers?', 'What should I apply to first?'],
  },
  profile: {
    title: 'Ask about your profile',
    intro: 'Tell it what to add or fix, or ask what is missing. Changes come back as cards you apply.',
    questions: ['Add a project I built', 'What skills am I missing for backend roles?', 'How can I make my profile stronger?'],
  },
  resume: {
    title: 'Change your documents',
    intro: 'Ask for a change to the open document, or for a new one. Every change comes back as a card you apply.',
    questions: ['Make it fit one page', 'Tailor it for a job I saved', 'Write a cover letter'],
  },
  settings: {
    title: 'Ask about JobDekho',
    intro: 'Ask how JobDekho works, or what a setting here does.',
    questions: ['Which AI CLI answers my questions?', 'What does JobDekho send to the AI?', 'What does each setting here do?'],
  },
};

function forJob(posting) {
  const company = String(posting.company ?? '').trim();
  const fit = 'How well do I fit this job?';
  return {
    title: 'Ask about this job',
    intro: 'Ask anything about this job, or start with one of the actions below.',
    questions: company
      ? [fit, `Is ${company} hiring for other roles here?`, `What is ${company} known for lately?`]
      : [fit, 'What does this job ask for that I do not have yet?'],
  };
}

const COMPARE = {
  title: 'Compare these jobs',
  intro: 'Ask how they differ, or start with one of the actions below.',
  questions: ['Which of these fits me best?', 'How do they compare on pay and level?', 'What does each ask for that I do not have yet?'],
};

export function chatSuggestions({ page = 'postings', posting = null, kind = null } = {}) {
  if (posting) return forJob(posting);
  if (kind === 'compare') return COMPARE;
  if (kind === 'document') return PAGES.resume;
  return PAGES[page] ?? PAGES.postings;
}

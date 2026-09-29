// What an empty chat says and offers, so a first question is one click
// rather than a blank box. The chat is open on every page, and the server
// answers from the page it was asked on, so each page gets questions that
// page can answer: the feed on screen, the job in scope (the company ones
// are the questions that send the web a search), the profile, the resume.
const PAGES = {
  postings: {
    title: 'Ask about your feed',
    intro: 'Ask about the postings on screen, or open one to ask about it.',
    questions: ['Which of these fit me best?', 'Show only remote jobs', 'Which companies here are hiring freshers?', 'What should I apply to first?'],
  },
  profile: {
    title: 'Ask about your profile',
    intro: 'Ask what to add, what is missing, or how your profile reads.',
    questions: ['Add a project I built', 'What skills am I missing for backend roles?', 'How can I make my profile stronger?'],
  },
  resume: {
    title: 'Ask about your resume',
    intro: 'Ask what to cut, what to rewrite, or how it reads for a role.',
    questions: ['Make my resume fit one page', 'Rewrite my summary for backend roles', 'Which entries should I cut first?'],
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

export function chatSuggestions({ page = 'postings', posting = null } = {}) {
  if (posting) return forJob(posting);
  return PAGES[page] ?? PAGES.postings;
}

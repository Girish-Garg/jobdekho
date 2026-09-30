// Which postings Apply assist fills, and which it helps with another way.
//
// Boards you apply on signed in take the application inside your own
// account there, and their terms do not allow a tool to act in it (LinkedIn
// restricts accounts over it). On those, the button lays your details out to
// paste into the board's form instead (ApplyOnBoard.jsx). Aggregators are not
// in this list: their page links on to the company's form, which Apply
// assist opens and fills like any other once the person has clicked through.
// The server keeps the same split (apply/apply-url.js) and is the check that
// counts; this only picks which panel the button opens.
export const BOARDS = {
  linkedin: 'LinkedIn', internshala: 'Internshala', unstop: 'Unstop', instahyre: 'Instahyre',
  naukri: 'Naukri', wellfound: 'Wellfound', indeed: 'Indeed',
};

const sourceOf = (posting) => String(posting?.source ?? '').split(':')[0].toLowerCase();
const webLink = (posting) => Boolean(posting?.url) && /^https?:\/\//i.test(posting.url);

// The board's name, for a posting on one applied to signed in; null otherwise.
export const boardOf = (posting) => BOARDS[sourceOf(posting)] ?? null;

export const offersApply = (posting) => webLink(posting) && !boardOf(posting);

export const appliesOnBoard = (posting) => webLink(posting) && Boolean(boardOf(posting));

// A source is stored as "board:company" ("smartrecruiters:PhonePeLimited"),
// which is the scraper's key, not something to show a person. The pane names
// the board the way the board names itself.
const BOARDS = {
  greenhouse: 'Greenhouse', lever: 'Lever', ashby: 'Ashby', smartrecruiters: 'SmartRecruiters',
  workable: 'Workable', personio: 'Personio', recruitee: 'Recruitee', internshala: 'Internshala',
  unstop: 'Unstop', instahyre: 'Instahyre', linkedin: 'LinkedIn', arbeitnow: 'Arbeitnow',
  remoteok: 'RemoteOK', remotive: 'Remotive',
};

export function sourceName(source) {
  const board = String(source || '').split(':')[0].trim().toLowerCase();
  if (!board) return '';
  return BOARDS[board] ?? board[0].toUpperCase() + board.slice(1);
}

// A row in the source picker: the company a careers board belongs to, with
// the board under it, or a whole job board by its own name. The company part
// is the board's slug for it, so only its separators and first letter change;
// guessing word breaks inside "PhonePeLimited" would get as many wrong.
//
// Adzuna's key is "adzuna:in": what follows the colon is the country it was
// searched in, not a company, so it is a whole board like Internshala.
const COUNTRY_BOARDS = new Set(['adzuna']);

export function sourceLabel(source) {
  const [board, ...rest] = String(source || '').split(':');
  const company = rest.join(':').replace(/[-_]+/g, ' ').trim();
  if (!company || COUNTRY_BOARDS.has(board.trim().toLowerCase())) return { title: sourceName(board), board: 'Job board' };
  return { title: company[0].toUpperCase() + company.slice(1), board: sourceName(board) };
}

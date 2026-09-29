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

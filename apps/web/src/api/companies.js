import { req, announced } from './request.js';

// The companies the person blocked (see the server's api/blocked-companies.js).
// Each is { key, name, blockedAt, stopFetching, careersPage }: `careersPage`
// says whether JobDekho reads a careers page of the company's own, the one
// thing `stopFetching` can leave unread.
export function getBlockedCompanies() {
  return announced(req('/api/companies/blocked'), 'Blocked companies').then((d) => d.blocked);
}

// Answers with the entry the block is kept as, the earlier one when the
// company was already blocked.
export function blockCompany(name, { stopFetching = false } = {}) {
  const body = JSON.stringify({ name, stopFetching });
  return announced(req('/api/companies/blocked', { method: 'POST', body }), 'Block company').then((d) => d.blocked);
}

export function unblockCompany(key) {
  return announced(req(`/api/companies/blocked/${encodeURIComponent(key)}`, { method: 'DELETE' }), 'Unblock company');
}

// Whether the company has a careers page of its own for a block to stop
// reading. Not announced: the question in the pane simply leaves the choice
// out when it cannot tell.
export function getCareersPage(name) {
  return req(`/api/companies/careers-page?name=${encodeURIComponent(name)}`).then((d) => d.careersPage === true);
}

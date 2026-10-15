// A turn's proposals in the shape the cards draw (see ChatProposals.jsx),
// whatever was saved. A turn from before proposals existed has none, and a
// proposal of a kind this page does not know is left out rather than drawn
// as something it is not.
//
// A profile proposal's diff rows come from the server as { label, before,
// after } with lines joined by "\n"; each row here also says what kind of
// change it is, since that decides its colour: only an `after` is an
// addition, only a `before` a removal, both a change.
//
// A document change whose edits did not fit the document is 'refused', with
// the server's `reason`; one built from edits says how many (`editCount`).
const STATUSES = new Set(['pending', 'applied', 'discarded', 'refused']);

const text = (value) => (typeof value === 'string' ? value : '');
const words = (value) => (Array.isArray(value) ? value.filter((item) => typeof item === 'string' && item) : []);
const lines = (value) => (text(value) ? text(value).split('\n') : []);

function diffRow(row) {
  const before = lines(row.before);
  const after = lines(row.after);
  const change = !before.length ? 'add' : !after.length ? 'remove' : 'change';
  return { label: text(row.label), change, before, after };
}

function diffOf(diff) {
  if (!Array.isArray(diff)) return [];
  return diff.filter((row) => row && typeof row === 'object' && (text(row.before) || text(row.after))).map(diffRow);
}

// A mail the chat drafted (see the server's chat/mail-draft.js): what it
// says, which resume goes with it, and once sent, when and from where.
const mailOf = (p) => ({
  to: text(p.to), name: text(p.name), company: text(p.company), role: text(p.role),
  subject: text(p.subject), body: text(p.body), attach: text(p.attach) || null, attachName: text(p.attachName) || null,
  mailedBefore: text(p.mailedBefore) || null, sentAt: text(p.sentAt) || null, from: text(p.from) || null, reason: text(p.reason),
});

function shape(proposal) {
  const base = {
    id: proposal.id,
    kind: proposal.kind,
    summary: text(proposal.summary),
    status: STATUSES.has(proposal.status) ? proposal.status : 'pending',
    appliedAt: text(proposal.appliedAt) || null,
  };
  if (proposal.kind === 'profile') return { ...base, diff: diffOf(proposal.diff) };
  if (proposal.kind === 'mail') return { ...base, ...mailOf(proposal) };
  return {
    ...base,
    documentId: text(proposal.documentId) || null,
    documentKind: proposal.documentKind === 'cover-letter' ? 'cover-letter' : 'resume',
    name: text(proposal.name),
    tex: text(proposal.tex),
    baseAt: text(proposal.baseAt) || null,
    factFlags: words(proposal.factFlags),
    problems: words(proposal.problems),
    ...(base.status === 'refused' ? { reason: text(proposal.reason) } : {}),
    ...(Number.isInteger(proposal.editCount) && proposal.editCount > 0 ? { editCount: proposal.editCount } : {}),
  };
}

export function proposalsOf(turn) {
  if (!Array.isArray(turn?.proposals)) return [];
  return turn.proposals
    .filter((p) => p && typeof p.id === 'string' && p.id && ['profile', 'document', 'mail'].includes(p.kind))
    .map(shape);
}

import { useState } from 'react';
import { applyProposal, discardProposal } from '../api.js';
import { announceApplied } from './proposalAppliedSignal.js';

// One proposal card's buttons. The status starts from the saved turn, so an
// applied card reads as applied after a reload, and moves on with what the
// server answers. What an Apply saved is broadcast (see proposalAppliedSignal
// .js) for the page that shows it to adopt.
//
// A refusal keeps the card as it was and says why in the server's sentence,
// verbatim: a 409 names what changed since, a 422 lists the lines the LaTeX
// guard refused, a 404 says the change left the conversation.
export function useProposal(proposal) {
  const [status, setStatus] = useState(proposal.status);
  const [appliedAt, setAppliedAt] = useState(proposal.appliedAt);
  const [busy, setBusy] = useState(null);
  const [error, setError] = useState(null);

  async function run(which, call) {
    if (busy) return;
    setBusy(which);
    setError(null);
    try {
      await call();
    } catch (err) {
      setError({ message: err.message, problems: err.problems ?? [] });
    } finally {
      setBusy(null);
    }
  }

  const apply = () => run('apply', async () => {
    const outcome = await applyProposal(proposal.id);
    setStatus(outcome?.proposal?.status ?? 'applied');
    setAppliedAt(outcome?.proposal?.appliedAt ?? new Date().toISOString());
    if (outcome?.profile) announceApplied({ kind: 'profile', profile: outcome.profile });
    if (outcome?.document) announceApplied({ kind: 'document', document: outcome.document });
  });

  const discard = () => run('discard', async () => {
    await discardProposal(proposal.id);
    setStatus('discarded');
  });

  return { status, appliedAt, busy, error, apply, discard };
}

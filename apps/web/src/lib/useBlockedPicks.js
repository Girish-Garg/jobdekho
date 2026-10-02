import { useEffect } from 'react';
import { companyParam } from './feedQuery.js';

// A blocked company never shows again, so a pick of it would leave the feed
// titled with a company it can never list (see PostingsHeader.jsx). The
// server names those picks (see the store's dashboard.js), matching each by
// the key the block is kept under, so every spelling is caught however the
// pick was made: the pane, the company menu or the chat. They are let go.
export function useBlockedPicks(blockedPicks, filters, setFilters) {
  const gone = blockedPicks.join('\n');

  useEffect(() => {
    if (!blockedPicks.length) return;
    const kept = (filters.companies || []).filter((name) => !blockedPicks.includes(companyParam(name)));
    setFilters({ ...filters, companies: kept });
  }, [gone]); // eslint-disable-line react-hooks/exhaustive-deps
}

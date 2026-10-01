import { useEffect, useRef, useState } from 'react';
import { getCompanies } from '../api.js';
import { feedQuery } from './feedQuery.js';

// The company menu's list, read when the menu opens and again when another
// filter changes under it, never in the background: it is every employer in
// the feed, and counting them is work only an open menu needs. A tick in the
// menu does not read it again. The counts leave the company filter out (see
// the store's companies.js), so a tick changes none of them, and the menu
// works out which rows are ticked from the picks themselves.
export function useCompanyCounts(filters, open) {
  const [state, setState] = useState({ list: null, failed: false });
  const { companies, ...rest } = feedQuery(filters);
  const asked = JSON.stringify(rest);
  const picks = useRef(companies);
  picks.current = companies;

  useEffect(() => {
    if (!open) return undefined;
    let alive = true;
    getCompanies({ ...JSON.parse(asked), companies: picks.current })
      .then((list) => alive && setState({ list, failed: false }))
      .catch(() => alive && setState((prev) => ({ list: prev.list, failed: true })));
    return () => {
      alive = false;
    };
  }, [asked, open]);

  return state;
}

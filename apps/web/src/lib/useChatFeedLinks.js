import { useEffect, useRef } from 'react';
import { requestOpenPosting } from './openPostingSignal.js';
import { chatFitFloor } from './chatFitFloor.js';
import { blockCompanies } from './blockCompanies.js';

// A kept conversation's Fit button applies today's floor for the letter it
// showed (see chatFitFloor.js).
const withTodaysFloor = ({ patch, label }) => ('minFit' in patch ? { ...patch, minFit: chatFitFloor(patch.minFit, label) } : patch);

// What an answer can do to the feed: apply a filter or sort it offered, block
// the companies the person asked it to, or open a job it named. All of them
// act on the feed, so on any other page they take the person there first
// rather than change something they cannot see.
//
// A block from the chat stops fetching the companies' own careers pages too:
// there is no box to tick on a button, and the person asked to be rid of
// them, so a page whose every job would be thrown away is not read. Settings
// says so beside each, and Unblock undoes all of it. A block that fails says
// so in a notice of its own (see api/companies.js).
//
// A job named from another page is asked for once the feed is there to hear
// it. The feed mounts in the same render that switches to it, and it starts
// listening in its effects, which run after this one; a zero timeout lands
// after all of them. The feed then opens the job even before its rows load
// (see useOpenPosting.js, which fetches a job its rows do not hold).
export function useChatFeedLinks({ onFeed, filters, apply }) {
  const pendingOpen = useRef(null);

  useEffect(() => {
    if (!onFeed || !pendingOpen.current) return undefined;
    const id = pendingOpen.current;
    pendingOpen.current = null;
    const timer = setTimeout(() => requestOpenPosting(id), 0);
    return () => clearTimeout(timer);
  }, [onFeed]);

  function onApply(action) {
    if (action.type === 'filters') apply.setFilters({ ...filters, ...withTodaysFloor(action) });
    else if (action.type === 'sort') apply.setSort(action.value);
    else if (action.type === 'block') blockCompanies(action.companies, { stopFetching: true }).catch(() => {});
    if (!onFeed) apply.setView?.('postings');
  }

  function onOpenRef(id) {
    if (onFeed) {
      requestOpenPosting(id);
      return;
    }
    pendingOpen.current = id;
    apply.setView?.('postings');
  }

  return { onApply, onOpenRef };
}

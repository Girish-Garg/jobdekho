import { useEffect, useRef } from 'react';
import { requestOpenPosting } from './openPostingSignal.js';
import { chatFitFloor } from './chatFitFloor.js';

// A kept conversation's Fit button applies today's floor for the letter it
// showed (see chatFitFloor.js).
const withTodaysFloor = ({ patch, label }) => ('minFit' in patch ? { ...patch, minFit: chatFitFloor(patch.minFit, label) } : patch);

// What an answer can do to the feed: apply a filter or sort it offered, or
// open a job it named. Both act on the feed, so on any other page they take
// the person there first rather than change something they cannot see.
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

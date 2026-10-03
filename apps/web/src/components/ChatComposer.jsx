import { providerFor } from '../lib/providerFor.js';
import { ACTION_KINDS, CHAT_INTRO, CHAT_POLICY } from '../lib/chatActionKinds.js';
import { runCombined } from '../lib/chatAsk.js';
import InstallHint from './InstallHint.jsx';
import ChatQuickActions from './ChatQuickActions.jsx';
import ChatCompareActions from './ChatCompareActions.jsx';
import ChatReplyTarget from './ChatReplyTarget.jsx';
import ChatInput from './ChatInput.jsx';

// Everything under the conversation: the actions this kind of chat has (a
// job's three, a comparison's two), the reply target, why Send waits when
// another chat's answer runs (`note`), and the box. It never scrolls away:
// the conversation above it does.
//
// The provider gate lives here. With no CLI that can take a no-tools call,
// nothing in the panel can run, so one install hint stands in for all of it.
// With one that takes plain calls but cannot search the web, everything
// works except the fake check, and asking for that shows its own hint
// instead of a call that could only fail; the server makes the same choice
// (ai/select.js).
export default function ChatComposer({ cli, view, results, box, job, target, onClearTarget, waitReason = null, note = null }) {
  const { providers, checking, refresh } = cli;
  const known = Array.isArray(providers);
  const hint = (intro, policy) => (
    <InstallHint intro={intro} policies={[policy]} providers={providers} checking={checking} onRecheck={refresh} />
  );
  if (known && !providerFor(providers, CHAT_POLICY)) {
    return <div className="shrink-0 border-t border-line p-3">{hint(CHAT_INTRO, CHAT_POLICY)}</div>;
  }

  const blocked = job.blocked ? ACTION_KINDS[job.blocked] : null;
  const changing = target ? ACTION_KINDS[target] : null;
  const posting = view?.kind === 'job' ? view.jobs[0] : null;

  // The fade lets the conversation run under the box instead of stopping
  // at a hard edge, which is what says there is more above to scroll to.
  return (
    <div className="relative mx-auto flex w-full max-w-3xl shrink-0 flex-col gap-2.5 px-3 pb-3 pt-1">
      <div aria-hidden="true" className="pointer-events-none absolute -top-6 left-0 right-2 h-6 bg-gradient-to-t from-panel to-transparent" />
      {blocked && known && !providerFor(providers, blocked.policy) && hint(blocked.intro, blocked.policy)}
      {posting && <ChatQuickActions results={results} waitReason={waitReason} onRun={(kind) => job.start(posting.id, kind)} />}
      {view?.kind === 'compare' && <ChatCompareActions view={view} waitReason={waitReason} onRun={(which) => runCombined(view.id, which)} />}
      {changing && <ChatReplyTarget name={changing.name} onClear={onClearTarget} />}
      {note}
      <ChatInput {...box} placeholder={changing?.ask} submitLabel={changing ? 'Change' : 'Ask'} focusKey={target} />
    </div>
  );
}

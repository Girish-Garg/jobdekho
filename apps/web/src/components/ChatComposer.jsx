import { providerFor } from '../lib/providerFor.js';
import { ACTION_KINDS, CHAT_INTRO, CHAT_POLICY } from '../lib/chatActionKinds.js';
import AiError from './AiError.jsx';
import InstallHint from './InstallHint.jsx';
import ChatQuickActions from './ChatQuickActions.jsx';
import ChatReplyTarget from './ChatReplyTarget.jsx';
import ChatInput from './ChatInput.jsx';

// Everything under the conversation: what went wrong last, the quick actions
// for the job in scope, the reply target, and the box. It never scrolls
// away: the conversation above it does.
//
// The provider gate lives here. With no CLI that can take a no-tools call,
// nothing in the panel can run, so one install hint stands in for all of it.
// With one that takes plain calls but cannot search the web, everything
// works except the fake check, and asking for that shows its own hint
// instead of a call that could only fail; the server makes the same choice
// (ai/select.js). Ollama is that case until it is signed in to ollama.com
// with a model that uses tools, which is when it can search too.
export default function ChatComposer({ cli, scoped, runner, actions, target, onClearTarget, onSend, draft = null, box = {} }) {
  const { providers, checking, refresh } = cli;
  const known = Array.isArray(providers);
  const hint = (intro, policy) => (
    <InstallHint intro={intro} policies={[policy]} providers={providers} checking={checking} onRecheck={refresh} />
  );
  if (known && !providerFor(providers, CHAT_POLICY)) {
    return <div className="shrink-0 border-t border-line p-3">{hint(CHAT_INTRO, CHAT_POLICY)}</div>;
  }

  const blocked = actions.blocked ? ACTION_KINDS[actions.blocked] : null;
  const changing = target ? ACTION_KINDS[target] : null;

  // The fade lets the conversation run under the box instead of stopping
  // at a hard edge, which is what says there is more above to scroll to.
  return (
    <div className="relative mx-auto flex w-full max-w-3xl shrink-0 flex-col gap-2.5 px-3 pb-3 pt-1">
      <div aria-hidden="true" className="pointer-events-none absolute -top-6 left-0 right-2 h-6 bg-gradient-to-t from-panel to-transparent" />
      {runner.error && (
        <div className="rounded-xl border border-ember/30 bg-ember/5 px-3 py-2">
          <AiError error={runner.error} checking={checking} onRecheck={() => { runner.clearError(); refresh(); }} />
        </div>
      )}
      {blocked && known && !providerFor(providers, blocked.policy) && hint(blocked.intro, blocked.policy)}
      {scoped && <ChatQuickActions results={actions.results} busy={runner.busy} onRun={actions.run} />}
      {changing && <ChatReplyTarget name={changing.name} onClear={onClearTarget} />}
      <ChatInput
        {...box}
        busy={runner.busy}
        onSend={onSend}
        placeholder={changing?.ask}
        submitLabel={changing ? 'Change' : 'Ask'}
        focusKey={target}
        draft={draft}
      />
    </div>
  );
}

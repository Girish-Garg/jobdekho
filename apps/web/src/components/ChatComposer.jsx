import { providerFor } from '../lib/providerFor.js';
import { ACTION_KINDS, CHAT_INTRO, CHAT_POLICY } from '../lib/chatActionKinds.js';
import AiError from './AiError.jsx';
import InstallHint from './InstallHint.jsx';
import ChatQuickActions from './ChatQuickActions.jsx';
import ChatReplyTarget from './ChatReplyTarget.jsx';
import ChatInput from './ChatInput.jsx';

// Everything under the conversation: what went wrong last, the quick actions
// for the job in scope, the reply target, and the box.
//
// The provider gate lives here. With no CLI that can take a no-tools call,
// nothing in the panel can run, so one install hint stands in for all of it.
// With one that takes plain calls but cannot search the web, everything
// works except the fake check, and asking for that shows its own hint
// instead of a call that could only fail; the server makes the same choice
// (ai/select.js). Both CLIs search today, so this is for one added later.
export default function ChatComposer({ cli, scoped, runner, actions, target, onClearTarget, onSend }) {
  const { providers, checking, refresh } = cli;
  const known = Array.isArray(providers);
  const hint = (intro, policy) => (
    <div className="px-3 pt-3">
      <InstallHint intro={intro} policies={[policy]} providers={providers} checking={checking} onRecheck={refresh} />
    </div>
  );
  if (known && !providerFor(providers, CHAT_POLICY)) return <div className="border-t border-line pb-3">{hint(CHAT_INTRO, CHAT_POLICY)}</div>;

  const blocked = actions.blocked ? ACTION_KINDS[actions.blocked] : null;
  const changing = target ? ACTION_KINDS[target] : null;

  return (
    <div className="flex flex-col border-t border-line">
      {runner.error && (
        <div className="px-3 pt-3">
          <AiError error={runner.error} checking={checking} onRecheck={() => { runner.clearError(); refresh(); }} />
        </div>
      )}
      {blocked && known && !providerFor(providers, blocked.policy) && hint(blocked.intro, blocked.policy)}
      {scoped && <ChatQuickActions results={actions.results} busy={runner.busy} onRun={actions.run} />}
      {changing && <ChatReplyTarget name={changing.name} onClear={onClearTarget} />}
      <ChatInput
        busy={runner.busy}
        onSend={onSend}
        placeholder={changing?.ask}
        submitLabel={changing ? 'Change' : 'Ask'}
        focusKey={target}
      />
    </div>
  );
}

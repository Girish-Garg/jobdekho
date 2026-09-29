import { useEffect, useState } from 'react';
import { useProviders } from '../lib/useProviders.js';
import { useAiRunner } from '../lib/useAiRunner.js';
import { useChat } from '../lib/useChat.js';
import { useChatScope } from '../lib/useChatScope.js';
import { useChatActions } from '../lib/useChatActions.js';
import { buildConversation } from '../lib/conversation.js';
import { takeRequest } from '../lib/askAiSignal.js';
import { requestOpenPosting } from '../lib/openPostingSignal.js';
import ChatHeader from './ChatHeader.jsx';
import ChatScopeCard from './ChatScopeCard.jsx';
import ChatMessages from './ChatMessages.jsx';
import ChatComposer from './ChatComposer.jsx';
import ResumeBuilderOverlay from './ResumeBuilderOverlay.jsx';

// The actual panel, split out of AiChatPanel.jsx so its hooks - loading the
// conversation, probing for a CLI - only ever run while the panel is open.
//
// Every AI thing the app does happens here: plain questions about the feed,
// and the three posting actions on the job in scope, whose answers land in
// the conversation as cards. A message goes one of two ways: with a card
// picked as the reply target it is that action's refine instruction (the
// same refine path, with its versions, the pane used to have a box for);
// without one it is a question. A tailoring that arrives opens the resume
// builder beside the panel, since reading the plan is only half the job.
export default function ChatPanelBody({ onClose, context, apply, request }) {
  const cli = useProviders();
  const runner = useAiRunner(cli.providers);
  const chat = useChat(runner);
  const scope = useChatScope();
  const [builder, setBuilder] = useState(null);
  const actions = useChatActions(scope.posting, { runner, providers: cli.providers, onTailored: setBuilder });
  const [target, setTarget] = useState(null);

  // A reply target is one job's card; another job has no such card.
  useEffect(() => setTarget(null), [scope.posting?.id]);

  // "Ask AI about this job" from the pane, handled once however often this
  // panel mounts (see askAiSignal.js).
  useEffect(() => {
    if (!takeRequest(request)) return;
    scope.focus(request.posting);
    if (request.action) actions.queue(request.posting.id, request.action);
  }, [request]); // eslint-disable-line react-hooks/exhaustive-deps

  function onApply(action) {
    if (action.type === 'filters') apply.setFilters({ ...context.filters, ...action.patch });
    else if (action.type === 'sort') apply.setSort(action.value);
  }

  function onSend(message) {
    actions.clearBlocked();
    if (target) actions.refine(target, message);
    else chat.ask(message, { filters: context.filters, sort: context.sort, openPostingId: scope.posting?.id ?? null });
  }

  const card = {
    providers: cli.providers,
    target,
    onTarget: setTarget,
    onOpenBuilder: (plan) => setBuilder({ jobTitle: scope.posting?.title ?? '', plan }),
  };

  return (
    <>
      <aside aria-label="Ask AI" className="slide-in-left absolute inset-y-0 left-0 z-30 flex w-[26rem] max-w-full flex-col border-r border-line bg-panel shadow-pop">
        <ChatHeader onNew={chat.startNew} onClose={onClose} />
        {scope.posting && <ChatScopeCard posting={scope.posting} onClear={scope.clear} />}
        <ChatMessages
          entries={buildConversation(chat.turns, actions.results ?? [])}
          pending={runner.pending}
          progress={runner.progress}
          scoped={Boolean(scope.posting)}
          loading={Boolean(scope.posting) && actions.results === undefined}
          card={card}
          onApply={onApply}
          onOpenRef={requestOpenPosting}
        />
        <ChatComposer
          cli={cli}
          scoped={Boolean(scope.posting)}
          runner={runner}
          actions={actions}
          target={target}
          onClearTarget={() => setTarget(null)}
          onSend={onSend}
        />
      </aside>
      {builder && <ResumeBuilderOverlay jobTitle={builder.jobTitle} plan={builder.plan} onClose={() => setBuilder(null)} />}
    </>
  );
}

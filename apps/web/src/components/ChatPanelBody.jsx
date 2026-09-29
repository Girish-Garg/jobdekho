import { useEffect, useState } from 'react';
import { useProviders } from '../lib/useProviders.js';
import { useAiRunner } from '../lib/useAiRunner.js';
import { useChat } from '../lib/useChat.js';
import { useChatScope } from '../lib/useChatScope.js';
import { useChatActions } from '../lib/useChatActions.js';
import { useChatLayout } from '../lib/useChatLayout.js';
import { useChatAnswerer } from '../lib/useChatAnswerer.js';
import { useChatFeedLinks } from '../lib/useChatFeedLinks.js';
import { buildConversation } from '../lib/conversation.js';
import { takeRequest } from '../lib/askAiSignal.js';
import ChatFrame from './ChatFrame.jsx';
import ChatHeader from './ChatHeader.jsx';
import ChatScopeCard from './ChatScopeCard.jsx';
import ChatMessages from './ChatMessages.jsx';
import ChatComposer from './ChatComposer.jsx';
import ResumeBuilderOverlay from './ResumeBuilderOverlay.jsx';

// The actual panel, split out of AiChatPanel.jsx so its hooks - loading the
// conversation, probing for a CLI - only ever run while the panel is open.
//
// A message goes one of two ways: with a card picked as the reply target it
// is that action's refine instruction; without one it is a question, sent
// with the page it was asked on so the server answers from what is on
// screen. A job is only in scope on the feed, where it is open beside the
// list; on the other pages the scope waits, unshown, for the way back. A
// tailoring that arrives opens the resume builder beside the panel.
export default function ChatPanelBody({ onClose, context, apply, request }) {
  const cli = useProviders();
  const answerer = useChatAnswerer(cli.providers);
  const layout = useChatLayout();
  const runner = useAiRunner(cli.providers);
  const chat = useChat(runner);
  const scope = useChatScope();
  const page = context.page ?? 'postings';
  const onFeed = page === 'postings';
  const posting = onFeed ? scope.posting : null;
  const [builder, setBuilder] = useState(null);
  const actions = useChatActions(posting, { runner, providers: cli.providers, onTailored: setBuilder });
  const [target, setTarget] = useState(null);
  const links = useChatFeedLinks({ onFeed, filters: context.filters, apply });

  // A reply target is one job's card; another job has no such card.
  useEffect(() => setTarget(null), [posting?.id]);

  // "Ask AI about this job" from the pane, handled once however often this
  // panel mounts (see askAiSignal.js).
  useEffect(() => {
    if (!takeRequest(request)) return;
    scope.focus(request.posting);
    if (request.action) actions.queue(request.posting.id, request.action);
  }, [request]); // eslint-disable-line react-hooks/exhaustive-deps

  function onSend(message) {
    actions.clearBlocked();
    if (target) actions.refine(target, message);
    else chat.ask(message, { filters: context.filters, sort: context.sort, openPostingId: posting?.id ?? null, page });
  }

  const card = {
    providers: cli.providers,
    target,
    onTarget: setTarget,
    onOpenBuilder: (plan) => setBuilder({ jobTitle: posting?.title ?? '', plan }),
  };
  const empty = { page, posting, loading: Boolean(posting) && actions.results === undefined, busy: runner.busy, onSend };
  const beside = builder && <ResumeBuilderOverlay jobTitle={builder.jobTitle} plan={builder.plan} onClose={() => setBuilder(null)} />;

  return (
    <ChatFrame layout={layout} beside={beside}>
      <ChatHeader providers={cli.providers} answerer={answerer} layout={layout} onNew={chat.startNew} onClose={onClose} />
      {posting && <ChatScopeCard posting={posting} onClear={scope.clear} />}
      <ChatMessages
        entries={buildConversation(chat.turns, actions.results ?? [])}
        pending={runner.pending}
        progress={runner.progress}
        empty={empty}
        card={card}
        answerer={answerer?.label ?? 'AI'}
        onApply={links.onApply}
        onOpenRef={links.onOpenRef}
      />
      <ChatComposer cli={cli} scoped={Boolean(posting)} runner={runner} actions={actions} target={target} onClearTarget={() => setTarget(null)} onSend={onSend} />
    </ChatFrame>
  );
}

import { useEffect, useState } from 'react';
import { useProviders } from '../lib/useProviders.js';
import { useAiRunner } from '../lib/useAiRunner.js';
import { useChat } from '../lib/useChat.js';
import { useChatWatcher } from '../lib/chatSession.js';
import { useChatScope } from '../lib/useChatScope.js';
import { useChatActions } from '../lib/useChatActions.js';
import { useChatLayout } from '../lib/useChatLayout.js';
import { useChatAnswerer } from '../lib/useChatAnswerer.js';
import { useChatFeedLinks } from '../lib/useChatFeedLinks.js';
import { chatCard } from '../lib/chatCard.js';
import { useOpenDocument } from '../lib/useOpenDocument.js';
import { historyLinks } from '../lib/historyLinks.js';
import { buildConversation } from '../lib/conversation.js';
import { takeRequest } from '../lib/askAiSignal.js';
import ChatFrame from './ChatFrame.jsx';
import ChatHeader from './ChatHeader.jsx';
import ChatScopeCard from './ChatScopeCard.jsx';
import ChatDocumentScope from './ChatDocumentScope.jsx';
import ChatMessages from './ChatMessages.jsx';
import ChatComposer from './ChatComposer.jsx';
import ChatHistory from './ChatHistory.jsx';

// The actual panel, split out of AiChatPanel.jsx so its hooks - loading the
// conversation, probing for a CLI - only ever run while the panel is open.
//
// A message goes one of two ways: with a card picked as the reply target it
// is that action's refine instruction; without one it is a question, sent
// with the page it was asked on so the server answers from what is on
// screen. A job is only in scope on the feed, where it is open beside the
// list; on the Resume page the open document is, and its id goes with the
// question. A tailored resume becomes a document there on request.
//
// History takes the conversation's place while it is open (see
// ChatHistory.jsx); a question on its way keeps going meanwhile.
export default function ChatPanelBody({ onClose, context, apply, request, draft }) {
  const cli = useProviders();
  const answerer = useChatAnswerer(cli.providers);
  const page = context.page ?? 'postings';
  const onResume = page === 'resume';
  const layout = useChatLayout({ docked: onResume });
  const runner = useAiRunner(cli.providers);
  const chat = useChat(runner);
  useChatWatcher();
  const scope = useChatScope();
  const openDoc = useOpenDocument();
  const onFeed = page === 'postings';
  const posting = onFeed ? scope.posting : null;
  const actions = useChatActions(posting, { runner, providers: cli.providers });
  const [target, setTarget] = useState(null);
  const [history, setHistory] = useState(false);
  const feedLinks = useChatFeedLinks({ onFeed, filters: context.filters, apply });
  const card = chatCard({ posting, actions, providers: cli.providers, target, setTarget, apply });

  // A reply target is one job's card; another job has no such card.
  useEffect(() => setTarget(null), [posting?.id]);

  // Words put in the box from elsewhere need the box on screen.
  useEffect(() => { if (draft) setHistory(false); }, [draft]);

  // "Ask AI about this job" from the pane, handled once however often this
  // panel mounts (see askAiSignal.js). It is about the chat, so History
  // makes way for it.
  useEffect(() => {
    if (!takeRequest(request)) return;
    setHistory(false);
    scope.focus(request.posting);
    if (request.action) actions.queue(request.posting.id, request.action);
  }, [request]); // eslint-disable-line react-hooks/exhaustive-deps

  function onSend(message) {
    actions.clearBlocked();
    if (target) return actions.refine(target, message);
    const where = { filters: context.filters, sort: context.sort, openPostingId: posting?.id ?? null, page };
    return chat.ask(message, onResume ? { ...where, documentId: openDoc?.id ?? null } : where);
  }

  const closeHistory = () => setHistory(false);
  const links = historyLinks({ chat, scope, feedLinks, onFeed, apply, close: closeHistory });
  const empty = { page, posting, loading: Boolean(posting) && actions.results === undefined, busy: runner.busy, onSend };

  return (
    <ChatFrame layout={layout}>
      <ChatHeader providers={cli.providers} answerer={answerer} layout={layout} history={history} onHistory={() => setHistory((now) => !now)} onNew={() => { closeHistory(); chat.startNew(); }} onClose={onClose} />
      {history ? <ChatHistory providers={cli.providers} links={links} /> : (
        <>
          {posting && <ChatScopeCard posting={posting} onClear={scope.clear} />}
          {onResume && openDoc && <ChatDocumentScope doc={openDoc} />}
          <ChatMessages entries={buildConversation(chat.turns, actions.results ?? [])} call={runner.call} empty={empty} card={card} onApply={feedLinks.onApply} onOpenRef={feedLinks.onOpenRef} />
          <ChatComposer cli={cli} scoped={Boolean(posting)} runner={runner} actions={actions} target={target} onClearTarget={() => setTarget(null)} onSend={onSend} draft={draft} />
        </>
      )}
    </ChatFrame>
  );
}

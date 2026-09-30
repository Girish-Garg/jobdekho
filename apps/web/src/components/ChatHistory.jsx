import { useState } from 'react';
import { listConversations, getMadeByAi } from '../api.js';
import { useHistoryList } from '../lib/useHistoryList.js';
import ChatHistoryTabs from './ChatHistoryTabs.jsx';
import ConversationList from './ConversationList.jsx';
import ConversationReader from './ConversationReader.jsx';
import MadeByAiList from './MadeByAiList.jsx';

// The chat's History, in place of the conversation while it is open, so
// whatever the AI made can be got back to: the conversations filed away with
// "New chat", and everything the AI made across them. `links` says where
// each way out goes (see lib/historyLinks.js).
//
// A profile change's row opens the conversation it was made in; the one on
// screen is simply the chat, so that one closes History instead.
export default function ChatHistory({ providers, links }) {
  const [tab, setTab] = useState('conversations');
  const [openId, setOpenId] = useState(null);
  const conversations = useHistoryList(listConversations);
  const made = useHistoryList(getMadeByAi);

  function openConversation(item) {
    if (item.current || !item.conversationId) links.onClose();
    else setOpenId(item.conversationId);
  }

  function deleted(id) {
    conversations.forget(id);
    setOpenId(null);
  }

  if (openId) {
    return <ConversationReader id={openId} providers={providers} links={links} onBack={() => setOpenId(null)} onDeleted={deleted} />;
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <ChatHistoryTabs tab={tab} onTab={setTab} onBack={links.onClose} />
      <div
        role="tabpanel"
        id={`chat-history-panel-${tab}`}
        aria-labelledby={`chat-history-tab-${tab}`}
        className="min-h-0 flex-1 overflow-y-auto px-2 py-2 [scrollbar-gutter:stable]"
      >
        {tab === 'conversations'
          ? <ConversationList list={conversations} onOpen={setOpenId} />
          : <MadeByAiList list={made} links={links} onOpenConversation={openConversation} />}
      </div>
    </div>
  );
}

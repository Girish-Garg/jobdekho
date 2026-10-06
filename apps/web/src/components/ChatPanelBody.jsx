import { useChatLayout } from '../lib/useChatLayout.js';
import { useChatPanel } from '../lib/useChatPanel.js';
import { newGeneralChat } from '../lib/useChatView.js';
import { buildConversation } from '../lib/conversation.js';
import { heldJob } from '../lib/chatHolds.js';
import ChatFrame from './ChatFrame.jsx';
import ChatHeader from './ChatHeader.jsx';
import ChatItems from './ChatItems.jsx';
import ChatMessages from './ChatMessages.jsx';
import ChatComposer from './ChatComposer.jsx';
import ChatBusyNote from './ChatBusyNote.jsx';

// The actual panel, split out of AiChatPanel.jsx so its hooks (reading the
// chat, probing for a CLI) only ever run while the panel is open. What it
// draws from is wired in lib/useChatPanel.js; this is the layout: the
// header with the switcher, the chips of what the chat holds, the
// conversation, and the box.
//
// Each chat shows only what is its own: its messages, the job's results
// asked for in it, the call running in it and the call it got no answer to.
// A call running in another chat shows here only as the note on Send.
export default function ChatPanelBody({ onClose, context, apply, request, draft }) {
  const panel = useChatPanel({ context, apply, request, draft });
  const { cli, page, active, store, chat, view, send, links } = panel;
  const layout = useChatLayout({ docked: page === 'resume' });
  const posting = heldJob(view);
  const missed = send.missed && { ...send.missed, onRecheck: cli.refresh, checking: cli.checking };
  const empty = { page, posting, kind: view?.kind, loading: panel.loading, busy: Boolean(store.busy) || !active.id, onSend: send.box.onSend };
  const note = send.elsewhere && (
    <ChatBusyNote busy={send.elsewhere} view={panel.busyView} cli={panel.cliName} onOpen={() => active.pick(send.elsewhere.chatId)} />
  );

  return (
    <ChatFrame layout={layout}>
      <ChatHeader
        view={view}
        providers={cli.providers}
        answerer={panel.answerer}
        signal={panel.signal}
        switcher={panel.switcher}
        active={active}
        layout={layout}
        onNew={newGeneralChat}
        onClose={onClose}
      />
      {view && (
        <ChatItems
          view={view}
          filters={context.filters}
          onOpenJob={links.onOpenRef}
          onOpenDocument={links.onOpenDocument}
          jobs={{ waitReason: panel.waitReason, onOpenChat: links.onOpenChat, onRun: (postingId, kind) => panel.job.start(postingId, kind, { askedIn: view.id }) }}
        />
      )}
      <ChatMessages
        entries={buildConversation(chat?.turns ?? [], chat?.results ?? [])}
        jobs={view?.jobs ?? []}
        call={send.here}
        missed={missed}
        dropped={Boolean(chat?.dropped)}
        empty={empty}
        card={panel.card}
        links={links}
      />
      <ChatComposer
        cli={cli}
        view={view}
        results={chat?.results}
        box={send.box}
        job={panel.job}
        target={panel.target}
        onClearTarget={() => panel.setTarget(null)}
        waitReason={panel.waitReason}
        note={note}
      />
    </ChatFrame>
  );
}

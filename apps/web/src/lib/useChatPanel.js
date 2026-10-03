import { useEffect, useState } from 'react';
import { useProviders } from './useProviders.js';
import { useChatAnswerer } from './useChatAnswerer.js';
import { useChatFeedLinks } from './useChatFeedLinks.js';
import { pageOf, realId, useChatStore, useChatWatcher } from './chatStore.js';
import { loadPending } from './chatPending.js';
import { busyText } from './chatNames.js';
import { chatCard } from './chatCard.js';
import { chatLinks } from './chatLinks.js';
import { useActiveChat } from './useActiveChat.js';
import { useChatView } from './useChatView.js';
import { useJobActions } from './useJobActions.js';
import { useChatSend } from './useChatSend.js';
import { usePaneRequest } from './usePaneRequest.js';
import { useChatSwitcher } from './useChatSwitcher.js';

// Everything the open panel draws from, wired in one place so the panel
// itself is only layout (see ChatPanelBody.jsx): the CLI that answers, the
// chat on screen and its page, its box, its job actions, the pane's ask,
// and why nothing can start while another chat's call runs.
export function useChatPanel({ context, apply, request, draft }) {
  const cli = useProviders();
  const answerer = useChatAnswerer(cli.providers);
  const page = context.page ?? 'postings';
  useChatWatcher();
  useEffect(() => { loadPending(); }, []);
  const active = useActiveChat(page);
  const store = useChatStore();
  const { page: chat, loading } = useChatView(active.id);
  const view = chat?.chat ?? null;
  const chatKey = realId(active.id, store);
  const job = useJobActions({ chatId: chatKey, providers: cli.providers });
  const [target, setTarget] = useState(null);
  const screen = { page, filters: context.filters, sort: context.sort };
  const send = useChatSend({ chatKey, view, store, screen, target, job });
  const feedLinks = useChatFeedLinks({ onFeed: page === 'postings', filters: context.filters, apply });

  // A reply target is one card in one chat; another chat has no such card.
  useEffect(() => setTarget(null), [chatKey]);

  // Words put in the box from elsewhere: "Add with AI" on the Profile page.
  useEffect(() => { if (draft) send.fillWith(draft); }, [draft]); // eslint-disable-line react-hooks/exhaustive-deps

  usePaneRequest(request, { chatId: active.id, pinned: active.pinned, start: job.start });

  const busyView = store.busy ? pageOf(store.busy.chatId, store)?.chat ?? null : null;
  const cliName = cli.providers?.find?.((p) => p.id === store.busy?.provider)?.label ?? answerer?.label ?? '';
  const waitReason = store.busy ? busyText(store.busy, busyView, cliName) : null;
  const card = chatCard({ job: view?.jobs?.[0], results: chat?.results, providers: cli.providers, target, setTarget, apply, start: job.start, waitReason });

  return {
    cli, answerer, page, active, store, chat, view, loading, job, target, setTarget, send, card, waitReason, busyView, cliName,
    links: chatLinks({ feedLinks, apply }),
    ...useChatSwitcher({ store, active, view }),
  };
}

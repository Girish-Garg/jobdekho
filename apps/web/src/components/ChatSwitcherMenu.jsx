import { useState } from 'react';
import Button from './ui/Button.jsx';
import Card from './ui/Card.jsx';
import Eyebrow from './ui/Eyebrow.jsx';
import ChatSwitcherRow from './ChatSwitcherRow.jsx';
import ChatConfirm from './ChatConfirm.jsx';
import { PlusIcon } from './Icon.jsx';

const KEEPS = 'Its messages go; saved letters, checks and documents stay.';

// The switcher's list, as picked from rendered option A: every chat,
// grouped (see chatGroups.js), the one on screen lit, then "New general
// chat", and for the chat on screen a way to clear it. Every chat is
// reached from here, an older general chat continued simply by opening it,
// so there is no second list of past conversations to go looking in. The
// list scrolls and its foot stays, so a new chat is never a scroll away.
// Its lower edge fades, since a list cut at a row's edge reads as the whole
// list; the empty strip under the last row keeps that row clear of the fade
// once scrolled to the end. `signalOf(view)` is { busy, unseen } for a row.
export default function ChatSwitcherMenu({ groups, current, signalOf, onPick, onNew, onClear, onDelete }) {
  const [clearing, setClearing] = useState(false);
  const clearable = current && !current.placeholder;

  return (
    <Card variant="pop" role="dialog" aria-label="Your chats" className="pop-in absolute left-2 right-2 top-full z-40 mt-1 flex max-h-[min(80vh,44rem)] flex-col p-2">
      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain pb-6 [mask-image:linear-gradient(to_bottom,black_calc(100%_-_1.5rem),transparent)]">
        {groups.map((group) => (
          <section key={group.key} aria-label={group.title} className="mb-1.5 border-b border-line pb-1.5 last:mb-0 last:border-b-0">
            <Eyebrow as="h3" className="px-2 pb-1 pt-2">{group.title}</Eyebrow>
            <ul className="flex flex-col gap-0.5">
              {group.rows.map((view) => (
                <ChatSwitcherRow key={view.id} view={view} current={view.id === current?.id} {...signalOf(view)} onPick={onPick} onDelete={onDelete} />
              ))}
            </ul>
          </section>
        ))}
      </div>
      <div className="shrink-0 border-t border-line pt-1.5">
        <button
          type="button"
          onClick={onNew}
          className="flex w-full items-center gap-2.5 rounded-xl px-2 py-2 text-left text-sm font-semibold text-primary transition-colors duration-fast ease hover:bg-primary/5"
        >
          <span aria-hidden="true" className="grid h-7 w-7 shrink-0 place-items-center rounded-lg border border-dashed border-edge text-muted">
            <PlusIcon size={12} />
          </span>
          New general chat
        </button>
        {clearable && (clearing ? (
          <ChatConfirm
            question={`Clear this chat? ${KEEPS}`}
            yes="Clear it"
            className="mt-1.5 rounded-xl bg-select/60 px-2 py-2"
            onYes={() => {
              setClearing(false);
              onClear(current);
            }}
            onNo={() => setClearing(false)}
          />
        ) : (
          <Button variant="ghost" size="sm" onClick={() => setClearing(true)} className="mt-1 w-full justify-start font-normal text-muted hover:text-ink">
            Clear this chat
          </Button>
        ))}
      </div>
    </Card>
  );
}

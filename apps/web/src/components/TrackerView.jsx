import { useState } from 'react';
import { useTracker } from '../lib/useTracker.js';
import { needsYou } from '../lib/trackerBoard.js';
import { startChatDraft } from '../lib/chatDraftSignal.js';
import { notifyError } from '../lib/toast.js';
import PageTitle from './ui/PageTitle.jsx';
import Button from './ui/Button.jsx';
import Card from './ui/Card.jsx';
import SearchField from './ui/SearchField.jsx';
import TrackerBoard from './TrackerBoard.jsx';
import TrackerDetail from './TrackerDetail.jsx';
import TrackerAddForm from './TrackerAddForm.jsx';
import { MailIcon, PlusIcon } from './Icon.jsx';

const EMPTY = 'Nothing tracked yet. Mark a posting Applied, add one you applied to elsewhere, or mail someone from the chat.';

const matches = (entry, q) => !q || `${entry.company} ${entry.role}`.toLowerCase().includes(q.toLowerCase());

// Every application and conversation the person keeps track of, from
// JobDekho or not (see the server's api/tracker.js), as a board of a fixed
// height with the open one laid over its edge (see TrackerBoard.jsx). Search
// and "Needs you" narrow the board; "Email someone" starts the request in
// the chat, where the mail is written and seen before it goes.
export default function TrackerView() {
  const { entries, error, add, update, remove } = useTracker();
  const [openId, setOpenId] = useState(null);
  const [adding, setAdding] = useState(false);
  const [q, setQ] = useState('');
  const [needOnly, setNeedOnly] = useState(false);
  const open = entries?.find((entry) => entry.id === openId) ?? null;
  const waiting = entries?.filter((entry) => needsYou(entry)).length ?? 0;
  const shown = (entries ?? []).filter((entry) => matches(entry, q) && (!needOnly || needsYou(entry)));
  const change = (id, patch) => update(id, patch).catch((err) => notifyError(err, 'Could not change it'));
  const drop = (id) => remove(id).then(() => setOpenId(null), (err) => notifyError(err, 'Could not remove it'));
  const panel = open && <TrackerDetail key={open.id} entry={open} onClose={() => setOpenId(null)} onUpdate={change} onRemove={drop} />;

  return (
    <section className="px-4 pb-10 pt-8">
      <div className="mx-auto flex w-full max-w-[88rem] flex-col gap-4">
        <div className="flex flex-wrap items-end gap-3">
          <div className="min-w-0">
            <PageTitle>Tracker</PageTitle>
            <p className="mt-0.5 text-sm text-muted">
              {entries ? `${entries.length} ${entries.length === 1 ? 'application' : 'applications'}, ${waiting} waiting on you` : 'Everything you applied to, in JobDekho or anywhere else.'}
            </p>
          </div>
          <div className="ml-auto flex flex-wrap gap-2">
            <Button onClick={() => setAdding(true)} disabled={adding}><PlusIcon size={14} />Add one</Button>
            <Button variant="primary" onClick={() => startChatDraft('Email ')}><MailIcon size={14} />Email someone</Button>
          </div>
        </div>

        {adding && (
          <Card variant="panel" className="sm:p-5">
            <TrackerAddForm
              onAdd={async (fields) => {
                await add(fields);
                setAdding(false);
              }}
              onCancel={() => setAdding(false)}
            />
          </Card>
        )}

        {entries === undefined && <p className="text-sm text-muted">Loading your Tracker...</p>}
        {entries === null && <p role="alert" className="text-sm text-ember">Your Tracker could not be read. {error}</p>}
        {entries?.length === 0 && !adding && <p className="text-sm text-muted">{EMPTY}</p>}
        {entries?.length > 0 && (
          <>
            <div className="flex flex-wrap items-center gap-2">
              <SearchField label="Find an application" placeholder="Find a company or role" value={q} onChange={(e) => setQ(e.target.value)} className="max-w-xs" />
              <Button variant={needOnly ? 'tint' : 'quiet'} aria-pressed={needOnly} onClick={() => setNeedOnly(!needOnly)}>
                {needOnly ? `Showing the ${waiting} that need you` : `Needs you, ${waiting}`}
              </Button>
              <span className="ml-auto hidden text-xs text-muted sm:inline">Drag a card to move it, or open it</span>
            </div>
            <TrackerBoard entries={shown} selectedId={openId} onOpen={(id) => setOpenId(id === openId ? null : id)} onMove={(id, stage) => change(id, { stage })} panel={panel} />
          </>
        )}
      </div>
    </section>
  );
}

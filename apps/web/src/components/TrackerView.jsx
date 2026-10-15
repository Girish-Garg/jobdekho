import { useState } from 'react';
import { useTracker } from '../lib/useTracker.js';
import { TABS, tabCount } from '../lib/trackerStages.js';
import { startChatDraft } from '../lib/chatDraftSignal.js';
import PageTitle from './ui/PageTitle.jsx';
import Button from './ui/Button.jsx';
import Card from './ui/Card.jsx';
import PillGroup from './PillGroup.jsx';
import TrackerRow from './TrackerRow.jsx';
import TrackerAddForm from './TrackerAddForm.jsx';
import { MailIcon, PlusIcon } from './Icon.jsx';

const EMPTY = 'Nothing tracked yet. Mark a posting Applied, add one you applied to elsewhere, or mail someone from the chat.';

function summary(entries) {
  const waiting = tabCount(entries, 'waiting');
  return `${entries.length} ${entries.length === 1 ? 'application' : 'applications'}, ${waiting} waiting on a reply`;
}

// Every application and conversation the person keeps track of, from
// JobDekho or not (see the server's api/tracker.js): what happened last,
// the stage, changed in place, and the tabs to see one stage at a time.
// "Email someone" starts the request in the chat, where the mail is
// written and seen before it goes.
export default function TrackerView() {
  const { entries, error, add, update, remove } = useTracker();
  const [tab, setTab] = useState('all');
  const [adding, setAdding] = useState(false);
  const shown = entries ? entries.filter(TABS.find((one) => one.key === tab).has) : [];
  const options = TABS.map((one) => [one.key, `${one.label} ${entries ? tabCount(entries, one.key) : ''}`.trim()]);

  return (
    <section className="px-4 pb-12 pt-8">
      <div className="mx-auto flex w-full max-w-[64rem] flex-col gap-5">
        <div className="flex flex-wrap items-end gap-3">
          <div className="min-w-0">
            <PageTitle>Tracker</PageTitle>
            <p className="mt-0.5 text-sm text-muted">{entries ? summary(entries) : 'Everything you applied to, in JobDekho or anywhere else.'}</p>
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

        <PillGroup options={options} selected={[tab]} onPick={setTab} />

        {entries === undefined && <p className="text-sm text-muted">Loading your Tracker...</p>}
        {entries === null && <p role="alert" className="text-sm text-ember">Your Tracker could not be read. {error}</p>}
        {entries && !shown.length && <p className="text-sm text-muted">{entries.length ? 'Nothing at this stage.' : EMPTY}</p>}
        {shown.length > 0 && (
          <Card as="ul" variant="list" aria-label="Your applications">
            {shown.map((entry) => <TrackerRow key={entry.id} entry={entry} onUpdate={update} onRemove={remove} />)}
          </Card>
        )}
      </div>
    </section>
  );
}

import { useState } from 'react';
import { usePopover } from '../lib/usePopover.js';
import { useAddItems } from '../lib/useAddItems.js';
import { changeItem, startComparison } from '../lib/chatChanges.js';
import Button from './ui/Button.jsx';
import Card from './ui/Card.jsx';
import SearchField from './ui/SearchField.jsx';
import AddItemList from './AddItemList.jsx';
import { CompareIcon, PlusIcon } from './Icon.jsx';

const jobRow = (job, onPick, picked) => ({ key: `job:${job.id}`, type: 'job', item: job, title: job.title, sub: job.company, picked, onPick });
const docRow = (doc, onPick) => ({
  key: `doc:${doc.id}`, type: 'document', item: doc, title: doc.name, sub: doc.kind === 'cover-letter' ? 'Cover letter' : 'Resume', onPick,
});

// "+ Add" under the header: jobs (the ones opened lately first, then the
// feed searched by what is typed) and the person's documents. Adding a job
// to a job's own chat starts a comparison of the two and puts it on screen
// (see chatChanges.js). A general chat holds no jobs, so it offers its
// documents and "Compare jobs", which needs two or more and makes a chat of
// its own. `onError` gets the server's sentence when it refused.
export default function AddItemPicker({ view, filters, onError }) {
  const { open, setOpen, ref } = usePopover();
  const [query, setQuery] = useState('');
  const [picked, setPicked] = useState(null);
  const held = { jobs: view.jobs.map((job) => job.id), documents: view.documents.map((doc) => doc.id) };
  const items = useAddItems({ open, query, filters, held });
  const general = view.kind === 'general';
  const choosing = Array.isArray(picked);

  async function run(act) {
    setOpen(false);
    setPicked(null);
    setQuery('');
    onError(await act());
  }
  const add = (type, id) => run(() => changeItem(view.id, { action: 'add', type, id }));
  const toggle = (id) => setPicked((now) => (now.includes(id) ? now.filter((one) => one !== id) : [...now, id]));
  const jobRows = (list) => list.map((job) => (choosing ? jobRow(job, () => toggle(job.id), picked.includes(job.id)) : jobRow(job, () => add('job', job.id))));
  const groups = [
    ...(!general || choosing ? [{ title: 'Opened lately', rows: jobRows(items.recent) }, { title: 'Jobs', rows: jobRows(items.found) }] : []),
    ...(choosing ? [] : [{ title: 'Your documents', rows: items.documents.map((doc) => docRow(doc, () => add('document', doc.id))) }]),
  ];

  return (
    <span ref={ref}>
      <Button size="sm" variant="ghost" aria-expanded={open} onClick={() => setOpen(!open)} className="rounded-full border border-dashed border-edge px-2.5 py-0.5 text-xs font-semibold text-muted hover:text-ink">
        <PlusIcon size={11} />
        Add
      </Button>
      {open && (
        <Card variant="pop" role="dialog" aria-label="Add to this chat" className="pop-in absolute left-2 right-2 top-full z-40 mt-1 max-h-[min(60vh,28rem)] overflow-y-auto overscroll-contain p-2">
          {(!general || choosing) && <SearchField autoFocus label="Search jobs" placeholder="Search jobs in your feed" value={query} onChange={(event) => setQuery(event.target.value)} className="block p-1" />}
          {general && !choosing && (
            <Button variant="tint" size="sm" onClick={() => setPicked([])} className="m-1">
              <CompareIcon size={13} />
              Compare jobs
            </Button>
          )}
          <AddItemList groups={groups} empty={items.reading ? 'Reading your documents...' : 'Nothing to add here yet. Search for a job by its title or company.'} />
          {choosing && (
            <div className="flex items-center justify-end gap-2 border-t border-line p-1 pt-2">
              <Button size="sm" variant="ghost" onClick={() => setPicked(null)}>Back</Button>
              <Button size="sm" variant="primary" disabled={picked.length < 2} onClick={() => run(() => startComparison(picked))}>
                {picked.length < 2 ? 'Pick two or more' : `Compare ${picked.length} jobs`}
              </Button>
            </div>
          )}
        </Card>
      )}
    </span>
  );
}

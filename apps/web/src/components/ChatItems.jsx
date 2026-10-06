import { useEffect, useState } from 'react';
import { changeItem } from '../lib/chatChanges.js';
import { chatOffers } from '../lib/chatHolds.js';
import { itemName } from '../lib/chatNames.js';
import { useOpenedLately } from '../lib/openedLately.js';
import ChatItemChip from './ChatItemChip.jsx';
import ChatOfferChip from './ChatOfferChip.jsx';
import AddItemPicker from './AddItemPicker.jsx';

// The chat's own job or document, the one it is found and named by.
function homeOf(view) {
  if (view.kind === 'job') return view.jobs[0]?.id;
  if (view.kind === 'document') return view.documents[0]?.id;
  return null;
}

// What a dotted pill's click does, said on its tooltip: a job offered to a
// job's chat starts a comparison of the two (see chatChanges.js).
const offerLabel = (view, one, name) => (view.kind === 'job' && one.type === 'job' ? `Compare this job with ${name}` : `Add ${name} to this chat`);

// What the chat holds, as chips under the header; then, dotted, what the
// person opened lately that it could take in one click (see
// lib/chatHolds.js); then "+ Add" for anything else. The AI is handed each
// chip whole with every question (see the server's
// chat/chat-items-context.js), so this row is also what the next answer
// will be about. Every chip has an x. The chat's own job or document is
// only left out by it, and stays first as a dotted pill that puts it back.
// A job in a comparison or a document's chat carries its own actions on
// its chip (`jobs`: { waitReason, onRun, onOpenChat }). A refusal (a limit
// reached, a job gone) is said under the row, in the server's own words.
export default function ChatItems({ view, filters, onOpenJob, onOpenDocument, jobs }) {
  const [problem, setProblem] = useState(null);
  const opened = useOpenedLately();
  const home = homeOf(view);

  useEffect(() => setProblem(null), [view.id]);

  async function change(action, type, id) {
    setProblem(await changeItem(view.id, { action, type, id }));
  }

  const menuFor = (job) => (view.kind === 'job' ? null : {
    waitReason: jobs.waitReason,
    onRun: (kind) => jobs.onRun(job.id, kind),
    onOpenChat: () => jobs.onOpenChat(`job:${job.id}`),
  });

  function chip(type, item, onOpen) {
    const own = item.id === home;
    const name = itemName(type, item);
    if (own && view.homeLeftOut) {
      return <ChatOfferChip key={`${type}:${item.id}`} type={type} item={item} name={name} label={`Add ${name} back to this chat`} onAdd={() => change('add', type, item.id)} />;
    }
    const menu = type === 'job' ? menuFor(item) : null;
    return <ChatItemChip key={`${type}:${item.id}`} type={type} item={item} home={own} menu={menu} onOpen={onOpen} onRemove={() => change('remove', type, item.id)} />;
  }

  return (
    <div className="relative shrink-0 border-b border-line px-3 py-2">
      <ul aria-label="In this chat" className="flex flex-wrap items-center gap-1.5">
        {view.jobs.map((job) => chip('job', job, () => onOpenJob(job.id)))}
        {view.documents.map((doc) => chip('document', doc, () => onOpenDocument(doc.id)))}
        {chatOffers(view, opened).map((one) => {
          const name = itemName(one.type, one);
          return <ChatOfferChip key={`offer:${one.type}:${one.id}`} type={one.type} item={one} name={name} label={offerLabel(view, one, name)} onAdd={() => change('add', one.type, one.id)} />;
        })}
        <li className="flex">
          <AddItemPicker view={view} filters={filters} onError={setProblem} />
        </li>
      </ul>
      {problem && <p role="alert" className="mt-1.5 text-xs text-ember">{problem}</p>}
    </div>
  );
}

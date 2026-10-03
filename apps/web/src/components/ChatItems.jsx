import { useEffect, useState } from 'react';
import { changeItem } from '../lib/chatChanges.js';
import ChatItemChip from './ChatItemChip.jsx';
import AddItemPicker from './AddItemPicker.jsx';

// The chat's own job or document, the one it cannot lose.
function homeOf(view) {
  if (view.kind === 'job') return view.jobs[0]?.id;
  if (view.kind === 'document') return view.documents[0]?.id;
  return null;
}

// What the chat holds, as chips under the header, and "+ Add" for more:
// the AI is handed each of them whole with every question (see the
// server's chat/chat-items-context.js), so this row is also what the next
// answer will be about. A job in a comparison or a document's chat carries
// its own actions on its chip (`jobs`: { waitReason, onRun, onOpenChat }).
// A refusal (a limit reached, a job gone) is said under the row, in the
// server's own words.
export default function ChatItems({ view, filters, onOpenJob, onOpenDocument, jobs }) {
  const [problem, setProblem] = useState(null);
  const home = homeOf(view);

  useEffect(() => setProblem(null), [view.id]);

  async function remove(type, id) {
    setProblem(await changeItem(view.id, { action: 'remove', type, id }));
  }

  const menuFor = (job) => (view.kind === 'job' ? null : {
    waitReason: jobs.waitReason,
    onRun: (kind) => jobs.onRun(job.id, kind),
    onOpenChat: () => jobs.onOpenChat(`job:${job.id}`),
  });

  return (
    <div className="relative shrink-0 border-b border-line px-3 py-2">
      <ul aria-label="In this chat" className="flex flex-wrap items-center gap-1.5">
        {view.jobs.map((job) => (
          <ChatItemChip key={job.id} type="job" item={job} home={job.id === home} menu={menuFor(job)} onOpen={() => onOpenJob(job.id)} onRemove={() => remove('job', job.id)} />
        ))}
        {view.documents.map((doc) => (
          <ChatItemChip key={doc.id} type="document" item={doc} home={doc.id === home} onOpen={() => onOpenDocument(doc.id)} onRemove={() => remove('document', doc.id)} />
        ))}
        <li className="flex">
          <AddItemPicker view={view} filters={filters} onError={setProblem} />
        </li>
      </ul>
      {problem && <p role="alert" className="mt-1.5 text-xs text-ember">{problem}</p>}
    </div>
  );
}

import { getMadeByAi } from '../api.js';
import { usePopover } from '../lib/usePopover.js';
import { useHistoryList } from '../lib/useHistoryList.js';
import { openChat } from '../lib/activeChat.js';
import { requestOpenDocument } from '../lib/openDocumentSignal.js';
import Button from './ui/Button.jsx';
import Card from './ui/Card.jsx';
import MadeByAiList from './MadeByAiList.jsx';
import { SparkleIcon } from './Icon.jsx';

// Where each row of the list goes from the Resume page: a job's results
// show in that job's own chat, opened in the panel beside the documents; a
// document opens here, in the workspace.
const LINKS = {
  onShowInChat: (item) => openChat(`job:${item.postingId}`),
  onOpenChat: (chatId) => openChat(chatId),
  onOpenDocument: (id) => requestOpenDocument(id),
};

// Read fresh each time it opens: it changes as the person works.
function MadeByAiPanel() {
  const made = useHistoryList(getMadeByAi);
  return <MadeByAiList list={made} links={LINKS} />;
}

// "Made by AI" at the foot of the documents: a way back to a letter, a
// tailoring or a check paid for weeks ago, without remembering which job it
// was on or which chat it came up in. It sits with the documents rather
// than in the chat because what it lists outlives every chat: clearing or
// deleting one takes none of it away.
export default function MadeByAiMenu() {
  const { open, setOpen, ref } = usePopover();
  return (
    <div ref={ref} className="relative">
      <Button variant="ghost" size="sm" aria-expanded={open} onClick={() => setOpen(!open)} className="w-full justify-start font-medium">
        <SparkleIcon size={13} className="text-primary" />
        Made by AI
      </Button>
      {open && (
        <Card variant="pop" role="dialog" aria-label="Made by AI" className="pop-in absolute bottom-full left-0 z-30 mb-2 max-h-[min(70vh,32rem)] w-[min(22rem,calc(100vw-2rem))] overflow-y-auto overscroll-contain p-2">
          <MadeByAiPanel />
        </Card>
      )}
    </div>
  );
}

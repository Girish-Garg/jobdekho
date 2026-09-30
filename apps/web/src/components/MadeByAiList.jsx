import MadeByAiRow from './MadeByAiRow.jsx';

// Everything the AI made for the person, newest first, across every job and
// conversation: cover letters, tailorings and checks, the documents it
// wrote or changed, and the profile changes applied from the chat (see the
// server's chat/made-by-ai.js). Each row leads back to where it lives.
export default function MadeByAiList({ list, links, onOpenConversation }) {
  if (list.items === undefined) return <p className="px-2 py-4 text-sm text-muted">Gathering what the AI made...</p>;
  if (list.failed) return <p className="px-2 py-4 text-sm text-muted">This list could not be read. Close History and open it again to retry.</p>;
  if (!list.items.length) {
    return (
      <p className="px-2 py-4 text-sm text-muted">
        Nothing yet. Cover letters, tailored resumes, job checks, documents and profile changes the AI makes for you will all be listed here.
      </p>
    );
  }
  return (
    <ul className="flex flex-col divide-y divide-line">
      {list.items.map((item, i) => (
        <MadeByAiRow key={`${item.kind}:${item.postingId ?? item.documentId ?? item.conversationId}:${item.at}:${i}`} item={item} links={links} onOpenConversation={onOpenConversation} />
      ))}
    </ul>
  );
}

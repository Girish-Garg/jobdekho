import MemoryChip from './MemoryChip.jsx';

// What the chat offered to remember from the person's message, one chip
// each, under the answer (see the server's chat/memory-turn.js). Nothing in
// them was kept without the person seeing it: a chip waits for Save, unless
// the message itself said "remember", and then it says so and offers Undo.
export default function MemoryChips({ items }) {
  return (
    <ul aria-label="Things to remember" className="flex flex-col gap-1.5">
      {items.map((memory, i) => (
        <li key={`${i}-${memory.text}`}>
          <MemoryChip memory={memory} />
        </li>
      ))}
    </ul>
  );
}

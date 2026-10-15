import { STAGE_WORD, when } from '../lib/trackerStages.js';

// An application's history, newest first: when, what, and the stage it
// reached when a line moved it. A dot marks each line; saffron for the ones
// read from the person's mail, so what JobDekho found stands apart from
// what they wrote themselves.
export default function TrackerTimeline({ events }) {
  const lines = [...(events ?? [])].reverse();
  if (!lines.length) return <p className="text-sm text-muted">Nothing recorded yet.</p>;
  return (
    <ol className="flex flex-col gap-2.5">
      {lines.map((event) => (
        <li key={event.id} className="grid grid-cols-[4.5rem_0.75rem_minmax(0,1fr)] items-start gap-2 text-sm">
          <span className="text-xs leading-5 text-muted">{when(event.at)}</span>
          <span aria-hidden="true" className={`mt-1.5 h-2 w-2 rounded-full ${event.from ? 'bg-primary' : 'bg-edge'}`} />
          <span className="min-w-0">
            <span className="text-ink">
              {event.stage && <span className="font-semibold">{STAGE_WORD[event.stage]}. </span>}
              {event.text}
            </span>
            {event.from && <span className="block text-xs text-muted">{event.from}</span>}
          </span>
        </li>
      ))}
    </ol>
  );
}

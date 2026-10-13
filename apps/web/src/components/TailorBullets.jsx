import { bulletIs, withBullet } from '../lib/tailorReview.js';
import Button from './ui/Button.jsx';

const Act = (props) => <Button size="sm" variant="ghost" className="shrink-0 px-2 py-0.5 text-xs" {...props} />;

// One line of an entry: the words that will print in ink (or greyed, when
// it is out of the resume), a quieter line under them, and what can be done
// about it on the right.
function Row({ text, under, out = false, children }) {
  return (
    <li className="flex items-start gap-2 py-1.5">
      <div className="min-w-0 flex-1">
        <p className={`text-sm ${out ? 'text-muted' : 'text-ink'}`}>{text}</p>
        {under && <p className="text-xs text-muted">{under}</p>}
      </div>
      <div className="flex shrink-0 gap-1">{children}</div>
    </li>
  );
}

// A bullet of the plan: reworded or kept as written, and in until the
// person cuts it. Where it was reworded, the other wording sits under the
// one that will print, so the choice is read before it is made.
function Kept({ entry, bullet, at, choices, onChange }) {
  const set = (field, on) => onChange(withBullet(choices, field, entry.id, at, on));
  if (bulletIs(choices, 'cut', entry.id, at)) {
    return <Row out text={bullet.now} under="Cut"><Act onClick={() => set('cut', false)}>Put back</Act></Row>;
  }
  const mine = Boolean(bullet.yours) && bulletIs(choices, 'mine', entry.id, at);
  const under = bullet.yours ? (mine ? `Reworded: ${bullet.now}` : `Yours: ${bullet.yours}`) : null;
  return (
    <Row text={mine ? bullet.yours : bullet.now} under={under}>
      {bullet.yours && <Act aria-pressed={mine} onClick={() => set('mine', !mine)}>{mine ? 'Use rewording' : 'Use mine'}</Act>}
      <Act onClick={() => set('cut', true)}>Cut</Act>
    </Row>
  );
}

// A bullet of the person's that the plan left out, one click from printing
// after all.
function Dropped({ entry, text, at, choices, onChange }) {
  const back = bulletIs(choices, 'back', entry.id, at);
  return (
    <Row out={!back} text={text} under={back ? 'Put back' : 'Left out by the tailoring'}>
      <Act aria-pressed={back} onClick={() => onChange(withBullet(choices, 'back', entry.id, at, !back))}>{back ? 'Leave out' : 'Put back'}</Act>
    </Row>
  );
}

// Every bullet of one entry the tailoring picked, all in view at once: what
// prints, what it was, and what was left out.
export default function TailorBullets({ entry, choices, onChange }) {
  return (
    <ul className="flex flex-col divide-y divide-line/60">
      {entry.bullets.map((bullet, at) => <Kept key={`k${at}`} entry={entry} bullet={bullet} at={at} choices={choices} onChange={onChange} />)}
      {entry.dropped.map((text, at) => <Dropped key={`d${at}`} entry={entry} text={text} at={at} choices={choices} onChange={onChange} />)}
    </ul>
  );
}

import PillGroup from './PillGroup.jsx';
import TextInput from './ui/TextInput.jsx';

const PICKS = [['0', 'Fresher'], ['1', '1'], ['2', '2'], ['3', '3'], ['4', '4'], ['5', '5+']];

// The usual answers one press away, and the box for an exact count past
// them: a person with eight years is not "5". Pressing the lit pill again
// clears it, since blank is an answer of its own: it says nothing, which
// rules nothing out, where 0 means a fresher.
export default function YearsField({ id, value, onChange }) {
  const lit = value == null ? [] : [String(Math.min(value, 5))];
  const pick = (picked) => onChange(lit[0] === picked ? null : Number(picked));

  return (
    <div className="flex flex-wrap items-center gap-2">
      <PillGroup options={PICKS} selected={lit} onPick={pick} />
      <TextInput
        id={id}
        type="number"
        min="0"
        max="50"
        value={value ?? ''}
        onChange={(event) => onChange(event.target.value === '' ? null : Number(event.target.value))}
        className="w-20"
      />
    </div>
  );
}

import Button from './ui/Button.jsx';

// Pill row shared by the single-select Status filter and the multi-select Level
// filter; the caller decides whether a pick toggles or replaces.
// The pick in a saffron tint, the same the active filter triggers wear: a
// solid saffron pill per group was the loudest thing in every menu. Its weight
// sets it apart too, so the others stay regular and a touch lighter.
const PICKED = 'border-primary/40';
const OTHER = 'font-normal text-ink/80 hover:text-ink';

export default function PillGroup({ options, selected, onPick }) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {options.map(([value, label]) => {
        const picked = selected.includes(value);
        return (
          <Button
            key={value}
            variant={picked ? 'tint' : 'quiet'}
            aria-pressed={picked}
            onClick={() => onPick(value)}
            className={`px-3 ${picked ? PICKED : OTHER}`}
          >
            {label}
          </Button>
        );
      })}
    </div>
  );
}

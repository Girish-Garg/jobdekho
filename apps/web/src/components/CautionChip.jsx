import { useId, useRef, useState } from 'react';
import CautionReasons from './CautionReasons.jsx';
import Card from './ui/Card.jsx';
import Chip from './ui/Chip.jsx';

// The feed's Caution chip, on a posting that states a red flag (the
// server's `caution`, see CautionReasons.jsx). Pointing at it shows the
// reasons; pressing it, by pointer, touch or keyboard, keeps them open, with
// each reason's evidence a further press away, and so does moving focus into
// them. Escape or moving on puts them away. A touch pointer only presses: a
// tap also reports a hover, which would open the reasons only for the press
// to close them again.
//
// Its presses stop here: in a row, a press on the chip is for its reasons,
// not for opening the job.
export default function CautionChip({ caution, align = 'end' }) {
  const id = useId();
  const hostRef = useRef(null);
  const [pinned, setPinned] = useState(false);
  const [hovered, setHovered] = useState(false);
  const [shut, setShut] = useState(false);
  const open = pinned || (hovered && !shut);

  function close() {
    setPinned(false);
    setShut(true);
  }

  function onKeyDown(event) {
    if (event.key !== 'Escape' || !open) return;
    event.stopPropagation();
    close();
    hostRef.current?.querySelector('button')?.focus();
  }

  return (
    <span
      ref={hostRef}
      className="relative inline-flex shrink-0"
      onPointerEnter={(event) => event.pointerType !== 'touch' && setHovered(true)}
      onPointerLeave={() => { setHovered(false); setShut(false); }}
      onBlur={(event) => !event.currentTarget.contains(event.relatedTarget) && setPinned(false)}
      onKeyDown={onKeyDown}
      onClick={(event) => event.stopPropagation()}
    >
      <Chip
        as="button"
        type="button"
        aria-expanded={open}
        aria-controls={id}
        onClick={() => (open ? close() : setPinned(true))}
        className="border border-ember/40 bg-ember/10 font-medium text-ember"
      >
        Caution
      </Chip>
      {open && (
        <span className={`absolute top-full z-20 pt-1.5 ${align === 'end' ? 'right-0' : 'left-0'}`}>
          <Card
            as="span"
            id={id}
            variant="pop"
            role="group"
            aria-label="Why this job needs caution"
            onFocus={() => setPinned(true)}
            className="pop-in block w-72 p-3.5 text-left font-normal normal-case tracking-normal"
          >
            <CautionReasons caution={caution} />
          </Card>
        </span>
      )}
    </span>
  );
}

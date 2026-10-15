import { useState } from 'react';
import { CLOSED, LANES, droppedStage } from '../lib/trackerBoard.js';
import TrackerLane from './TrackerLane.jsx';
import TrackerClosed from './TrackerClosed.jsx';

// The Tracker as a board of a fixed height: four lanes that scroll on their
// own and Closed folded to a strip (see lib/trackerBoard.js), so it fits the
// screen with six applications or sixty. Dropping a card on another lane
// moves its stage. `panel` is the open application, laid over the board's
// right edge rather than beside it, so opening one never squeezes the lanes.
export default function TrackerBoard({ entries, selectedId, onOpen, onMove, panel = null }) {
  const [draggingId, setDragging] = useState(null);
  const [overKey, setOver] = useState(null);
  const [closedOpen, setClosedOpen] = useState(false);
  const reset = () => {
    setDragging(null);
    setOver(null);
  };
  const drop = (lane) => {
    const entry = entries.find((one) => one.id === draggingId);
    const stage = entry ? droppedStage(entry, lane) : null;
    if (stage && stage !== entry.stage) onMove(entry.id, stage);
    reset();
  };
  const drag = {
    draggingId,
    overKey,
    open: onOpen,
    start: setDragging,
    end: reset,
    target: (lane) => ({
      onDragOver: (event) => {
        event.preventDefault();
        if (overKey !== lane.key) setOver(lane.key);
      },
      onDrop: (event) => {
        event.preventDefault();
        drop(lane);
      },
    }),
  };
  const of = (lane) => entries.filter((entry) => lane.stages.includes(entry.stage));

  return (
    <div className="relative">
      <div className="flex h-[clamp(26rem,calc(100vh-16rem),44rem)] gap-2.5 overflow-x-auto pb-1">
        {LANES.map((lane) => <TrackerLane key={lane.key} lane={lane} entries={of(lane)} selectedId={selectedId} drag={drag} />)}
        <TrackerClosed entries={of(CLOSED)} open={closedOpen} onToggle={() => setClosedOpen(!closedOpen)} selectedId={selectedId} drag={drag} />
      </div>
      {panel}
    </div>
  );
}

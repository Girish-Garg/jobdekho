import ProfileIndex from './ProfileIndex.jsx';
import Card from './ui/Card.jsx';

// The left rail at wide widths: the index of the record, then the resume
// card. The name moved to the hero card at the top of the record, where it
// is the page's heading. It sticks so the index stays in reach down a record
// that can hold a hundred projects; self-start is what lets a grid item
// stick at all, since a stretched one has nowhere to move.
export default function ProfileRail({ rows, current, onJump, children }) {
  return (
    <aside aria-label="Record index" className="sticky top-6 flex flex-col gap-5 self-start">
      <Card variant="rail">
        <ProfileIndex rows={rows} current={current} onJump={onJump} />
      </Card>
      {children}
    </aside>
  );
}

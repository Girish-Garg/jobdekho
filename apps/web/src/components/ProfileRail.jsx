import ProfileIndex from './ProfileIndex.jsx';

// The left rail at wide widths: who the record is about, the index, then
// the resume card. It sticks so the index stays in reach down a record
// that can hold a hundred projects; self-start is what lets a grid item
// stick at all, since a stretched one has nowhere to move.
export default function ProfileRail({ basics, rows, current, onJump, children }) {
  return (
    <aside aria-label="Record index" className="sticky top-8 flex flex-col gap-8 self-start">
      <div className="flex flex-col gap-0.5">
        <p className={`truncate font-display text-lg font-extrabold tracking-tight ${basics.name ? 'text-ink' : 'text-muted'}`}>
          {basics.name || 'Your name'}
        </p>
        {basics.headline && <p className="truncate text-sm text-muted">{basics.headline}</p>}
      </div>
      <ProfileIndex rows={rows} current={current} onJump={onJump} />
      {children}
    </aside>
  );
}

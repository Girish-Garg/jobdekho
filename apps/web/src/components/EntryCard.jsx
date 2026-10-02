import { useState } from 'react';
import TagInput from './TagInput.jsx';
import EntryHeader from './EntryHeader.jsx';
import EntryFields from './EntryFields.jsx';
import BulletLines from './BulletLines.jsx';
import LinkRows from './LinkRows.jsx';
import EntryFooter from './EntryFooter.jsx';
import { linksOf, withLinks } from '../lib/entryLinks.js';

// The kinds an entry's links are most often, one button each under them.
const QUICK = ['code', 'live', 'video', 'figma', 'drive', 'kaggle', 'photos', 'other'];

// One shape (title, organisation, dates, bullets, tech, links) covers a job,
// a project, a degree, a certification and an achievement, so this is the
// only place any of them gets edited; the section's entry in
// profileSections.js names its fields. A row by default, so a section with
// a hundred of these reads as a hundred lines, not a hundred open forms.
// Open, it is one column whose every row runs the panel's full width, so
// its right edge is straight whatever the section holds.
export default function EntryCard({ entry, meta, startOpen, isFirst, isLast, onChange, onRemove, onMove, onDuplicate }) {
  const [open, setOpen] = useState(startOpen);
  const links = linksOf(entry);
  const tech = entry.tech ?? [];

  return (
    <details className="group" open={open} onToggle={(event) => setOpen(event.currentTarget.open)}>
      <EntryHeader entry={entry} meta={meta} links={links} />
      <div className="mb-4 flex flex-col gap-4 rounded-xl border border-line bg-paper/60 p-4">
        <EntryFields entry={entry} meta={meta} onChange={onChange} />
        <BulletLines lines={entry.bullets} onChange={(bullets) => onChange({ ...entry, bullets })} />
        {(meta.tech !== false || tech.length > 0) && (
          <TagInput plain label="Tech" values={tech} onChange={(next) => onChange({ ...entry, tech: next })} />
        )}
        <LinkRows links={links} quick={QUICK} onChange={(next) => onChange(withLinks(entry, next))} />
        <EntryFooter
          pinned={entry.pinned}
          isFirst={isFirst}
          isLast={isLast}
          onPin={() => onChange({ ...entry, pinned: !entry.pinned })}
          onMove={onMove}
          onDuplicate={onDuplicate}
          onRemove={onRemove}
        />
      </div>
    </details>
  );
}

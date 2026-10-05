import Chip from './ui/Chip.jsx';

// What a review row does to the record, in the small capitals the "New
// today" chip uses: saffron for new, ink for a newer version of what is
// there, a hairline for the resume's version that is only different, not
// newer, and ember for a removal, the one state red is kept for.
// `children` words it otherwise in the same look (the picker's
// "Recommended").
const TAGS = {
  new: { text: 'New', tone: 'primary', className: 'bg-primary/15' },
  newer: { text: 'Newer', tone: 'quiet', className: 'bg-ink/10 text-ink' },
  changed: { text: 'Changed', tone: 'line', className: 'py-px' },
  remove: { text: 'Remove', tone: 'quiet', className: 'bg-ember/15 text-ember' },
};

export default function ReviewTag({ kind, children, className = '' }) {
  const tag = TAGS[kind] ?? TAGS.new;
  return (
    <Chip tone={tag.tone} className={`shrink-0 px-1.5 text-[10px] font-bold uppercase tracking-wide ${tag.className} ${className}`.trim()}>
      {children ?? tag.text}
    </Chip>
  );
}

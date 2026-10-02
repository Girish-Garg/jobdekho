import Button from './ui/Button.jsx';
import LinkKindIcon from './LinkKindIcon.jsx';
import { PlusIcon } from './Icon.jsx';
import { LINK_KIND_NAMES } from '../lib/linkKind.js';

// One press adds a row of that kind with the cursor in its address. A kind
// the list already has moves to the end in the quieter tone, still there
// for a second repository but out of the way of the kinds not yet added;
// "Other" stays last. `addLabel` is a single plain button instead, for a
// list whose links are mostly "other" (the basics' more links).
export default function LinkQuickAdd({ kinds = [], present, onAdd, firstRef, addLabel }) {
  if (addLabel) {
    return (
      <Button ref={firstRef} size="sm" onClick={() => onAdd('other')} className="self-start">
        <PlusIcon size={10} />
        {addLabel}
      </Button>
    );
  }
  const has = new Set(present);
  const named = kinds.filter((kind) => kind !== 'other');
  const order = [...named.filter((kind) => !has.has(kind)), ...named.filter((kind) => has.has(kind)), ...kinds.filter((kind) => kind === 'other')];
  return (
    <div className="flex flex-wrap gap-1.5">
      {order.map((kind, i) => (
        <Button
          key={kind}
          ref={i === 0 ? firstRef : undefined}
          size="sm"
          aria-label={`Add ${LINK_KIND_NAMES[kind]} link`}
          onClick={() => onAdd(kind)}
          className={`gap-1 px-2.5 ${has.has(kind) && kind !== 'other' ? 'text-muted' : ''}`}
        >
          <PlusIcon size={9} />
          <LinkKindIcon kind={kind} size={11} className="text-muted" />
          {LINK_KIND_NAMES[kind]}
        </Button>
      ))}
    </div>
  );
}

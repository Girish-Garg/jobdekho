import { useId } from 'react';
import LinkKindSelect from './LinkKindSelect.jsx';
import TextInput from './ui/TextInput.jsx';
import IconButton from './ui/IconButton.jsx';
import { CloseIcon } from './Icon.jsx';
import { kindFor } from '../lib/entryLinks.js';
import { linkName, webAddress } from '../lib/linkKind.js';

// One link as a row: its kind, its address, a label for the resume to
// print it under, and remove. The label's placeholder is the name it gets
// when left empty. On a phone the label drops under the address so neither
// is squeezed; from sm up the four sit on one line under their captions
// (see LinkRows.jsx). An address that is not a web address says so, since
// saving leaves it out.
export default function LinkRow({ link, index, addressRef, onChange, onRemove }) {
  const n = index + 1;
  const bad = link.url.trim() !== '' && !webAddress(link.url);
  const hintId = useId();
  return (
    <div className="grid grid-cols-[7rem_minmax(0,1fr)_1.75rem] items-center gap-2 sm:grid-cols-[7rem_minmax(0,3fr)_minmax(0,2fr)_1.75rem]">
      <LinkKindSelect kind={link.kind} label={`Link ${n} kind`} onChange={(kind) => onChange({ ...link, kind })} />
      <TextInput
        ref={addressRef}
        aria-label={`Link ${n} address`}
        aria-invalid={bad || undefined}
        aria-describedby={bad ? hintId : undefined}
        value={link.url}
        placeholder="Paste a link"
        onChange={(event) => onChange({ ...link, url: event.target.value, kind: kindFor(link, event.target.value) })}
        className="min-w-0 aria-[invalid=true]:border-ember/60"
      />
      <TextInput
        aria-label={`Link ${n} label, optional`}
        value={link.label}
        placeholder={linkName({ kind: link.kind })}
        onChange={(event) => onChange({ ...link, label: event.target.value })}
        className="order-last col-span-2 col-start-2 min-w-0 sm:order-none sm:col-span-1 sm:col-start-auto"
      />
      <IconButton tone="danger" label={`Remove link ${n}`} onClick={onRemove}>
        <CloseIcon size={11} />
      </IconButton>
      {bad && (
        <p id={hintId} className="order-last col-span-full text-xs text-ember">
          Not a web address, so saving leaves it out. Paste one like github.com/you/project.
        </p>
      )}
    </div>
  );
}

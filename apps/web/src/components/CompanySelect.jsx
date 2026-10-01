import { usePopover } from '../lib/usePopover.js';
import { useCompanyCounts } from '../lib/useCompanyCounts.js';
import { TRIGGER, triggerTone, TriggerFace } from './Dropdown.jsx';
import { BuildingIcon } from './Icon.jsx';
import CompanyMenu from './CompanyMenu.jsx';

// The jobs at one company, or a few. An include list, unlike the sources'
// exclude list, since here a person names the employers they want. One pick
// reads as its name on the trigger, more as how many.
export default function CompanySelect({ filters, onChange }) {
  const { open, setOpen, ref } = usePopover();
  const { list, failed } = useCompanyCounts(filters, open);
  const picked = filters.companies || [];
  let label = 'Company';
  if (picked.length === 1) label = <span className="block max-w-[11rem] truncate">{picked[0]}</span>;
  else if (picked.length > 1) label = `${picked.length} companies`;

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        aria-expanded={open}
        aria-label={picked.length ? `Company: ${picked.join(', ')}` : 'Company'}
        title="Show only the jobs at the companies you pick."
        className={`${TRIGGER} ${triggerTone(picked.length > 0, open)}`}
      >
        <TriggerFace icon={BuildingIcon} label={label} open={open} />
      </button>
      {open && <CompanyMenu list={list} failed={failed} picked={picked} onChange={onChange} />}
    </div>
  );
}

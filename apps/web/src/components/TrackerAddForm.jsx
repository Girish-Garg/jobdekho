import { useState } from 'react';
import Button from './ui/Button.jsx';
import TextInput from './ui/TextInput.jsx';
import Select from './Select.jsx';
import { Labelled } from './ProfileField.jsx';
import { STAGES, STAGE_WORD } from '../lib/trackerStages.js';

const today = () => new Date().toISOString().slice(0, 10);

// One application from anywhere, JobDekho or not: the company is all it
// needs, and the date is when it got to the stage picked.
export default function TrackerAddForm({ onAdd, onCancel }) {
  const [fields, setFields] = useState({ company: '', role: '', stage: 'applied', date: today(), email: '', note: '' });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const field = (key) => ({ value: fields[key], onChange: (e) => setFields({ ...fields, [key]: e.target.value }) });

  async function add(event) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const { email, ...rest } = fields;
      await onAdd({ ...rest, ...(email.trim() ? { contact: { email } } : {}) });
    } catch (err) {
      setError(err.message);
      setBusy(false);
    }
  }

  return (
    <form onSubmit={add} aria-label="Add to your Tracker" className="flex flex-col gap-3">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Labelled label="Company"><TextInput autoFocus {...field('company')} placeholder="Northwind" /></Labelled>
        <Labelled label="Role"><TextInput {...field('role')} placeholder="SDE intern" /></Labelled>
        <Labelled label="Stage">
          <Select block className="field" {...field('stage')}>
            {STAGES.map((stage) => <option key={stage} value={stage}>{STAGE_WORD[stage]}</option>)}
          </Select>
        </Labelled>
        <Labelled label="Since"><TextInput type="date" {...field('date')} /></Labelled>
        <Labelled label="Contact address, if any"><TextInput type="email" {...field('email')} placeholder="hr@northwind.example" autoComplete="off" /></Labelled>
        <Labelled label="Note"><TextInput {...field('note')} placeholder="Test due 17 Oct" /></Labelled>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <Button variant="primary" type="submit" disabled={busy || !fields.company.trim()}>{busy ? 'Adding...' : 'Add'}</Button>
        <Button onClick={onCancel} disabled={busy}>Cancel</Button>
      </div>
      {error && <p role="alert" className="text-sm text-ember">{error}</p>}
    </form>
  );
}

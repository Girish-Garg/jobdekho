import { useEffect, useState } from 'react';
import { getFilters, putFilters, getNotifications, putNotifications } from '../api.js';
import TagInput from './TagInput.jsx';
import NotifyForm from './NotifyForm.jsx';
import SaveBar from './SaveBar.jsx';

const F0 = { includeKeywords: [], excludeKeywords: [], locations: [] };
const N0 = { channel: 'none', telegramChatId: null, enabled: true };

export default function SettingsView() {
  const [filters, setFilters] = useState(F0);
  const [prefs, setPrefs] = useState(N0);

  useEffect(() => {
    getFilters().then((f) => setFilters({ ...F0, ...f })).catch(() => {});
    getNotifications().then((p) => setPrefs({ ...N0, ...p })).catch(() => {});
  }, []);

  const setF = (k) => (v) => setFilters({ ...filters, [k]: v });

  return (
    <section className="mx-auto max-w-3xl px-6 py-8">
      <h2 className="font-display text-2xl font-extrabold tracking-tight">Settings</h2>
      <p className="mt-1 font-mono text-xs text-muted">Tune what gets surfaced and how you hear about it.</p>

      <Block title="Filters" hint="Keywords and locations applied to the feed.">
        <TagInput label="Include keywords" values={filters.includeKeywords} onChange={setF('includeKeywords')} />
        <TagInput label="Exclude keywords" values={filters.excludeKeywords} onChange={setF('excludeKeywords')} />
        <TagInput label="Locations" values={filters.locations} onChange={setF('locations')} />
        <SaveBar onSave={() => putFilters(filters)} />
      </Block>

      <Block title="Notifications" hint="Where new matches are delivered.">
        <NotifyForm prefs={prefs} setPrefs={setPrefs} />
        <SaveBar onSave={() => putNotifications(prefs)} />
      </Block>
    </section>
  );
}

function Block({ title, hint, children }) {
  return (
    <div className="mt-10 border-t border-line pt-8">
      <h3 className="font-display text-lg font-bold tracking-tight">{title}</h3>
      <p className="mb-5 mt-1 text-sm text-muted">{hint}</p>
      <div className="flex flex-col gap-5">{children}</div>
    </div>
  );
}

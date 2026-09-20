import { useEffect, useState } from 'react';
import {
  getFilters, getNotifications, putNotifications, getProviders, getProviderPreference, putProviderPreference,
} from '../api.js';
import { mergeSave } from '../lib/savedFilters.js';
import ThemeChoice from './ThemeChoice.jsx';
import ProviderChoice from './ProviderChoice.jsx';
import ProviderStatus from './ProviderStatus.jsx';
import NotifyForm from './NotifyForm.jsx';
import AlertKeywords from './AlertKeywords.jsx';
import SaveBar from './SaveBar.jsx';

const F0 = { includeKeywords: [], excludeKeywords: [], locations: [] };
const N0 = { channel: 'none', telegramChatId: null, enabled: true };
const P0 = { provider: 'auto' };

export default function SettingsView() {
  const [filters, setFilters] = useState(F0);
  const [prefs, setPrefs] = useState(N0);
  const [pref, setPref] = useState(P0);
  const [providers, setProviders] = useState([]);

  useEffect(() => {
    getFilters().then((f) => setFilters({ ...F0, ...f })).catch(() => {});
    getNotifications().then((p) => setPrefs({ ...N0, ...p })).catch(() => {});
    getProviderPreference().then((p) => setPref({ ...P0, ...p })).catch(() => {});
    getProviders().then(setProviders).catch(() => {});
  }, []);

  const setF = (k) => (v) => setFilters({ ...filters, [k]: v });

  return (
    <section className="px-8 py-8">
      <h2 className="font-display text-xl font-extrabold tracking-tight">Settings</h2>

      <div className="mt-8 flex max-w-2xl flex-col gap-10">
        <Section title="Appearance" hint="How JobDekho looks on this device.">
          <ThemeChoice />
        </Section>

        <Section title="AI CLI" hint="Which CLI runs the AI actions on a job, when more than one is installed.">
          <ProviderChoice providers={providers} pref={pref.provider} onChange={(provider) => setPref({ provider })} />
          <ProviderStatus providers={providers} />
          <SaveBar onSave={() => putProviderPreference(pref)} />
        </Section>

        <Section title="Alerts" hint="Optional: a Telegram message when something new matches the keywords below. This is a local tool; the feed itself needs none of this.">
          <NotifyForm prefs={prefs} setPrefs={setPrefs} />
          <SaveBar onSave={() => putNotifications(prefs)} />
        </Section>

        <Section title="Alert keywords" hint="What narrows the alerts above, not a re-scrape: the feed below still shows every posting collected.">
          <AlertKeywords filters={filters} setFilter={setF} />
          <SaveBar onSave={() => mergeSave(pickKeywords(filters))} />
        </Section>
      </div>
    </section>
  );
}

// This surface owns only the keyword side; mergeSave carries the rest through.
function pickKeywords({ includeKeywords, excludeKeywords, locations }) {
  return { includeKeywords, excludeKeywords, locations };
}

function Section({ title, hint, children }) {
  return (
    <div className="border-t border-line pt-8">
      <h3 className="font-display text-lg font-bold tracking-tight">{title}</h3>
      <p className="mb-5 mt-1 text-sm text-muted">{hint}</p>
      <div className="flex flex-col gap-5">{children}</div>
    </div>
  );
}

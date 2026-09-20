import { useEffect, useState } from 'react';
import { getProviders, getProviderPreference, putProviderPreference } from '../api.js';
import ThemeChoice from './ThemeChoice.jsx';
import ProviderChoice from './ProviderChoice.jsx';
import ProviderStatus from './ProviderStatus.jsx';
import SaveBar from './SaveBar.jsx';

const P0 = { provider: 'auto' };

export default function SettingsView() {
  const [pref, setPref] = useState(P0);
  const [providers, setProviders] = useState([]);

  useEffect(() => {
    getProviderPreference().then((p) => setPref({ ...P0, ...p })).catch(() => {});
    getProviders().then(setProviders).catch(() => {});
  }, []);

  return (
    <section className="px-8 py-8">
      <h2 className="font-display text-xl font-extrabold tracking-tight">Settings</h2>

      <div className="mt-8 grid max-w-5xl grid-cols-1 items-start gap-6 min-[1100px]:grid-cols-2">
        <Section title="Appearance" hint="How JobDekho looks on this device.">
          <ThemeChoice />
        </Section>

        <Section title="AI CLI" hint="Which CLI runs the AI actions on a job, when more than one is installed.">
          <ProviderChoice providers={providers} pref={pref.provider} onChange={(provider) => setPref({ provider })} />
          <ProviderStatus providers={providers} />
          <SaveBar onSave={() => putProviderPreference(pref)} />
        </Section>
      </div>
    </section>
  );
}

// Each section is a bounded card rather than a strip in one long column, so
// the two of them can sit side by side once there is room for that.
function Section({ title, hint, children }) {
  return (
    <div className="rounded-lg border border-line bg-panel p-6">
      <h3 className="font-display text-lg font-bold tracking-tight">{title}</h3>
      <p className="mb-5 mt-1 max-w-md text-sm text-muted">{hint}</p>
      <div className="flex flex-col gap-5">{children}</div>
    </div>
  );
}

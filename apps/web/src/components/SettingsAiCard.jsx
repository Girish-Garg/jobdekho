import { useProviderSetting } from '../lib/useProviderSetting.js';
import { webSentence } from '../lib/providerStatus.js';
import ProviderChoice from './ProviderChoice.jsx';
import ModelChoice from './ModelChoice.jsx';
import SettingsCard from './SettingsCard.jsx';
import { CheckIcon, GlobeIcon, SparkleIcon } from './Icon.jsx';

const SAVED = {
  saving: <span className="text-xs text-muted">Saving...</span>,
  saved: <span className="inline-flex items-center gap-1 text-xs font-semibold text-applied"><CheckIcon size={12} /> Saved</span>,
  error: <span className="text-xs font-semibold text-ember">Not saved</span>,
};

// Which AI command-line tool does JobDekho's AI work, and with which model.
// Saved as it is picked, like every setting.
export default function SettingsAiCard() {
  const { provider, models, providers, saved, pick, pickModel } = useProviderSetting();
  // One model picker, for the AI picked; with none picked each answers with
  // its own saved model, so there is no one list to offer.
  const picked = providers.find((p) => p.id === provider);

  return (
    <SettingsCard
      icon={<SparkleIcon size={18} />}
      title="AI CLI"
      hint="The AI command-line tool that does JobDekho's AI work, on your own subscription or your own computer. Pick which one it asks first."
      note={<span aria-live="polite" className="shrink-0 pt-1">{SAVED[saved] ?? null}</span>}
    >
      <ProviderChoice providers={providers} pref={provider} onChange={pick} />
      {picked && <ModelChoice provider={picked} saved={models[picked.id]} onChange={(id) => pickModel(picked.id, id)} />}
      {provider === 'auto' && providers.length > 0 && (
        <p className="mt-4 text-xs text-muted">Each CLI then answers with its own saved model, or its default.</p>
      )}
      {providers.length > 0 && (
        <p className="mt-4 flex items-start gap-2 text-sm text-muted">
          <GlobeIcon size={14} className="mt-[3px] shrink-0 text-muted" />
          {webSentence(providers)}
        </p>
      )}
    </SettingsCard>
  );
}

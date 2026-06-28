const CHANNELS = ['none', 'telegram', 'email'];

// Notification preferences sub-form. Controlled by SettingsView.
export default function NotifyForm({ prefs, setPrefs }) {
  const set = (k, v) => setPrefs({ ...prefs, [k]: v });

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-2">
        <span className="font-mono text-[11px] uppercase tracking-[0.2em] text-muted">Channel</span>
        <div className="flex gap-1.5">
          {CHANNELS.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => set('channel', c)}
              className={`rounded-full border px-3 py-1.5 text-sm capitalize transition ${
                prefs.channel === c
                  ? 'border-ink bg-ink text-paper'
                  : 'border-line text-muted hover:border-ink hover:text-ink'
              }`}
            >
              {c}
            </button>
          ))}
        </div>
      </div>

      {prefs.channel === 'telegram' && (
        <TextField label="Telegram chat id" value={prefs.telegramChatId} onChange={(v) => set('telegramChatId', v)} />
      )}
      {prefs.channel === 'email' && (
        <TextField label="Email address" value={prefs.email} onChange={(v) => set('email', v)} />
      )}

      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={!!prefs.enabled}
          onChange={(e) => set('enabled', e.target.checked)}
          className="h-4 w-4 accent-ember"
        />
        Notifications enabled
      </label>
    </div>
  );
}

function TextField({ label, value, onChange }) {
  return (
    <label className="flex max-w-sm flex-col gap-2">
      <span className="font-mono text-[11px] uppercase tracking-[0.2em] text-muted">{label}</span>
      <input
        value={value || ''}
        onChange={(e) => onChange(e.target.value)}
        className="rounded-md border border-line bg-paper px-3 py-2 text-sm outline-none focus:border-ink"
      />
    </label>
  );
}

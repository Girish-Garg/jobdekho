// A model's size on disk the way `ollama list` prints it: decimal gigabytes
// to one place, megabytes for the small ones. Nothing for a size the server
// did not know, so the picker shows the name alone rather than "0 MB".
export function modelSize(bytes) {
  const n = Number(bytes);
  if (!Number.isFinite(n) || n <= 0) return '';
  if (n >= 1e9) return `${(n / 1e9).toFixed(1)} GB`;
  return `${Math.max(1, Math.round(n / 1e6))} MB`;
}

// A model pulled from a registry other than Ollama's carries its whole path
// ("hf.co/someone/Some-Model-GGUF:Q4_K_M"), which is too long for a pill.
// The last part names it; the full name stays in the pill's tooltip.
export function shortModelName(name) {
  return String(name ?? '').split('/').pop();
}

import { shortModelName } from './modelSize.js';
import { searchesWeb } from './providerStatus.js';

// The line under a model picker's title. A CLI's models run wherever that
// CLI sends them, and Default leaves the pick to it. A model on this
// computer keeps what is asked here, except the searches of a web question
// once it can search.
//
// A web question needs a model that uses tools (see the server's
// ai/ollama.js), so when the picked one does not, the line says which model
// the server answers those with instead: the first listed that does.
export function modelHint(provider, current) {
  const { label } = provider;
  if (!provider.local) return `Default leaves the choice to ${label}. The pick is used whenever ${label} answers.`;
  if (!searchesWeb(provider)) return `Runs on this computer, so what you ask never leaves it. It answers whenever ${label} does.`;
  const intro = 'Runs on this computer; only its web searches leave it.';
  const searcher = current?.tools === false ? (provider.models || []).find((m) => m.tools) : null;
  if (!searcher) return intro;
  return `${intro} ${shortModelName(current.label)} cannot search, so web questions use ${shortModelName(searcher.label)}.`;
}

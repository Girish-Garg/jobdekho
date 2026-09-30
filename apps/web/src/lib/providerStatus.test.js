import { describe, it, expect } from 'vitest';
import { providerState, searchesWeb, webSentence } from './providerStatus.js';

const CLAUDE = { id: 'claude', label: 'Claude Code', policies: ['none', 'web'], present: true, runs: true, version: '2.1.245', error: null };
const AGY = { id: 'agy', label: 'Antigravity', policies: ['none', 'web'], present: true, runs: true, version: '1.2.13', error: null };
const NO_WEB = { id: 'other', label: 'Other CLI', policies: ['none'], present: true, runs: true, version: '1.0', error: null };
const OLLAMA = { id: 'ollama', label: 'Ollama', policies: ['none'], present: true, runs: true, version: '0.32.12', error: null, models: [] };
const AGY_GATED = { ...AGY, runs: false, error: 'Antigravity is installed, but ... pre-approves tools' };
const CLAUDE_ABSENT = { ...CLAUDE, present: false, runs: false, version: null, error: null };

describe('providerState', () => {
  it('shows the version of a CLI that runs', () => {
    expect(providerState(CLAUDE)).toEqual({ tone: 'ready', text: '2.1.245' });
    expect(providerState({ ...CLAUDE, version: null })).toEqual({ tone: 'ready', text: 'installed' });
  });

  it('shows the detection error for one that is installed but stuck', () => {
    expect(providerState(AGY_GATED)).toEqual({ tone: 'stuck', text: AGY_GATED.error });
  });

  it('says not installed for one the probe never found', () => {
    expect(providerState(CLAUDE_ABSENT)).toEqual({ tone: 'missing', text: 'not installed' });
  });
});

describe('webSentence', () => {
  it('names, by label, which CLIs can run the fake check', () => {
    expect(webSentence([CLAUDE, AGY])).toBe('"Is this job real?" searches the web, which Claude Code and Antigravity can both do.');
  });

  it('names the one that cannot', () => {
    expect(webSentence([CLAUDE, NO_WEB])).toBe('"Is this job real?" searches the web, which Claude Code can do. Other CLI cannot.');
  });

  it('says so when nothing detected can search', () => {
    expect(webSentence([NO_WEB])).toMatch(/none of these can/);
  });

  // Ollama runs on this computer and has no web search to hand over.
  it('names Ollama as the one that cannot, beside both CLIs', () => {
    expect(webSentence([CLAUDE, AGY, OLLAMA])).toBe(
      '"Is this job real?" searches the web, which Claude Code and Antigravity can both do. Ollama cannot.',
    );
  });

  // Once its probe found it can search (signed in, a model that uses tools).
  it('counts Ollama among those that can once the providers endpoint says so', () => {
    expect(webSentence([CLAUDE, AGY, { ...OLLAMA, policies: ['none', 'web'] }])).toBe(
      '"Is this job real?" searches the web, which Claude Code, Antigravity and Ollama can all do.',
    );
  });

  it('reads right for three that can and two that cannot', () => {
    const third = { ...CLAUDE, id: 'third', label: 'Third CLI' };
    expect(webSentence([CLAUDE, AGY, third, OLLAMA, NO_WEB])).toBe(
      '"Is this job real?" searches the web, which Claude Code, Antigravity and Third CLI can all do. Neither Ollama nor Other CLI can.',
    );
  });

  it('reads a missing policy list as no web search', () => {
    expect(searchesWeb({ label: 'Bare' })).toBe(false);
    expect(searchesWeb(CLAUDE)).toBe(true);
  });
});

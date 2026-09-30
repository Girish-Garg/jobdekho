import { describe, it, expect } from 'vitest';
import { modelHint } from './modelHint.js';

const QWEN = { id: 'qwen3:8b', label: 'qwen3:8b', tools: true };
const GEMMA = { id: 'gemma:2b', label: 'gemma:2b', tools: false };
const OLLAMA = { id: 'ollama', label: 'Ollama', local: true, policies: ['none'], models: [GEMMA, QWEN] };
const SEARCHING = { ...OLLAMA, policies: ['none', 'web'] };

describe('modelHint', () => {
  it('leaves a CLI\'s pick to it by default', () => {
    expect(modelHint({ id: 'agy', label: 'Antigravity', policies: ['none', 'web'] }, { id: 'default' }))
      .toBe('Default leaves the choice to Antigravity. The pick is used whenever Antigravity answers.');
  });

  it('says a local model that cannot search keeps everything here', () => {
    expect(modelHint(OLLAMA, GEMMA)).toBe('Runs on this computer, so what you ask never leaves it. It answers whenever Ollama does.');
  });

  // Truthful once it can search: the searches are what leaves.
  it('says only the web searches leave, once it can search', () => {
    expect(modelHint(SEARCHING, QWEN)).toBe('Runs on this computer; only its web searches leave it.');
  });

  it('names the model web questions use when the picked one cannot search', () => {
    expect(modelHint(SEARCHING, GEMMA)).toBe('Runs on this computer; only its web searches leave it. gemma:2b cannot search, so web questions use qwen3:8b.');
  });
});

import { describe, it, expect } from 'vitest';
import { modelSize, shortModelName } from './modelSize.js';

describe('modelSize', () => {
  it('reads gigabytes the way ollama list does, to one place', () => {
    expect(modelSize(6547274849)).toBe('6.5 GB');
    expect(modelSize(5225388164)).toBe('5.2 GB');
    expect(modelSize(1e9)).toBe('1.0 GB');
  });

  it('reads a small model in megabytes', () => {
    expect(modelSize(274302450)).toBe('274 MB');
    expect(modelSize(1)).toBe('1 MB');
  });

  it('shows nothing for a size the server did not know', () => {
    expect(modelSize(null)).toBe('');
    expect(modelSize(0)).toBe('');
    expect(modelSize('lots')).toBe('');
  });
});

describe('shortModelName', () => {
  it('keeps the last part of a registry path, and a plain name as it is', () => {
    expect(shortModelName('hf.co/someone/Tiny-Model-GGUF:Q4_K_M')).toBe('Tiny-Model-GGUF:Q4_K_M');
    expect(shortModelName('llama3.2:3b')).toBe('llama3.2:3b');
    expect(shortModelName(undefined)).toBe('');
  });
});

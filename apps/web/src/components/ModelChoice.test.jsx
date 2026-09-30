import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import ModelChoice from './ModelChoice.jsx';

const OLLAMA = {
  id: 'ollama', label: 'Ollama', policies: ['none'], present: true, runs: true, version: '0.32.12', error: null,
  models: [
    { name: 'llama3.2:3b', size: 2019393189, contextLength: 131072 },
    { name: 'hf.co/someone/Tiny-Model-GGUF:Q4_K_M', size: 6547274849, contextLength: 1048576 },
  ],
};

describe('ModelChoice', () => {
  it('offers each installed model by name and size, in a group named for the provider', () => {
    render(<ModelChoice provider={OLLAMA} saved={null} onChange={() => {}} />);
    expect(screen.getByRole('radiogroup', { name: 'Ollama model' })).toBeInTheDocument();
    expect(screen.getByRole('radio', { name: 'llama3.2:3b, 2.0 GB' })).toBeInTheDocument();
    expect(screen.getByRole('radio', { name: 'hf.co/someone/Tiny-Model-GGUF:Q4_K_M, 6.5 GB' })).toBeInTheDocument();
  });

  // A long registry path is cut to its last part on the pill, whole in the tooltip.
  it('shows the last part of a long name, and the whole name on hover', () => {
    render(<ModelChoice provider={OLLAMA} saved={null} onChange={() => {}} />);
    const pill = screen.getByRole('radio', { name: /Tiny-Model/ });
    expect(pill).toHaveTextContent('Tiny-Model-GGUF:Q4_K_M');
    expect(pill).not.toHaveTextContent('hf.co');
    expect(pill).toHaveAttribute('title', 'hf.co/someone/Tiny-Model-GGUF:Q4_K_M');
  });

  it('marks the saved model picked', () => {
    render(<ModelChoice provider={OLLAMA} saved="hf.co/someone/Tiny-Model-GGUF:Q4_K_M" onChange={() => {}} />);
    expect(screen.getByRole('radio', { name: /Tiny-Model/ })).toHaveAttribute('aria-checked', 'true');
    expect(screen.getByRole('radio', { name: /llama3\.2/ })).toHaveAttribute('aria-checked', 'false');
  });

  // What the server will use: its first model when none is saved, or when
  // the saved one has been removed since.
  it('marks the first model picked when none is saved, or the saved one is gone', () => {
    const { unmount } = render(<ModelChoice provider={OLLAMA} saved={null} onChange={() => {}} />);
    expect(screen.getByRole('radio', { name: /llama3\.2/ })).toHaveAttribute('aria-checked', 'true');
    unmount();
    render(<ModelChoice provider={OLLAMA} saved="deleted:7b" onChange={() => {}} />);
    expect(screen.getByRole('radio', { name: /llama3\.2/ })).toHaveAttribute('aria-checked', 'true');
  });

  it('reports the picked model by its full name', () => {
    const onChange = vi.fn();
    render(<ModelChoice provider={OLLAMA} saved={null} onChange={onChange} />);
    fireEvent.click(screen.getByRole('radio', { name: /Tiny-Model/ }));
    expect(onChange).toHaveBeenCalledWith('hf.co/someone/Tiny-Model-GGUF:Q4_K_M');
  });

  it('shows nothing when there is no model to pick', () => {
    const { container } = render(<ModelChoice provider={{ ...OLLAMA, runs: false, models: [] }} saved={null} onChange={() => {}} />);
    expect(container).toBeEmptyDOMElement();
    render(<ModelChoice provider={{ id: 'ollama', label: 'Ollama' }} saved={null} onChange={() => {}} />);
    expect(screen.queryByRole('radiogroup')).not.toBeInTheDocument();
  });

  it('names a model without a known size alone', () => {
    render(<ModelChoice provider={{ ...OLLAMA, models: [{ name: 'mystery:1b', size: null }] }} saved={null} onChange={() => {}} />);
    expect(screen.getByRole('radio', { name: 'mystery:1b' })).toBeInTheDocument();
  });
});

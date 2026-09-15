import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import ProviderStatus from './ProviderStatus.jsx';

const CLAUDE = { id: 'claude', label: 'Claude Code', policies: ['none', 'web'], present: true, runs: true, version: '2.1.245', error: null };
const AGY = { id: 'agy', label: 'Antigravity', policies: ['none'], present: true, runs: true, version: '1.1.22', error: null };
const AGY_GATED = { ...AGY, runs: false, error: 'Antigravity is installed, but ... pre-approves tools' };
const CLAUDE_ABSENT = { ...CLAUDE, present: false, runs: false, version: null, error: null };

describe('ProviderStatus', () => {
  it('renders nothing before the providers list has loaded', () => {
    const { container } = render(<ProviderStatus providers={[]} />);
    expect(container).toBeEmptyDOMElement();
  });

  it('shows each detected CLI by label with its version', () => {
    render(<ProviderStatus providers={[CLAUDE, AGY]} />);
    expect(screen.getByText('Claude Code')).toBeInTheDocument();
    expect(screen.getByText('2.1.245')).toBeInTheDocument();
    expect(screen.getByText('Antigravity')).toBeInTheDocument();
    expect(screen.getByText('1.1.22')).toBeInTheDocument();
  });

  it('says not installed for one the probe never found', () => {
    render(<ProviderStatus providers={[CLAUDE_ABSENT]} />);
    expect(screen.getByText('not installed')).toBeInTheDocument();
  });

  it('shows the detection error for one that is installed but stuck', () => {
    render(<ProviderStatus providers={[AGY_GATED]} />);
    expect(screen.getByText(AGY_GATED.error)).toBeInTheDocument();
  });

  it('names, by label, which CLI the fake check needs, never a name typed in here', () => {
    render(<ProviderStatus providers={[CLAUDE, AGY]} />);
    expect(screen.getByText(/needs a CLI that can browse the web, so it only ever runs on Claude Code/)).toBeInTheDocument();
    expect(screen.getByText(/Antigravity cannot be given that/)).toBeInTheDocument();
  });

  it('says so when nothing detected can browse', () => {
    render(<ProviderStatus providers={[AGY]} />);
    expect(screen.getByText(/none of these can/)).toBeInTheDocument();
  });
});

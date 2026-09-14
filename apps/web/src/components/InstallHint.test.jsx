import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import InstallHint from './InstallHint.jsx';

const CLAUDE = {
  id: 'claude', label: 'Claude Code', install: 'https://claude.ai/code', policies: ['none', 'web'],
  present: false, path: null, runs: false, version: null, error: null,
};
const AGY = {
  id: 'agy', label: 'Antigravity', install: 'https://antigravity.google', policies: ['none'],
  present: false, path: null, runs: false, version: null, error: null,
};
const installed = (p) => ({ ...p, present: true, path: `C:\\${p.id}.exe`, runs: true, version: '1.0' });

const LIMIT = 'this action needs a CLI that can browse, and Antigravity\'s headless mode cannot be given '
  + 'web access without permanent allow-rules in its own config';

const hint = (over = {}) => render(
  <InstallHint intro="Intro." policies={['none']} providers={[CLAUDE, AGY]} checking={false} onRecheck={() => {}} {...over} />,
);

describe('InstallHint', () => {
  it('lists both CLIs with their install links in one sentence when neither is installed and either would do', () => {
    hint();
    expect(screen.getByText('Intro.')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'https://claude.ai/code' })).toHaveAttribute('href', 'https://claude.ai/code');
    expect(screen.getByRole('link', { name: 'https://antigravity.google' })).toHaveAttribute('href', 'https://antigravity.google');
    expect(screen.getByRole('link', { name: 'https://claude.ai/code' }).closest('p')).toHaveTextContent(
      'Install Claude Code from https://claude.ai/code or Antigravity from https://antigravity.google, then check again. '
      + 'If it is still not found, restart JobDekho so it picks up the new PATH.',
    );
    expect(screen.queryByText(/would not help/)).not.toBeInTheDocument();
  });

  // Only the fake check needs a browser, so only its hint explains the limit.
  it('for a web action, offers Claude Code alone and says why Antigravity would not help', () => {
    hint({ policies: ['web'] });
    expect(screen.getByRole('link', { name: 'https://claude.ai/code' })).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'https://antigravity.google' })).not.toBeInTheDocument();
    expect(screen.getByText(`Antigravity would not help here: ${LIMIT}.`)).toBeInTheDocument();
  });

  it('says Antigravity is installed but cannot take a web action, and what to install instead', () => {
    hint({ policies: ['web'], providers: [CLAUDE, installed(AGY)] });
    expect(screen.getByText(`Antigravity is installed, but ${LIMIT}.`)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'https://claude.ai/code' })).toBeInTheDocument();
  });

  it('shows the server sentence verbatim for a CLI that is installed but will not run or must not be used', () => {
    const gated = {
      ...installed(AGY), runs: false, version: null,
      error: 'Antigravity is installed, but C:\\settings.json pre-approves tools for every headless call '
        + '(read_file(*) under permissions.allow), so JobDekho will not hand it your resume. Remove those rules to use it here.',
    };
    hint({ providers: [CLAUDE, gated] });
    expect(screen.getByText(gated.error)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'https://claude.ai/code' })).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'https://antigravity.google' })).not.toBeInTheDocument();
  });

  it('says so when the list is empty, and offers the re-check either way', () => {
    const onRecheck = vi.fn();
    hint({ providers: [], onRecheck });
    expect(screen.getByRole('alert')).toHaveTextContent(/could not check/i);
    fireEvent.click(screen.getByRole('button', { name: 'Check again' }));
    expect(onRecheck).toHaveBeenCalled();
  });

  it('disables the re-check while one is running', () => {
    hint({ checking: true });
    expect(screen.getByRole('button', { name: 'Checking...' })).toBeDisabled();
  });
});

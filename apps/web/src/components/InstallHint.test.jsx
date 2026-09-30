import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import InstallHint from './InstallHint.jsx';

const CLAUDE = {
  id: 'claude', label: 'Claude Code', install: 'https://claude.ai/code', policies: ['none', 'web'],
  present: false, path: null, runs: false, version: null, error: null,
};
const AGY = {
  id: 'agy', label: 'Antigravity', install: 'https://antigravity.google', policies: ['none', 'web'],
  present: false, path: null, runs: false, version: null, error: null,
};
const installed = (p) => ({ ...p, present: true, path: `C:\\${p.id}.exe`, runs: true, version: '1.0' });

// A CLI that takes plain calls but cannot search, as a later one might.
const NO_WEB = { ...AGY, id: 'other', label: 'Other CLI', install: 'https://other.example', policies: ['none'] };

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

  // Both search, so a web action offers both, the same as a plain one.
  it('for a web action, offers both CLIs since either can search', () => {
    hint({ policies: ['web'] });
    expect(screen.getByRole('link', { name: 'https://claude.ai/code' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'https://antigravity.google' })).toBeInTheDocument();
    expect(screen.queryByText(/would not help/)).not.toBeInTheDocument();
  });

  it('offers only the CLIs that can take the action, and says the other would not help', () => {
    hint({ policies: ['web'], providers: [CLAUDE, NO_WEB] });
    expect(screen.getByRole('link', { name: 'https://claude.ai/code' })).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'https://other.example' })).not.toBeInTheDocument();
    expect(screen.getByText('Other CLI would not help here: it cannot take this action.')).toBeInTheDocument();
  });

  it('says an installed CLI cannot take the action, and what to install instead', () => {
    hint({ policies: ['web'], providers: [CLAUDE, installed(NO_WEB)] });
    expect(screen.getByText('Other CLI is installed, but it cannot take this action.')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'https://claude.ai/code' })).toBeInTheDocument();
  });

  // Ollama signed out: the server's line on how to let it search, in place
  // of the plain "cannot".
  it('says how to let an installed AI search, when the server knows how', () => {
    const webHint = 'Sign in with "ollama signin" in a terminal to let Ollama search the web; it needs a free ollama.com account.';
    const ollama = { ...installed(NO_WEB), id: 'ollama', label: 'Ollama', webHint };
    hint({ policies: ['web'], providers: [CLAUDE, ollama] });
    expect(screen.getByText(webHint)).toBeInTheDocument();
    expect(screen.queryByText('Ollama is installed, but it cannot take this action.')).not.toBeInTheDocument();
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

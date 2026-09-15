import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import ThemeToggle from './ThemeToggle.jsx';
import ThemeChoice from './ThemeChoice.jsx';
import { KEY, writeChoice } from '../lib/theme.js';

beforeEach(() => {
  localStorage.clear();
  document.documentElement.removeAttribute('data-theme');
});

describe('ThemeToggle', () => {
  // The bug this replaced: on a dark machine, one press in three changed
  // nothing on screen, because dark to system resolved back to dark.
  it('always changes the theme on screen, whatever the system prefers', () => {
    render(<ThemeToggle />);
    const before = document.documentElement.getAttribute('data-theme');
    fireEvent.click(screen.getByRole('button'));
    expect(document.documentElement.getAttribute('data-theme')).not.toBe(before);
    const after = document.documentElement.getAttribute('data-theme');
    fireEvent.click(screen.getByRole('button'));
    expect(document.documentElement.getAttribute('data-theme')).not.toBe(after);
  });

  it('says which way it will go, not which state it is in', () => {
    render(<ThemeToggle />);
    const label = screen.getByRole('button').getAttribute('aria-label');
    expect(label).toMatch(/^Switch to (light|dark) theme$/);
    fireEvent.click(screen.getByRole('button'));
    expect(screen.getByRole('button').getAttribute('aria-label')).not.toBe(label);
  });

  it('remembers the choice it made', () => {
    render(<ThemeToggle />);
    fireEvent.click(screen.getByRole('button'));
    expect(['light', 'dark']).toContain(localStorage.getItem(KEY));
  });

  it('follows a choice made somewhere else', () => {
    render(<ThemeToggle />);
    act(() => writeChoice('dark'));
    expect(screen.getByRole('button', { name: 'Switch to light theme' })).toBeInTheDocument();
  });
});

describe('ThemeChoice', () => {
  it('offers the three named choices and marks the current one', () => {
    render(<ThemeChoice />);
    expect(screen.getByRole('radio', { name: 'Follow my system' })).toHaveAttribute('aria-checked', 'true');
    fireEvent.click(screen.getByRole('radio', { name: 'Dark' }));
    expect(screen.getByRole('radio', { name: 'Dark' })).toHaveAttribute('aria-checked', 'true');
    expect(document.documentElement.getAttribute('data-theme')).toBe('dark');
    expect(localStorage.getItem(KEY)).toBe('dark');
  });
});

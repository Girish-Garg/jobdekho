import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import ThemeToggle from './ThemeToggle.jsx';
import { KEY } from '../lib/theme.js';

beforeEach(() => {
  localStorage.clear();
  document.documentElement.removeAttribute('data-theme');
});

describe('ThemeToggle', () => {
  it('starts on the system choice and says so', () => {
    render(<ThemeToggle />);
    expect(screen.getByRole('button', { name: /follows your system/i })).toBeInTheDocument();
  });

  it('cycles system, light, dark and back, marking the document and storing the choice', () => {
    render(<ThemeToggle />);
    fireEvent.click(screen.getByRole('button'));
    expect(screen.getByRole('button', { name: 'Theme: light' })).toBeInTheDocument();
    expect(localStorage.getItem(KEY)).toBe('light');
    expect(document.documentElement.hasAttribute('data-theme')).toBe(false);

    fireEvent.click(screen.getByRole('button'));
    expect(screen.getByRole('button', { name: 'Theme: dark' })).toBeInTheDocument();
    expect(document.documentElement.getAttribute('data-theme')).toBe('dark');

    fireEvent.click(screen.getByRole('button'));
    expect(screen.getByRole('button', { name: /follows your system/i })).toBeInTheDocument();
  });

  it('picks up a choice made in an earlier session', () => {
    localStorage.setItem(KEY, 'dark');
    render(<ThemeToggle />);
    expect(screen.getByRole('button', { name: 'Theme: dark' })).toBeInTheDocument();
    expect(document.documentElement.getAttribute('data-theme')).toBe('dark');
  });
});

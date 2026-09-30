import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import ThemePreview from './ThemePreview.jsx';

const themes = (container) => [...container.querySelectorAll('[data-theme]')].map((el) => el.getAttribute('data-theme'));

// The thumbnail sets its own data-theme, which is what makes it show that
// theme inside the other one (index.css answers to both values).
describe('ThemePreview', () => {
  it('draws one theme in its own tokens', () => {
    const { container } = render(<ThemePreview theme="dark" />);
    expect(themes(container)).toEqual(['dark']);
  });

  it('draws Follow my system as light and dark side by side', () => {
    const { container } = render(<ThemePreview theme="system" />);
    expect(themes(container)).toEqual(['light', 'dark']);
  });

  it('is hidden from a screen reader, which hears the choice by name', () => {
    const { container } = render(<ThemePreview theme="light" />);
    expect(container.firstChild).toHaveAttribute('aria-hidden', 'true');
  });
});

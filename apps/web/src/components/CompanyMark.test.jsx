import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import CompanyMark, { initials } from './CompanyMark.jsx';

describe('CompanyMark', () => {
  it('takes two letters from the name, skipping the legal tail', () => {
    expect(initials('PHONEPE LIMITED')).toBe('PH');
    expect(initials('Blue Yonder')).toBe('BY');
    expect(initials('Newtuple Technologies Pvt Ltd')).toBe('NE');
    expect(initials('')).toBe('?');
  });

  it('draws every company in the same neutral tile, hidden from screen readers', () => {
    const a = render(<CompanyMark company="Acme" />).container.firstChild;
    const b = render(<CompanyMark company="Zeta Labs" />).container.firstChild;
    expect(a.className).toBe(b.className);
    expect(a.className).toContain('bg-select');
    expect(a).toHaveAttribute('aria-hidden', 'true');
  });
});

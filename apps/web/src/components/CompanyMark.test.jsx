import { describe, it, expect } from 'vitest';
import { render, fireEvent } from '@testing-library/react';
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

// The logo comes from this computer's own server, never from its host, and a
// logo that will not load gives way to the initials.
describe('CompanyMark with a logo', () => {
  it("asks this server for the posting's logo", () => {
    const { container } = render(<CompanyMark company="Acme" size="sm" logoOf="p 1" />);
    expect(container.querySelector('img').getAttribute('src')).toBe('/api/postings/p%201/logo');
    expect(container.textContent).toBe('');
  });

  it('falls back to the initials when the logo fails', () => {
    const { container } = render(<CompanyMark company="Acme Labs" logoOf="p1" />);
    fireEvent.error(container.querySelector('img'));
    expect(container.querySelector('img')).toBeNull();
    expect(container.textContent).toBe('AL');
  });

  it('shows the initials where there is no logo at all', () => {
    const { container } = render(<CompanyMark company="Acme Labs" />);
    expect(container.querySelector('img')).toBeNull();
  });
});

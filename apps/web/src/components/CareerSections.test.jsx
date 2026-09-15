import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import CareerSections from './CareerSections.jsx';
import { EMPTY_PROFILE } from '../lib/emptyProfile.js';

describe('CareerSections', () => {
  it('renders basics and every entry and skill section from one profile', () => {
    render(<CareerSections profile={EMPTY_PROFILE} onChange={() => {}} />);
    expect(screen.getByRole('heading', { name: 'Basics' })).toBeInTheDocument();
    for (const name of ['Experience 0', 'Projects 0', 'Education 0', 'Certifications 0', 'Achievements 0', 'Skills 0']) {
      expect(screen.getByRole('heading', { name })).toBeInTheDocument();
    }
  });

  it('passes a change to one section through without touching the rest of the profile', () => {
    const onChange = vi.fn();
    render(<CareerSections profile={EMPTY_PROFILE} onChange={onChange} />);
    fireEvent.click(screen.getByRole('button', { name: 'Add role' }));
    const [sent] = onChange.mock.calls[0];
    expect(sent.experience).toHaveLength(1);
    expect(sent.projects).toEqual(EMPTY_PROFILE.projects);
    expect(sent.basics).toEqual(EMPTY_PROFILE.basics);
  });
});

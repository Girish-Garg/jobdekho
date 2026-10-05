import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import ProfileForm from './ProfileForm.jsx';

const P = {
  skills: ['react'], titles: ['frontend'], locations: ['pune'],
  years: 2, degree: 'bachelors', resumeName: null,
};

describe('ProfileForm', () => {
  // Tags are found by their text: the buttons sit inside TagInput's <label>,
  // so their accessible name is the field caption, not the tag value.
  it('shows every extracted field ready for hand edits', () => {
    render(<ProfileForm profile={P} onChange={() => {}} onSave={async () => {}} />);
    expect(screen.getByText('react')).toBeInTheDocument();
    expect(screen.getByText('frontend')).toBeInTheDocument();
    expect(screen.getByText('pune')).toBeInTheDocument();
    expect(screen.getByLabelText('Years of experience')).toHaveValue(2);
    expect(within(screen.getByRole('group', { name: 'Highest degree' })).getByRole('button', { name: "Bachelor's" })).toHaveAttribute('aria-pressed', 'true');
  });

  it('adds a skill through the tag input', () => {
    const onChange = vi.fn();
    render(<ProfileForm profile={P} onChange={onChange} onSave={async () => {}} />);
    const [skillBox] = screen.getAllByPlaceholderText('add...');
    fireEvent.change(skillBox, { target: { value: 'node' } });
    fireEvent.keyDown(skillBox, { key: 'Enter' });
    expect(onChange).toHaveBeenCalledWith({ ...P, skills: ['react', 'node'] });
  });

  it('removes a wrongly extracted skill on click', () => {
    const onChange = vi.fn();
    render(<ProfileForm profile={P} onChange={onChange} onSave={async () => {}} />);
    fireEvent.click(screen.getByText('react'));
    expect(onChange).toHaveBeenCalledWith({ ...P, skills: [] });
  });

  it('treats a cleared years box as unknown, not zero', () => {
    const onChange = vi.fn();
    render(<ProfileForm profile={P} onChange={onChange} onSave={async () => {}} />);
    fireEvent.change(screen.getByLabelText('Years of experience'), { target: { value: '' } });
    expect(onChange).toHaveBeenCalledWith({ ...P, years: null });
  });

  it('offers the profile degree ladder with no blank "any" rung, one press each', () => {
    const onChange = vi.fn();
    render(<ProfileForm profile={P} onChange={onChange} onSave={async () => {}} />);
    const ladder = within(screen.getByRole('group', { name: 'Highest degree' })).getAllByRole('button');
    expect(ladder.map((pill) => pill.textContent)).toEqual(['No degree', "Bachelor's", "Master's", 'PhD']);
    fireEvent.click(ladder[2]);
    expect(onChange).toHaveBeenCalledWith({ ...P, degree: 'masters' });
  });

  // The usual answers are one press away; a lit one pressed again clears to
  // unknown, and the box still takes an exact count past five.
  it('sets the years from a quick pick, clears it from the lit one, and lights 5+ for more', () => {
    const onChange = vi.fn();
    const { rerender } = render(<ProfileForm profile={P} onChange={onChange} onSave={async () => {}} />);
    fireEvent.click(screen.getByRole('button', { name: 'Fresher' }));
    expect(onChange).toHaveBeenLastCalledWith({ ...P, years: 0 });
    fireEvent.click(screen.getByRole('button', { name: '2' }));
    expect(onChange).toHaveBeenLastCalledWith({ ...P, years: null });
    rerender(<ProfileForm profile={{ ...P, years: 8 }} onChange={onChange} onSave={async () => {}} />);
    expect(screen.getByRole('button', { name: '5+' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByLabelText('Years of experience')).toHaveValue(8);
  });

  it('says under each field what the ranking does with it', () => {
    render(<ProfileForm profile={P} onChange={() => {}} onSave={async () => {}} />);
    expect(screen.getByText(/larger part of every score/)).toBeInTheDocument();
    expect(screen.getByText(/another city ranks a little lower/)).toBeInTheDocument();
  });

});

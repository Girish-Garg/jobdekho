import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
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
    expect(screen.getByLabelText('Highest degree')).toHaveValue('bachelors');
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

  it('offers the profile degree ladder with no blank "any" rung', () => {
    render(<ProfileForm profile={P} onChange={() => {}} onSave={async () => {}} />);
    const values = [...screen.getByLabelText('Highest degree').options].map((o) => o.value);
    expect(values).toEqual(['none', 'bachelors', 'masters', 'phd']);
  });

  it('saves through the save bar', async () => {
    const onSave = vi.fn(async () => {});
    render(<ProfileForm profile={P} onChange={() => {}} onSave={onSave} />);
    fireEvent.click(screen.getByRole('button', { name: 'Save profile' }));
    await waitFor(() => expect(onSave).toHaveBeenCalled());
  });
});

import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, within } from '@testing-library/react';
import ExtractedEntriesReview from './ExtractedEntriesReview.jsx';

const PROPOSED = {
  experience: [{ title: 'Backend Engineer', organisation: 'Acme' }],
  projects: [{ title: 'Side project', organisation: '' }],
  education: [],
};

describe('ExtractedEntriesReview', () => {
  it('renders nothing when there is nothing proposed', () => {
    const { container } = render(
      <ExtractedEntriesReview proposed={{ experience: [], projects: [], education: [] }} onAdd={() => {}} onDismiss={() => {}} />,
    );
    expect(container).toBeEmptyDOMElement();
  });

  it('lists every proposed entry, labelled by section, pre-checked', () => {
    render(<ExtractedEntriesReview proposed={PROPOSED} onAdd={() => {}} onDismiss={() => {}} />);
    expect(screen.getByText(/Backend Engineer at Acme/)).toBeInTheDocument();
    expect(screen.getByText(/Side project/)).toBeInTheDocument();
    expect(screen.getAllByRole('checkbox').every((box) => box.checked)).toBe(true);
  });

  it('says keep or discard beside each row as its box is toggled', () => {
    render(<ExtractedEntriesReview proposed={PROPOSED} onAdd={() => {}} onDismiss={() => {}} />);
    expect(screen.getAllByText('keep')).toHaveLength(2);
    fireEvent.click(screen.getAllByRole('checkbox')[1]);
    expect(screen.getAllByText('keep')).toHaveLength(1);
    expect(screen.getByText('discard')).toBeInTheDocument();
  });

  it('adds only the rows still checked, grouped back by section', () => {
    const onAdd = vi.fn();
    render(<ExtractedEntriesReview proposed={PROPOSED} onAdd={onAdd} onDismiss={() => {}} />);
    fireEvent.click(screen.getAllByRole('checkbox')[1]); // uncheck the project
    fireEvent.click(screen.getByRole('button', { name: 'Add selected' }));
    expect(onAdd).toHaveBeenCalledWith({
      experience: PROPOSED.experience, projects: [], education: [], certifications: [], achievements: [], skillGroups: [],
    });
  });

  it('disables adding once nothing is checked', () => {
    render(<ExtractedEntriesReview proposed={{ experience: [{ title: 'A' }], projects: [], education: [] }} onAdd={() => {}} onDismiss={() => {}} />);
    fireEvent.click(screen.getByRole('checkbox'));
    expect(screen.getByRole('button', { name: 'Add selected' })).toBeDisabled();
  });

  describe('the rest of the record', () => {
    const MORE = {
      experience: [],
      certifications: [{ title: 'Cloud Practitioner', organisation: 'Demo Cloud', link: 'https://demo.dev/cert' }],
      achievements: [{ title: 'First place', organisation: 'Demo Hackathon' }],
      skillGroups: [{ name: 'Languages', items: ['Rust', 'Go'] }],
    };
    const rowOf = (text) => screen.getByText(text).closest('label');

    it('lists certifications, achievements and skill groups, each labelled by its section', () => {
      render(<ExtractedEntriesReview proposed={MORE} onAdd={() => {}} onDismiss={() => {}} />);
      expect(screen.getByText(/found 3 entries/i)).toBeInTheDocument();
      expect(rowOf('Cloud Practitioner from Demo Cloud')).toHaveTextContent('Certifications');
      expect(rowOf('First place at Demo Hackathon')).toHaveTextContent('Achievements');
      expect(rowOf('Languages: Rust, Go')).toHaveTextContent('Skills');
      expect(screen.getAllByRole('checkbox').every((box) => box.checked)).toBe(true);
    });

    it('keeps and skips them like any other row', () => {
      const onAdd = vi.fn();
      render(<ExtractedEntriesReview proposed={MORE} onAdd={onAdd} onDismiss={() => {}} />);
      fireEvent.click(within(rowOf('First place at Demo Hackathon')).getByRole('checkbox'));
      expect(rowOf('First place at Demo Hackathon')).toHaveTextContent('discard');
      fireEvent.click(screen.getByRole('button', { name: 'Add selected' }));
      expect(onAdd).toHaveBeenCalledWith({
        experience: [], projects: [], education: [],
        certifications: MORE.certifications, achievements: [], skillGroups: MORE.skillGroups,
      });
    });

    it('names a skill group the resume left unnamed', () => {
      render(<ExtractedEntriesReview proposed={{ skillGroups: [{ name: '', items: ['Git'] }] }} onAdd={() => {}} onDismiss={() => {}} />);
      expect(screen.getByText('Skills: Git')).toBeInTheDocument();
    });
  });

  it('dismisses without adding anything', () => {
    const onAdd = vi.fn();
    const onDismiss = vi.fn();
    render(<ExtractedEntriesReview proposed={PROPOSED} onAdd={onAdd} onDismiss={onDismiss} />);
    fireEvent.click(screen.getByRole('button', { name: 'Dismiss' }));
    expect(onDismiss).toHaveBeenCalled();
    expect(onAdd).not.toHaveBeenCalled();
  });
});

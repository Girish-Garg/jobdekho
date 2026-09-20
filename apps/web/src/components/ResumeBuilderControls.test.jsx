import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import ResumeBuilderControls from './ResumeBuilderControls.jsx';

const PROFILE = {
  experience: [{ id: 'e1', title: 'Engineer', organisation: 'Acme' }],
  projects: [], education: [], certifications: [], achievements: [],
  skillGroups: [{ id: 'g1', name: 'Languages', items: ['JavaScript', 'Python'] }],
};

const TEMPLATES = [{ id: 'classic', name: 'Classic', description: 'Default.' }];

const selection = {
  template: 'classic',
  sections: { experience: ['e1'], projects: [], education: [], certifications: [], achievements: [], skillGroups: ['g1'] },
};

describe('ResumeBuilderControls', () => {
  it('renders the skill groups section with its items as the secondary text', () => {
    render(<ResumeBuilderControls profile={PROFILE} templates={TEMPLATES} selection={selection} onChange={() => {}} />);
    expect(screen.getByText('Skills')).toBeInTheDocument();
    expect(screen.getByText('Languages')).toBeInTheDocument();
    expect(screen.getByText('JavaScript, Python')).toBeInTheDocument();
  });

  it('unchecking a skill group updates only the skillGroups key, leaving other sections alone', () => {
    const onChange = vi.fn();
    render(<ResumeBuilderControls profile={PROFILE} templates={TEMPLATES} selection={selection} onChange={onChange} />);
    fireEvent.click(screen.getByRole('checkbox', { name: /Languages/ }));
    expect(onChange).toHaveBeenCalledWith({ ...selection, sections: { ...selection.sections, skillGroups: [] } });
  });

  it('labels an experience entry with its organisation', () => {
    render(<ResumeBuilderControls profile={PROFILE} templates={TEMPLATES} selection={selection} onChange={() => {}} />);
    expect(screen.getByText('at Acme')).toBeInTheDocument();
  });
});

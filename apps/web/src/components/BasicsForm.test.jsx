import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import BasicsForm from './BasicsForm.jsx';

const BASICS = { name: 'Jane Doe', headline: '', email: '', phone: '', location: '', links: { github: '', linkedin: '', portfolio: '' } };

describe('BasicsForm', () => {
  it('shows every basics and link field', () => {
    render(<BasicsForm basics={BASICS} onChange={() => {}} />);
    expect(screen.getByLabelText('Name')).toHaveValue('Jane Doe');
    expect(screen.getByLabelText('GitHub')).toBeInTheDocument();
    expect(screen.getByLabelText('LinkedIn')).toBeInTheDocument();
    expect(screen.getByLabelText('Portfolio')).toBeInTheDocument();
  });

  it('edits a plain field', () => {
    const onChange = vi.fn();
    render(<BasicsForm basics={BASICS} onChange={onChange} />);
    fireEvent.change(screen.getByLabelText('Headline'), { target: { value: 'Backend engineer' } });
    expect(onChange).toHaveBeenCalledWith({ ...BASICS, headline: 'Backend engineer' });
  });

  it('edits a link without disturbing the others', () => {
    const onChange = vi.fn();
    render(<BasicsForm basics={BASICS} onChange={onChange} />);
    fireEvent.change(screen.getByLabelText('GitHub'), { target: { value: 'github.com/jane' } });
    expect(onChange).toHaveBeenCalledWith({ ...BASICS, links: { ...BASICS.links, github: 'github.com/jane' } });
  });
});

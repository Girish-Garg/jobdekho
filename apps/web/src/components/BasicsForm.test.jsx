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

  it('keeps every other profile under More links, as rows that read their kind from the address', () => {
    const onChange = vi.fn();
    const kaggle = { kind: 'kaggle', url: 'https://www.kaggle.com/demo', label: '' };
    render(<BasicsForm basics={{ ...BASICS, moreLinks: [kaggle] }} onChange={onChange} />);
    expect(screen.getByRole('group', { name: 'More links' })).toBeInTheDocument();
    expect(screen.getByLabelText('Link 1 address')).toHaveValue(kaggle.url);
    fireEvent.click(screen.getByRole('button', { name: 'Add a link' }));
    expect(onChange).toHaveBeenLastCalledWith({ ...BASICS, moreLinks: [kaggle, { kind: 'other', url: '', label: '' }] });
    fireEvent.change(screen.getByLabelText('Link 1 address'), { target: { value: 'https://www.behance.net/demo' } });
    expect(onChange).toHaveBeenLastCalledWith({ ...BASICS, moreLinks: [{ ...kaggle, kind: 'design', url: 'https://www.behance.net/demo' }] });
  });

  it('starts More links empty for basics saved before the list existed', () => {
    render(<BasicsForm basics={BASICS} onChange={() => {}} />);
    expect(screen.queryByLabelText('Link 1 address')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Add a link' })).toBeInTheDocument();
  });
});

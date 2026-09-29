import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import ResumeBuilderSection from './ResumeBuilderSection.jsx';

const ENTRIES = [
  { id: 'a', primary: 'Role A', secondary: 'at Acme' },
  { id: 'b', primary: 'Role B', secondary: '' },
  { id: 'c', primary: 'Role C', secondary: 'at Globex' },
];

describe('ResumeBuilderSection', () => {
  it('renders nothing for a section with no entries at all', () => {
    const { container } = render(<ResumeBuilderSection title="Experience" entries={[]} selectedIds={[]} onChange={() => {}} />);
    expect(container).toBeEmptyDOMElement();
  });

  it('shows how many of the entries are currently included', () => {
    render(<ResumeBuilderSection title="Experience" entries={ENTRIES} selectedIds={['a', 'c']} onChange={() => {}} />);
    expect(screen.getByText('2 of 3 included')).toBeInTheDocument();
  });

  it('lists included entries first, in selection order, then the rest', () => {
    render(<ResumeBuilderSection title="Experience" entries={ENTRIES} selectedIds={['c', 'a']} onChange={() => {}} />);
    const rows = screen.getAllByRole('checkbox').map((box) => box.closest('div').textContent);
    expect(rows[0]).toContain('Role C');
    expect(rows[1]).toContain('Role A');
    expect(rows[2]).toContain('Role B');
  });

  it('checking an excluded entry appends it to the end of the selection', async () => {
    const onChange = vi.fn();
    render(<ResumeBuilderSection title="Experience" entries={ENTRIES} selectedIds={['a']} onChange={onChange} />);
    fireEvent.click(screen.getByRole('checkbox', { name: /Role B/ }));
    expect(onChange).toHaveBeenCalledWith(['a', 'b']);
  });

  it('unchecking an included entry removes only that one', async () => {
    const onChange = vi.fn();
    render(<ResumeBuilderSection title="Experience" entries={ENTRIES} selectedIds={['a', 'b', 'c']} onChange={onChange} />);
    fireEvent.click(screen.getByRole('checkbox', { name: /Role B/ }));
    expect(onChange).toHaveBeenCalledWith(['a', 'c']);
  });

  it('Up and Down swap an included entry with its neighbour', async () => {
    const onChange = vi.fn();
    render(<ResumeBuilderSection title="Experience" entries={ENTRIES} selectedIds={['a', 'b', 'c']} onChange={onChange} />);
    fireEvent.click(screen.getAllByRole('button', { name: 'Move down' })[0]);
    expect(onChange).toHaveBeenCalledWith(['b', 'a', 'c']);
  });

  it('disables Up on the first row and Down on the last row', () => {
    render(<ResumeBuilderSection title="Experience" entries={ENTRIES} selectedIds={['a', 'b']} onChange={() => {}} />);
    const ups = screen.getAllByRole('button', { name: 'Move up' });
    const downs = screen.getAllByRole('button', { name: 'Move down' });
    expect(ups[0]).toBeDisabled();
    expect(downs[1]).toBeDisabled();
  });
});

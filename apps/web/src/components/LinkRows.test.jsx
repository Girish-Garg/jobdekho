import { describe, it, expect, vi } from 'vitest';
import { useState } from 'react';
import { render, screen, fireEvent, within } from '@testing-library/react';
import LinkRows from './LinkRows.jsx';

const QUICK = ['code', 'live', 'video', 'figma', 'drive', 'kaggle', 'photos', 'other'];

function Rows({ initial = [], onLinks = () => {}, ...props }) {
  const [links, setLinks] = useState(initial);
  return <LinkRows links={links} quick={QUICK} onChange={(next) => { setLinks(next); onLinks(next); }} {...props} />;
}

const kind = (n) => screen.getByLabelText(`Link ${n} kind`);
const address = (n) => screen.getByLabelText(`Link ${n} address`);
const type = (box, value) => fireEvent.change(box, { target: { value } });

describe('LinkRows', () => {
  it('shows a row per link: its kind, address and label, the label hinting the name it prints as', () => {
    render(<Rows initial={[{ kind: 'video', url: 'https://youtu.be/x', label: '' }]} />);
    expect(screen.getByRole('group', { name: 'Links' })).toBeInTheDocument();
    expect(kind(1)).toHaveValue('video');
    expect(address(1)).toHaveValue('https://youtu.be/x');
    expect(screen.getByLabelText('Link 1 label, optional')).toHaveAttribute('placeholder', 'Video');
    expect(screen.getByRole('button', { name: 'Remove link 1' })).toBeInTheDocument();
  });

  it('adds a row of a kind from its button, with the cursor in the address', () => {
    render(<Rows />);
    fireEvent.click(screen.getByRole('button', { name: 'Add Video link' }));
    expect(kind(1)).toHaveValue('video');
    expect(address(1)).toHaveFocus();
  });

  it('reads the kind from an address typed or pasted, until one is picked by hand', () => {
    const onLinks = vi.fn();
    render(<Rows onLinks={onLinks} />);
    fireEvent.click(screen.getByRole('button', { name: 'Add Other link' }));
    type(address(1), 'https://github.com/demo/cli');
    expect(kind(1)).toHaveValue('code');
    type(address(1), 'https://demo.vercel.app');
    expect(kind(1)).toHaveValue('live');
    fireEvent.change(kind(1), { target: { value: 'drive' } });
    type(address(1), 'https://www.youtube.com/watch?v=x');
    expect(kind(1)).toHaveValue('drive');
    expect(onLinks).toHaveBeenLastCalledWith([{ kind: 'drive', url: 'https://www.youtube.com/watch?v=x', label: '' }]);
  });

  it('keeps a kind added from its own button whatever the address says', () => {
    render(<Rows />);
    fireEvent.click(screen.getByRole('button', { name: 'Add Video link' }));
    type(address(1), 'https://drive.google.com/file/d/abc');
    expect(kind(1)).toHaveValue('video');
  });

  it('moves a kind the list already has to the end of the buttons, before Other', () => {
    render(<Rows initial={[{ kind: 'code', url: 'https://github.com/x', label: '' }]} />);
    const names = within(screen.getByRole('group', { name: 'Links' })).getAllByRole('button', { name: /^Add / }).map((b) => b.textContent);
    expect(names).toEqual(['Live', 'Video', 'Figma', 'Drive', 'Kaggle', 'Photos', 'Code', 'Other']);
  });

  it('says when an address is not a web address, since saving leaves it out', () => {
    render(<Rows />);
    fireEvent.click(screen.getByRole('button', { name: 'Add Code link' }));
    type(address(1), 'my repo');
    expect(address(1)).toHaveAttribute('aria-invalid', 'true');
    expect(address(1)).toHaveAccessibleDescription(/Not a web address, so saving leaves it out/);
    type(address(1), 'github.com/demo/repo');
    expect(address(1)).not.toHaveAttribute('aria-invalid');
  });

  it('removes a row, handing the focus to the row before, or to the first button when none is left', () => {
    render(<Rows initial={[{ kind: 'code', url: 'https://github.com/x', label: '' }, { kind: 'live', url: 'https://x.dev', label: '' }]} />);
    fireEvent.click(screen.getByRole('button', { name: 'Remove link 2' }));
    expect(address(1)).toHaveFocus();
    fireEvent.click(screen.getByRole('button', { name: 'Remove link 1' }));
    expect(screen.queryByLabelText('Link 1 address')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Add Code link' })).toHaveFocus();
  });

  it('offers one plain add button where the list asks for one', () => {
    render(<Rows label="More links" addLabel="Add a link" />);
    fireEvent.click(screen.getByRole('button', { name: 'Add a link' }));
    expect(kind(1)).toHaveValue('other');
    expect(screen.queryByRole('button', { name: 'Add Code link' })).not.toBeInTheDocument();
  });
});

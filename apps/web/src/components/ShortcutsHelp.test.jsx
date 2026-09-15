import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import ShortcutsHelp from './ShortcutsHelp.jsx';

describe('ShortcutsHelp visibility', () => {
  it('renders nothing when closed', () => {
    render(<ShortcutsHelp open={false} onClose={() => {}} />);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('opens as a labelled, modal dialog', () => {
    render(<ShortcutsHelp open onClose={() => {}} />);
    const dialog = screen.getByRole('dialog');
    expect(dialog).toHaveAttribute('aria-modal', 'true');
    expect(dialog).toHaveAccessibleName('Keyboard shortcuts');
  });
});

describe('ShortcutsHelp content', () => {
  it('lists the global shortcuts the chrome owns', () => {
    render(<ShortcutsHelp open onClose={() => {}} />);
    expect(screen.getByText('Ctrl K / Cmd K')).toBeInTheDocument();
    expect(screen.getByText('Open the command palette')).toBeInTheDocument();
    expect(screen.getByText('Focus the search box')).toBeInTheDocument();
    expect(screen.getByText('Show this help')).toBeInTheDocument();
  });

  it('documents the feed keys without claiming to bind them', () => {
    render(<ShortcutsHelp open onClose={() => {}} />);
    expect(screen.getByText('Move to the next or previous posting')).toBeInTheDocument();
    expect(screen.getByText('Mark saved')).toBeInTheDocument();
    expect(screen.getByText('Mark applied')).toBeInTheDocument();
    expect(screen.getByText('Dismiss')).toBeInTheDocument();
    expect(screen.getByText('Undo the last status change')).toBeInTheDocument();
    expect(screen.getByText('Clear the selection')).toBeInTheDocument();
  });
});

describe('ShortcutsHelp closing', () => {
  it('closes on Escape', () => {
    const onClose = vi.fn();
    render(<ShortcutsHelp open onClose={onClose} />);
    fireEvent.keyDown(screen.getByRole('dialog'), { key: 'Escape' });
    expect(onClose).toHaveBeenCalled();
  });

  it('closes from its own close button', () => {
    const onClose = vi.fn();
    render(<ShortcutsHelp open onClose={onClose} />);
    fireEvent.click(screen.getByRole('button', { name: 'Close' }));
    expect(onClose).toHaveBeenCalled();
  });

  it('closes on a backdrop click but not on a click inside the dialog', () => {
    const onClose = vi.fn();
    render(<ShortcutsHelp open onClose={onClose} />);
    fireEvent.mouseDown(screen.getByRole('dialog'));
    expect(onClose).not.toHaveBeenCalled();
    fireEvent.mouseDown(screen.getByRole('dialog').parentElement);
    expect(onClose).toHaveBeenCalled();
  });
});

import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import PostingDialog from './PostingDialog.jsx';
import { onAskAboutPosting } from '../lib/askAiSignal.js';

// The detail view runs no AI itself (the chat does), so nothing here should
// reach the server; the mock only makes sure of that.
vi.mock('../api.js', () => ({
  getProviders: vi.fn(() => new Promise(() => {})),
  getPostingAiResults: vi.fn(() => new Promise(() => {})),
  runPostingAction: vi.fn(),
}));

const posting = {
  id: 'p1',
  source: 'internshala',
  company: 'Acme',
  title: 'Frontend Intern',
  location: 'Remote',
  url: 'https://example.com/p1',
  descriptionSnippet: 'Build the board.',
  stipend: 'Rs 20,000',
  duration: '6 Months',
  experience: 'Fresher',
  postedAt: new Date().toISOString(),
  firstSeenAt: new Date().toISOString(),
  status: null,
  level: 'internship',
  degreeMin: 'bachelors',
  degreeRequired: true,
};

function setup(over = {}) {
  const onClose = vi.fn();
  const onStatus = vi.fn();
  const view = render(
    <PostingDialog posting={{ ...posting, ...over }} onClose={onClose} onStatus={onStatus} />,
  );
  return { onClose, onStatus, ...view };
}

describe('PostingDialog semantics', () => {
  it('is a modal dialog named by the posting title', () => {
    setup();
    const dialog = screen.getByRole('dialog');
    expect(dialog).toHaveAttribute('aria-modal', 'true');
    expect(dialog).toHaveAccessibleName('Frontend Intern');
  });

  it('moves focus into the dialog on open', () => {
    setup();
    expect(screen.getByRole('dialog')).toHaveFocus();
  });

  it('locks background scroll while open and restores it on close', () => {
    const { unmount } = setup();
    expect(document.body.style.overflow).toBe('hidden');
    unmount();
    expect(document.body.style.overflow).toBe('');
  });
});

describe('PostingDialog detail', () => {
  it('shows the fields the card leaves out', () => {
    setup();
    expect(screen.getByText('Build the board.')).toBeInTheDocument();
    expect(screen.getByText('6 Months')).toBeInTheDocument();
    expect(screen.getByText("Bachelor's (required)")).toBeInTheDocument();
    expect(screen.getByText('internshala')).toBeInTheDocument();
    expect(screen.getByText('Rs 20,000')).toBeInTheDocument();
    expect(screen.getByText('Remote')).toBeInTheDocument();
  });

  it('softens the degree line when the degree is preferred rather than required', () => {
    setup({ degreeRequired: false });
    expect(screen.getByText("Bachelor's (preferred)")).toBeInTheDocument();
  });

  it('says so when no degree floor is recorded', () => {
    setup({ degreeMin: 'none' });
    expect(screen.getByText('None listed')).toBeInTheDocument();
  });

  it('links out to the posting', () => {
    setup();
    const link = screen.getByRole('link', { name: 'Open posting' });
    expect(link).toHaveAttribute('href', 'https://example.com/p1');
    expect(link).toHaveAttribute('target', '_blank');
  });

  it('drops rows the posting has no value for', () => {
    setup({ duration: null, stipend: null });
    expect(screen.queryByText('Duration')).not.toBeInTheDocument();
    expect(screen.queryByText('Stipend')).not.toBeInTheDocument();
  });

  // The card only calls out remote and hybrid, so onsite has to be readable
  // somewhere.
  it('spells out the work mode, onsite included', () => {
    setup({ location: 'Bengaluru', workMode: 'onsite' });
    expect(screen.getByText('Work mode')).toBeInTheDocument();
    expect(screen.getByText('Onsite')).toBeInTheDocument();
  });

  it('drops the work mode row when the posting was never classified', () => {
    setup({ workMode: undefined });
    expect(screen.queryByText('Work mode')).not.toBeInTheDocument();
  });
});

describe('PostingDialog closing', () => {
  it('closes on Escape', () => {
    const { onClose } = setup();
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(onClose).toHaveBeenCalled();
  });

  it('ignores other keys', () => {
    const { onClose } = setup();
    fireEvent.keyDown(document, { key: 'a' });
    expect(onClose).not.toHaveBeenCalled();
  });

  it('closes on a backdrop click', () => {
    const { onClose } = setup();
    fireEvent.click(screen.getByTestId('dialog-backdrop'));
    expect(onClose).toHaveBeenCalled();
  });

  it('stays open when the click lands inside the panel', () => {
    const { onClose } = setup();
    fireEvent.click(screen.getByRole('dialog'));
    expect(onClose).not.toHaveBeenCalled();
  });

  it('closes from the close button', () => {
    const { onClose } = setup();
    fireEvent.click(screen.getByRole('button', { name: 'Close' }));
    expect(onClose).toHaveBeenCalled();
  });
});

describe('PostingDialog actions', () => {
  it('reports the chosen status', () => {
    const { onStatus } = setup();
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));
    expect(onStatus).toHaveBeenCalledWith('p1', 'saved');
  });

  it('toggles a status back to null when it is already set', () => {
    const { onStatus } = setup({ status: 'applied' });
    fireEvent.click(screen.getByRole('button', { name: 'Applied' }));
    expect(onStatus).toHaveBeenCalledWith('p1', null);
  });

  // On a narrow screen the dialog covers the chat, so handing the job to the
  // chat has to close it or the person would see nothing happen.
  it('hands the job to the chat and gets out of its way', () => {
    const asked = vi.fn();
    const stop = onAskAboutPosting(asked);
    const { onClose } = setup();
    fireEvent.click(screen.getByRole('button', { name: 'Ask AI about this job' }));
    expect(asked).toHaveBeenCalledWith(expect.objectContaining({ posting: expect.objectContaining({ id: 'p1' }), action: null }));
    expect(onClose).toHaveBeenCalled();
    stop();
  });
});

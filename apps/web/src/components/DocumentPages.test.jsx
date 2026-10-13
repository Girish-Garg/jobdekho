import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import DocumentPages from './DocumentPages.jsx';
import { onChatDraft } from '../lib/chatDraftSignal.js';

describe('DocumentPages', () => {
  it('draws nothing until a PDF has been measured', () => {
    const { container } = render(<DocumentPages length={null} />);
    expect(container).toBeEmptyDOMElement();
  });

  it('says one page quietly, with nothing to fix', () => {
    render(<DocumentPages length={{ pages: 1, lastLines: 38 }} />);
    expect(screen.getByText('1 page')).toBeInTheDocument();
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });

  it('says a second page and about how much is on it, and puts the fix in the chat box', () => {
    const heard = vi.fn();
    const stop = onChatDraft(heard);
    render(<DocumentPages length={{ pages: 2, lastLines: 6 }} />);
    expect(screen.getByText('2 pages, about 6 lines over')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Ask the chat to fit this on one page' }));
    expect(heard).toHaveBeenCalledTimes(1);
    expect(heard.mock.calls[0][0].text).toBe('This runs to 2 pages, about 6 lines over. Make it fit on one page: cut the least useful lines first, and change no fact.');
    stop();
  });

  it('gives no line count for three pages or more', () => {
    render(<DocumentPages length={{ pages: 3, lastLines: 12 }} />);
    expect(screen.getByText('3 pages')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Ask the chat to fit this on one page' })).toBeInTheDocument();
  });
});

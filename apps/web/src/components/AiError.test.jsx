import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import AiError from './AiError.jsx';

const failing = (message, kind) => Object.assign(new Error(message), { kind });

describe('AiError', () => {
  it('renders nothing without an error', () => {
    const { container } = render(<AiError error={null} checking={false} onRecheck={() => {}} />);
    expect(container).toBeEmptyDOMElement();
  });

  it('shows the server sentence verbatim as an alert', () => {
    render(<AiError error={failing('Claude Code could not finish: rate limited. Try again.', 'failed')} onRecheck={() => {}} />);
    expect(screen.getByRole('alert')).toHaveTextContent('Claude Code could not finish: rate limited. Try again.');
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });

  it('offers the re-probe only when the CLI went missing', () => {
    const onRecheck = vi.fn();
    render(<AiError error={failing('Claude Code is not installed', 'not_found')} checking={false} onRecheck={onRecheck} />);
    fireEvent.click(screen.getByRole('button', { name: 'Check again' }));
    expect(onRecheck).toHaveBeenCalled();
  });

  it('holds the button while a probe is running', () => {
    render(<AiError error={failing('gone', 'not_found')} checking onRecheck={() => {}} />);
    expect(screen.getByRole('button', { name: 'Checking...' })).toBeDisabled();
  });
});

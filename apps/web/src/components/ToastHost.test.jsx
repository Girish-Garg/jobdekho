import { describe, it, expect, afterEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import ToastHost from './ToastHost.jsx';
import { notify } from '../lib/toast.js';

afterEach(() => {
  document.body.innerHTML = '';
});

describe('ToastHost', () => {
  it('takes no props and renders nothing until something is announced', () => {
    const { container } = render(<ToastHost />);
    expect(container).toBeEmptyDOMElement();
  });

  it('shows a notice once one is announced', () => {
    render(<ToastHost />);
    act(() => notify({ title: 'Could not save', detail: 'disk full', kind: 'error' }));
    expect(screen.getByText('Could not save')).toBeInTheDocument();
    expect(screen.getByText('disk full')).toBeInTheDocument();
  });

  it('stacks more than one at a time', () => {
    render(<ToastHost />);
    act(() => {
      notify({ title: 'First problem', kind: 'error' });
      notify({ title: 'Second problem', kind: 'error' });
    });
    expect(screen.getByText('First problem')).toBeInTheDocument();
    expect(screen.getByText('Second problem')).toBeInTheDocument();
  });

  it('removes a notice once its own dismiss button is clicked', () => {
    render(<ToastHost />);
    act(() => notify({ title: 'Gone soon', kind: 'error' }));
    fireEvent.click(screen.getByRole('button', { name: 'Dismiss' }));
    expect(screen.queryByText('Gone soon')).not.toBeInTheDocument();
  });
});

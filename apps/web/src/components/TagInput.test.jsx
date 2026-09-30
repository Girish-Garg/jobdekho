import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import TagInput from './TagInput.jsx';

const setup = (values = ['react', 'node']) => {
  const onChange = vi.fn();
  render(<TagInput plain label="Skills" values={values} onChange={onChange} />);
  return onChange;
};

describe('TagInput', () => {
  // The caption names the text box, not the first chip: a <label> around
  // the whole field used to forward hover and clicks to the first chip.
  it('labels the text box with the caption, even when chips come first', () => {
    setup();
    expect(screen.getByLabelText('Skills')).toBe(screen.getByPlaceholderText('add...'));
  });

  it('leaves every chip alone when the caption is clicked', () => {
    const onChange = setup();
    fireEvent.click(screen.getByText('Skills'));
    expect(onChange).not.toHaveBeenCalled();
    expect(screen.getByRole('button', { name: 'Remove react' })).toBeInTheDocument();
  });

  it('puts the cursor in the box when the empty part of the well is pressed', () => {
    setup();
    const input = screen.getByPlaceholderText('add...');
    fireEvent.mouseDown(input.parentElement);
    expect(input).toHaveFocus();
  });

  it('removes the chip that is clicked, and only that one', () => {
    const onChange = setup();
    fireEvent.click(screen.getByRole('button', { name: 'Remove node' }));
    expect(onChange).toHaveBeenCalledWith(['react']);
  });

  it('adds on Enter or a comma, skipping one it already has', () => {
    const onChange = setup();
    const input = screen.getByPlaceholderText('add...');
    fireEvent.change(input, { target: { value: 'python' } });
    fireEvent.keyDown(input, { key: 'Enter' });
    expect(onChange).toHaveBeenLastCalledWith(['react', 'node', 'python']);
    fireEvent.change(input, { target: { value: 'react' } });
    fireEvent.keyDown(input, { key: ',' });
    expect(onChange).toHaveBeenCalledTimes(1);
  });
});

import { describe, it, expect, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import StepSlider from './StepSlider.jsx';

const STEPS = [['', 'Any'], ['1', 'Paid only'], ['10000', 'Rs 10k+']];

describe('StepSlider', () => {
  it('sits on the step holding the value and says it in words', () => {
    render(<StepSlider label="Pay" steps={STEPS} value="1" onChange={() => {}} />);
    const slider = screen.getByLabelText('Pay');
    expect(slider).toHaveValue('1');
    expect(slider).toHaveAttribute('aria-valuetext', 'Paid only');
    expect(screen.getByText('Paid only')).toBeInTheDocument();
  });

  it('reports the value of the step it moved to, not its position', () => {
    const onChange = vi.fn();
    render(<StepSlider label="Pay" steps={STEPS} value="" onChange={onChange} />);
    fireEvent.change(screen.getByLabelText('Pay'), { target: { value: '2' } });
    expect(onChange).toHaveBeenCalledWith('10000');
  });

  // A value no step holds (a chat turn from before the steps changed) sits
  // at the first step rather than breaking the control.
  it('falls back to the first step for a value it does not know', () => {
    render(<StepSlider label="Pay" steps={STEPS} value="7777" onChange={() => {}} />);
    expect(screen.getByLabelText('Pay')).toHaveAttribute('aria-valuetext', 'Any');
  });

  it('fills the track up to the thumb and labels the two ends', () => {
    render(<StepSlider label="Pay" steps={STEPS} value="1" onChange={() => {}} ends={['Any', 'Most']} />);
    expect(screen.getByLabelText('Pay').style.getPropertyValue('--fill')).toBe('50%');
    expect(screen.getByText('Most')).toBeInTheDocument();
  });

  // A floor lets through everything above it, so its fill runs from the
  // right: at Any the whole track is in, at the top step none of it.
  it('fills a floor from the right end', () => {
    render(<StepSlider label="Pay" steps={STEPS} value="10000" onChange={() => {}} fill="end" />);
    const slider = screen.getByLabelText('Pay');
    expect(slider.style.getPropertyValue('--fill')).toBe('0%');
    expect(slider.style.getPropertyValue('--from')).toBe('to left');
  });
});

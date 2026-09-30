import { describe, it, expect } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import Dropdown from './Dropdown.jsx';
import { TargetIcon } from './Icon.jsx';

describe('Dropdown', () => {
  // The badge only shows the count; the name has to say it too.
  it('shows the count as a badge and keeps it in the accessible name', () => {
    render(<Dropdown label="Level" icon={TargetIcon} count={2}><p>choices</p></Dropdown>);
    const trigger = screen.getByRole('button', { name: 'Level (2)' });
    expect(trigger).toHaveTextContent('Level2');
  });

  it('opens with its one-line hint over the choices, and closes on Escape', () => {
    render(<Dropdown label="Level" title="Seniority. Pick any number."><p>choices</p></Dropdown>);
    fireEvent.click(screen.getByRole('button', { name: 'Level' }));
    expect(screen.getByText('Seniority. Pick any number.')).toBeInTheDocument();
    expect(screen.getByText('choices')).toBeInTheDocument();
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(screen.queryByText('choices')).not.toBeInTheDocument();
  });

  it('shows no hint line when none is given', () => {
    const { container } = render(<Dropdown label="More filters"><p>choices</p></Dropdown>);
    fireEvent.click(screen.getByRole('button', { name: 'More filters' }));
    expect(container.querySelectorAll('p')).toHaveLength(1);
  });
});

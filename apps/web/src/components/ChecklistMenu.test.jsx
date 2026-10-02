import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import ChecklistMenu from './ChecklistMenu.jsx';

const row = (over = {}) => ({ id: 'okta', title: 'Okta', count: 156, checked: false, onToggle: () => {}, ...over });

function setup(props = {}) {
  const onQuery = vi.fn();
  const view = render(
    <ChecklistMenu label="Search things" placeholder="Search 2 things" query="" onQuery={onQuery} rows={[]} {...props} />,
  );
  return { onQuery, ...view };
}

describe('ChecklistMenu search', () => {
  it('opens ready to type, the box named by its label rather than its placeholder', () => {
    setup();
    const box = screen.getByRole('textbox', { name: 'Search things' });
    expect(box).toHaveFocus();
    expect(box).toHaveAttribute('placeholder', 'Search 2 things');
  });

  it('hands what is typed, and every key pressed in the box, to the menu that owns them', () => {
    const onKeyDown = vi.fn();
    const { onQuery } = setup({ onKeyDown });
    const box = screen.getByRole('textbox', { name: 'Search things' });
    fireEvent.change(box, { target: { value: 'ok' } });
    expect(onQuery).toHaveBeenCalledWith('ok');
    fireEvent.keyDown(box, { key: 'Enter' });
    expect(onKeyDown).toHaveBeenCalledTimes(1);
  });

  it('shows the query it is given, so the menu can clear the box itself', () => {
    setup({ query: 'razor' });
    expect(screen.getByRole('textbox', { name: 'Search things' })).toHaveValue('razor');
  });
});

describe('ChecklistMenu rows', () => {
  it('draws each row as a title, the second line when there is one, the count and the tick', () => {
    setup({ rows: [row({ sub: 'Greenhouse', checked: true }), row({ id: 'bosch', title: 'Bosch', count: 529 })] });
    const okta = screen.getByRole('checkbox', { name: /Okta/ });
    expect(okta).toBeChecked();
    expect(okta.closest('label')).toHaveTextContent('OktaGreenhouse156');
    const bosch = screen.getByRole('checkbox', { name: /Bosch/ });
    expect(bosch).not.toBeChecked();
    expect(bosch.closest('label')).toHaveTextContent('Bosch529');
  });

  it('reports a ticked row to that row\'s own handler and no other', () => {
    const onOkta = vi.fn();
    const onBosch = vi.fn();
    setup({ rows: [row({ onToggle: onOkta }), row({ id: 'bosch', title: 'Bosch', onToggle: onBosch })] });
    fireEvent.click(screen.getByRole('checkbox', { name: /Bosch/ }));
    expect(onBosch).toHaveBeenCalledTimes(1);
    expect(onOkta).not.toHaveBeenCalled();
  });

  it('says so inside the list when there are no rows, and not when there are', () => {
    const { rerender } = setup({ empty: 'Nothing matches that.' });
    expect(screen.getByRole('list')).toHaveTextContent('Nothing matches that.');
    rerender(<ChecklistMenu label="Search things" query="" onQuery={() => {}} rows={[row()]} empty="Nothing matches that." />);
    expect(screen.queryByText('Nothing matches that.')).not.toBeInTheDocument();
  });

  it('keeps a note under the list, with rows or without, and no note when it has none', () => {
    const { rerender } = setup({ rows: [row()], note: 'The 50 with the most jobs.' });
    const note = screen.getByText('The 50 with the most jobs.');
    expect(screen.getByRole('list').compareDocumentPosition(note) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    rerender(<ChecklistMenu label="Search things" query="" onQuery={() => {}} rows={[row()]} />);
    expect(screen.queryByText('The 50 with the most jobs.')).not.toBeInTheDocument();
  });
});

describe('ChecklistMenu action', () => {
  it('offers the header action only when there is one, and runs it', () => {
    const onClick = vi.fn();
    const { rerender } = setup();
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
    rerender(<ChecklistMenu label="Search things" query="" onQuery={() => {}} rows={[]} action={{ label: 'Clear', onClick }} />);
    fireEvent.click(screen.getByRole('button', { name: 'Clear' }));
    expect(onClick).toHaveBeenCalledTimes(1);
  });
});

describe('ChecklistMenu panel', () => {
  it('floats as a pop card under its trigger, as wide as it is told', () => {
    setup({ width: 'w-72' });
    const panel = screen.getByRole('textbox', { name: 'Search things' }).closest('.card');
    expect(panel).toHaveClass('card-pop', 'left-0', 'w-72');
  });
});

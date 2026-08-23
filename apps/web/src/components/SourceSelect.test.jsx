import { describe, it, expect, vi } from 'vitest';
import { useState } from 'react';
import { render, screen, fireEvent, within } from '@testing-library/react';
import SourceSelect from './SourceSelect.jsx';

const OPTIONS = [
  { name: 'internshala', count: 878 },
  { name: 'greenhouse', count: 412 },
  { name: 'lever', count: 205 },
  { name: 'ashby', count: 96 },
];

// Controlled component, so the tests drive it through a stateful holder and
// spy on the calls rather than freezing the selection.
function setup(initial = []) {
  const onChange = vi.fn();
  function Harness() {
    const [excluded, setExcluded] = useState(initial);
    return (
      <SourceSelect
        options={OPTIONS}
        excluded={excluded}
        onChange={(next) => {
          onChange(next);
          setExcluded(next);
        }}
      />
    );
  }
  render(<Harness />);
  return { onChange };
}

describe('SourceSelect trigger', () => {
  it('reads All sources when nothing is excluded', () => {
    setup();
    expect(screen.getByRole('button', { name: 'All sources' })).toBeInTheDocument();
  });

  it('counts the exclusions rather than the inclusions', () => {
    const { unmount } = render(<SourceSelect options={OPTIONS} excluded={['lever']} onChange={() => {}} />);
    expect(screen.getByRole('button', { name: '1 excluded' })).toBeInTheDocument();
    unmount();

    render(<SourceSelect options={OPTIONS} excluded={['lever', 'ashby', 'internshala']} onChange={() => {}} />);
    expect(screen.getByRole('button', { name: '3 excluded' })).toBeInTheDocument();
  });

  it('reports its expanded state', () => {
    setup();
    const button = screen.getByRole('button', { name: 'All sources' });
    expect(button).toHaveAttribute('aria-expanded', 'false');
    fireEvent.click(button);
    expect(button).toHaveAttribute('aria-expanded', 'true');
  });
});

describe('SourceSelect menu', () => {
  it('starts with every source ticked', () => {
    setup();
    fireEvent.click(screen.getByRole('button', { name: 'All sources' }));
    expect(screen.getAllByRole('checkbox')).toHaveLength(4);
    for (const box of screen.getAllByRole('checkbox')) expect(box).toBeChecked();
  });

  it('lists every source with its count', () => {
    setup();
    fireEvent.click(screen.getByRole('button', { name: 'All sources' }));
    expect(screen.getByText('878')).toBeInTheDocument();
    expect(screen.getByRole('checkbox', { name: /greenhouse/ })).toBeInTheDocument();
  });

  it('excludes on untick and re-includes on tick', () => {
    const { onChange } = setup();
    fireEvent.click(screen.getByRole('button', { name: 'All sources' }));

    fireEvent.click(screen.getByRole('checkbox', { name: /lever/ }));
    expect(onChange).toHaveBeenLastCalledWith(['lever']);

    fireEvent.click(screen.getByRole('checkbox', { name: /ashby/ }));
    expect(onChange).toHaveBeenLastCalledWith(['lever', 'ashby']);

    fireEvent.click(screen.getByRole('checkbox', { name: /lever/ }));
    expect(onChange).toHaveBeenLastCalledWith(['ashby']);
  });

  it('unticks exactly the excluded boards', () => {
    setup(['greenhouse']);
    fireEvent.click(screen.getByRole('button', { name: '1 excluded' }));
    expect(screen.getByRole('checkbox', { name: /greenhouse/ })).not.toBeChecked();
    expect(screen.getByRole('checkbox', { name: /lever/ })).toBeChecked();
  });

  // A board added to the config after the exclusions were saved is not in the
  // stored list, so it has to arrive ticked.
  it('ticks a board the stored exclusions have never seen', () => {
    const options = [...OPTIONS, { name: 'workable', count: 7 }];
    render(<SourceSelect options={options} excluded={['lever']} onChange={() => {}} />);
    fireEvent.click(screen.getByRole('button', { name: '1 excluded' }));
    expect(screen.getByRole('checkbox', { name: /workable/ })).toBeChecked();
  });

  it('pins the already-excluded sources to the top when it opens', () => {
    setup(['ashby']);
    fireEvent.click(screen.getByRole('button', { name: '1 excluded' }));
    const rows = screen.getAllByRole('checkbox').map((box) => box.closest('label').textContent);
    expect(rows[0]).toContain('ashby');
  });
});

describe('SourceSelect search', () => {
  it('narrows the list as you type', () => {
    setup();
    fireEvent.click(screen.getByRole('button', { name: 'All sources' }));
    fireEvent.change(screen.getByLabelText('Search sources'), { target: { value: 'ash' } });
    expect(screen.getAllByRole('checkbox')).toHaveLength(1);
    expect(screen.getByRole('checkbox', { name: /ashby/ })).toBeInTheDocument();
  });

  it('says so when nothing matches', () => {
    setup();
    fireEvent.click(screen.getByRole('button', { name: 'All sources' }));
    fireEvent.change(screen.getByLabelText('Search sources'), { target: { value: 'zzz' } });
    expect(screen.getByText('No source matches that.')).toBeInTheDocument();
  });

  it('starts each open with an empty search box', () => {
    setup();
    fireEvent.click(screen.getByRole('button', { name: 'All sources' }));
    fireEvent.change(screen.getByLabelText('Search sources'), { target: { value: 'ash' } });
    fireEvent.click(screen.getByRole('button', { name: 'All sources' }));
    fireEvent.click(screen.getByRole('button', { name: 'All sources' }));
    expect(screen.getByLabelText('Search sources')).toHaveValue('');
  });
});

describe('SourceSelect reset', () => {
  it('offers Reset only once something is excluded', () => {
    setup();
    fireEvent.click(screen.getByRole('button', { name: 'All sources' }));
    expect(screen.queryByRole('button', { name: 'Reset' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Clear' })).not.toBeInTheDocument();
  });

  it('re-ticks every board', () => {
    const { onChange } = setup(['lever', 'ashby']);
    fireEvent.click(screen.getByRole('button', { name: '2 excluded' }));
    fireEvent.click(screen.getByRole('button', { name: 'Reset' }));
    expect(onChange).toHaveBeenLastCalledWith([]);
    expect(screen.getByRole('button', { name: 'All sources' })).toBeInTheDocument();
    for (const box of screen.getAllByRole('checkbox')) expect(box).toBeChecked();
  });
});

describe('SourceSelect dismissal', () => {
  it('closes on Escape', () => {
    setup();
    fireEvent.click(screen.getByRole('button', { name: 'All sources' }));
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(screen.queryByLabelText('Search sources')).not.toBeInTheDocument();
  });

  it('closes on an outside click', () => {
    setup();
    fireEvent.click(screen.getByRole('button', { name: 'All sources' }));
    fireEvent.mouseDown(document.body);
    expect(screen.queryByLabelText('Search sources')).not.toBeInTheDocument();
  });

  it('stays open when the click lands inside the menu', () => {
    setup();
    fireEvent.click(screen.getByRole('button', { name: 'All sources' }));
    const box = screen.getByLabelText('Search sources');
    fireEvent.mouseDown(box);
    expect(within(document.body).getByLabelText('Search sources')).toBeInTheDocument();
  });
});

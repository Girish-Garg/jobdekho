import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import ErrorBoundary from './ErrorBoundary.jsx';
import { errorReport, errorLine } from '../lib/errorReport.js';

let error;
beforeEach(() => { error = vi.spyOn(console, 'error').mockImplementation(() => {}); });
afterEach(() => { error.mockRestore(); });

const broken = { now: true };
function Part() {
  if (broken.now) throw new TypeError('a part broke');
  return <p>The part</p>;
}

const fallback = ({ report, retry }) => (
  <div>
    <p>Could not show it</p>
    <pre data-testid="report">{report}</pre>
    <button type="button" onClick={retry}>Again</button>
  </div>
);

const guarded = (resetKey) => (
  <main>
    <p>The rest of the page</p>
    <ErrorBoundary where="the part" resetKey={resetKey} fallback={fallback}><Part /></ErrorBoundary>
  </main>
);

describe('ErrorBoundary', () => {
  it('draws its children while they draw', () => {
    broken.now = false;
    render(guarded('a'));
    expect(screen.getByText('The part')).toBeInTheDocument();
  });

  // Without it the whole page goes blank.
  it('shows its fallback in place of a part that throws, and keeps the rest', () => {
    broken.now = true;
    render(guarded('a'));
    expect(screen.getByText('Could not show it')).toBeInTheDocument();
    expect(screen.getByText('The rest of the page')).toBeInTheDocument();
    expect(screen.getByTestId('report').textContent).toMatch(/could not show the part\.\nTypeError: a part broke/);
    expect(error).toHaveBeenCalledWith('JobDekho could not show the part.', expect.any(TypeError));
  });

  it('draws the part again when asked, or when its key moves on', () => {
    broken.now = true;
    const { rerender } = render(guarded('a'));
    broken.now = false;
    fireEvent.click(screen.getByRole('button', { name: 'Again' }));
    expect(screen.getByText('The part')).toBeInTheDocument();
    broken.now = true;
    rerender(guarded('b'));
    expect(screen.getByText('Could not show it')).toBeInTheDocument();
    broken.now = false;
    rerender(guarded('c'));
    expect(screen.getByText('The part')).toBeInTheDocument();
  });
});

describe('errorReport', () => {
  it('names the part, the error, where it was thrown and the components, briefly', () => {
    const thrown = new RangeError('too far');
    thrown.stack = `RangeError: too far\n${Array.from({ length: 20 }, (_, i) => `    at f${i} (app.js:1:${i})`).join('\n')}`;
    const report = errorReport({ where: 'the chat', error: thrown, components: '\n    at ChatMessages\n    at ChatPanelBody' }).split('\n');
    expect(report[0]).toMatch(/^JobDekho .+ could not show the chat\.$/);
    expect(report[1]).toBe('RangeError: too far');
    expect(report.filter((line) => line.startsWith('at f'))).toHaveLength(8);
    expect(report).toContain('Components:');
    expect(report).toContain('at ChatPanelBody');
    expect(report.at(-1)).toMatch(/^Browser: /);
  });

  // Anything can be thrown, not only an Error.
  it('reads a thrown value that is not an Error', () => {
    expect(errorReport({ where: 'x', error: 'plain words' }).split('\n')[1]).toBe('plain words');
    expect(errorLine({ toString: () => 'an object' })).toBe('an object');
    expect(errorLine(new Error('first\nsecond'))).toBe('Error: first');
  });
});

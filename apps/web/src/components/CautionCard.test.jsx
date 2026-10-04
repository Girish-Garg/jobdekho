import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import CautionCard from './CautionCard.jsx';
import FewDetailsNote from './FewDetailsNote.jsx';

const CAUTION = [
  { code: 'personal-email', reason: 'Gives a personal email address (hr.acme@gmail.com) as the contact', evidence: 'Send your CV to hr.acme@gmail.com today.' },
  { code: 'performance-pay', reason: 'Pay is only performance-based, up to ₹7,500', evidence: 'Performance-based stipend up to Rs 7,500.' },
];

// The reasons are the server's own factual wording; the card never says
// "scam", and has no "looks fine" state.
describe('CautionCard', () => {
  it('lists each reason under Caution, with the evidence on request', () => {
    render(<CautionCard caution={CAUTION} />);
    const card = screen.getByRole('region', { name: 'Caution' });
    expect(card).toHaveTextContent('Gives a personal email address (hr.acme@gmail.com) as the contact');
    expect(card).toHaveTextContent('Pay is only performance-based, up to ₹7,500');
    expect(card).not.toHaveTextContent(/scam|second look/i);
    expect(screen.queryByText('Send your CV to hr.acme@gmail.com today.')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Show the evidence' }));
    expect(screen.getByText('Send your CV to hr.acme@gmail.com today.')).toBeInTheDocument();
  });

  it('renders nothing at all without a caution, children or not', () => {
    const { container, rerender } = render(<CautionCard caution={[]}><button type="button">x</button></CautionCard>);
    expect(container).toBeEmptyDOMElement();
    rerender(<CautionCard />);
    expect(container).toBeEmptyDOMElement();
  });

  it('seats whatever it is given under the reasons, inside the same card', () => {
    render(<CautionCard caution={CAUTION}><button type="button">Is this job real?</button></CautionCard>);
    expect(screen.getByRole('region', { name: 'Caution' })).toContainElement(screen.getByRole('button', { name: 'Is this job real?' }));
  });
});

// A thin posting is a fact about its text, not a warning.
describe('FewDetailsNote', () => {
  it('says so quietly in grey, never in the warning colour', () => {
    const { container } = render(<FewDetailsNote posting={{ fewDetails: true }} />);
    expect(screen.getByText('Few details.')).toBeInTheDocument();
    expect(container.querySelectorAll('.text-ember, .bg-ember, [class*="ember"]')).toHaveLength(0);
  });

  it('says nothing about a posting with enough text', () => {
    const { container } = render(<FewDetailsNote posting={{ fewDetails: false }} />);
    expect(container).toBeEmptyDOMElement();
  });
});

import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import ChatText from './ChatText.jsx';

describe('ChatText', () => {
  it('renders paragraphs, a real list and bold text', () => {
    const { container } = render(<ChatText text={'Three fit:\n\n- **PhonePe** first\n- Razorpay\n\nThat is all.'} />);
    expect(container.querySelectorAll('p')).toHaveLength(2);
    const items = screen.getAllByRole('listitem');
    expect(items.map((li) => li.textContent)).toEqual(['PhonePe first', 'Razorpay']);
    expect(items[0].querySelector('strong')).toHaveTextContent('PhonePe');
  });

  it('numbers an ordered list from where the answer started it', () => {
    render(<ChatText text={'2. Second\n3. Third'} />);
    expect(screen.getByRole('list')).toHaveAttribute('start', '2');
  });

  it('keeps line breaks inside a paragraph', () => {
    const { container } = render(<ChatText text={'one\ntwo'} />);
    expect(container.querySelectorAll('br')).toHaveLength(1);
  });

  it('never turns what the model wrote into markup', () => {
    const { container } = render(<ChatText text={'<img src=x onerror="alert(1)"> and <b>bold</b>'} />);
    expect(container.querySelector('img')).toBeNull();
    expect(container.querySelector('b')).toBeNull();
    expect(screen.getByText('<img src=x onerror="alert(1)"> and <b>bold</b>')).toBeInTheDocument();
  });
});

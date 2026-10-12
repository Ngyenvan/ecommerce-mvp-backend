import { Money } from './money.value-object';

describe('Money', () => {
  it('formats a whole-number price', () => {
    expect(Money.from('1200').toString()).toBe('1200.00');
  });

  it('formats a one-decimal price', () => {
    expect(Money.from('19.9').toString()).toBe('19.90');
  });

  it.each(['0', '-1', '12.345', 'abc', ''])(
    'rejects invalid price %p',
    (price) => {
      expect(() => Money.from(price)).toThrow();
    },
  );
});

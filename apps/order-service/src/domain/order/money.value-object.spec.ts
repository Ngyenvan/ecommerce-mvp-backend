import { Money } from './money.value-object';
import { InvalidMoneyError } from './order.errors';

describe('Money', () => {
  it('normalizes decimal values to two places', () => {
    expect(Money.from('1500').toString()).toBe('1500.00');
    expect(Money.from('25.5').toString()).toBe('25.50');
  });

  it('adds and multiplies without floating-point errors', () => {
    const total = Money.from('0.10').add(Money.from('0.20')).multiply(3);

    expect(total.toString()).toBe('0.90');
  });

  it('rounds percentage results to the nearest minor unit', () => {
    expect(Money.from('0.05').percentage(1_000).toString()).toBe('0.01');
  });

  it('rejects negative or over-precise values', () => {
    expect(() => Money.from('-1.00')).toThrow(InvalidMoneyError);
    expect(() => Money.from('1.001')).toThrow(InvalidMoneyError);
  });
});

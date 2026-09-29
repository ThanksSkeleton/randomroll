import { describe, expect, it } from 'vitest';
import { formatAu } from './formatters';

describe('formatAu', () => {
  it('keeps AU distances to three significant digits', () => {
    expect(formatAu(0.001)).toBe('0.001');
    expect(formatAu(9.99)).toBe('9.99');
    expect(formatAu(99.94)).toBe('99.9');
    expect(formatAu(999.4)).toBe('999');
  });
});

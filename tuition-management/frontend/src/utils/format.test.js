import { describe, it, expect } from 'vitest';
import {
  formatINR,
  rupeesToPaise,
  paiseToRupees,
  formatDate,
  initials,
  titleCase,
} from './format.js';

describe('money helpers', () => {
  it('formats paise as Indian rupees', () => {
    expect(formatINR(123450)).toMatch(/1,234\.50/);
  });

  it('treats missing values as zero', () => {
    expect(formatINR(undefined)).toMatch(/0\.00/);
  });

  it('converts rupees to whole paise correctly', () => {
    expect(rupeesToPaise('123.45')).toBe(12345);
    expect(rupeesToPaise(0.1)).toBe(10);
  });

  it('converts paise back to rupees', () => {
    expect(paiseToRupees(12345)).toBe(123.45);
  });
});

describe('formatDate', () => {
  it('renders a readable date', () => {
    expect(formatDate('2026-03-12T00:00:00.000Z')).toMatch(/2026/);
  });

  it('returns a dash for empty input', () => {
    expect(formatDate(null)).toBe('—');
  });
});

describe('text helpers', () => {
  it('builds initials from a name', () => {
    expect(initials('Asha Rao')).toBe('AR');
  });

  it('handles a missing name', () => {
    expect(initials('')).toBe('?');
  });

  it('turns snake_case into Title Case', () => {
    expect(titleCase('bank_transfer')).toBe('Bank Transfer');
  });
});

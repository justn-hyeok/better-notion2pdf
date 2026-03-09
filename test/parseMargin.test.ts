import { describe, it, expect } from 'vitest';
import { parseMargin } from '../src/utils/parseMargin.js';

describe('parseMargin', () => {
  it('parses 4-part margin string', () => {
    expect(parseMargin('18mm,16mm,18mm,16mm')).toEqual({
      top: '18mm',
      right: '16mm',
      bottom: '18mm',
      left: '16mm',
    });
  });

  it('throws on invalid format', () => {
    expect(() => parseMargin('18mm,16mm')).toThrowError(/Invalid --margin/);
  });
});

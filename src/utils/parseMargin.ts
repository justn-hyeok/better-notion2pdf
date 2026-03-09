import { Margins } from '../types.js';

export function parseMargin(input: string): Margins {
  const parts = input.split(',').map((p) => p.trim());
  if (parts.length !== 4 || parts.some((p) => p.length === 0)) {
    throw new Error('Invalid --margin. Expected: top,right,bottom,left (e.g. 18mm,16mm,18mm,16mm)');
  }

  return {
    top: parts[0],
    right: parts[1],
    bottom: parts[2],
    left: parts[3],
  };
}

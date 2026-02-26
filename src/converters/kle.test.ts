import { describe, it, expect } from 'vitest';
import { toKLE } from './kle';

describe('toKLE', () => {
  it('should return empty array for empty input', () => {
    const data: any = {
      thumb: [],
      index_far: [],
      index: [],
      middle: [],
      ring: [],
      pinky: [],
    };
    // Should return at least metadata
    const result = toKLE(data, 10, 4);
    expect(result.length).toBeGreaterThan(0);
    expect(result[0]).toHaveProperty('meta');
  });

  it('should generate KLE for a single column', () => {
    // Mock data for a single column with 2 points to establish a line
    // Vertical line: (0,0) -> (0, 100)
    const data: any = {
      thumb: [],
      index_far: [],
      index: [],
      middle: [
        { x: 0, y: 0 },
        { x: 0, y: 100 },
      ],
      ring: [],
      pinky: [],
    };

    const result = toKLE(data, 10, 4);
    // Should contain metadata + 1 row (containing 4 keys)
    // 1 meta + 1 row = 2
    expect(result.length).toBe(2);

    // Check rotation. Vertical line -> 0 deg (Down).
    const row = result[1];
    expect(row.length).toBeGreaterThan(0);
    // Row contains objects (keys) and strings (labels).
    // First element is Key object.
    const key = row[0];
    expect(key.r).toBeCloseTo(0);
  });

  it('should normalize coordinates to start near (0,0)', () => {
    // Mock data far away from origin
    // All points at (1000, 1000) -> (1000, 1100)
    const data: any = {
      thumb: [],
      index_far: [],
      index: [],
      middle: [
        { x: 1000, y: 1000 },
        { x: 1000, y: 1100 },
      ],
      ring: [],
      pinky: [],
    };

    const result = toKLE(data, 10, 4);

    // Check first key
    const row = result[1];
    const key = row[0];

    // Since we normalize, x and y should be small (close to 0)
    // We added a margin of 1.
    // So x and y should be close to 1.
    expect(key.x).toBeGreaterThanOrEqual(1);
    expect(key.x).toBeLessThan(10);

    // Also check rx and ry are normalized
    expect(key.rx).toBeGreaterThanOrEqual(1);
    expect(key.rx).toBeLessThan(10);
  });
});

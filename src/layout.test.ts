import { describe, it, expect } from 'vitest';
import { calculateColumn, drawKeyColumn, KEY_PITCH_MM } from './layout';

describe('Layout Logic', () => {
  const ppm = 10; // 10 pixels per mm for easy math

  describe('calculateColumn', () => {
    // Helper to generate vertical points
    const makePoints = (ys: number[]) => ys.map((y) => ({ x: 0, y }));

    it('should return standard offsets in compact mode', () => {
      // Input: 3 points widely spread
      const points = makePoints([0, 100, 200]);

      const result = calculateColumn(points, false, ppm, 'compact', 3);

      expect(result).not.toBeNull();
      if (!result) return;

      const offsets = result.keys.map((k) => k.offset).sort((a, b) => a - b);

      // Expected: [-19.05, 0, 19.05] (Bottom, Home, Top)
      expect(offsets.length).toBe(3);
      expect(offsets[0]).toBeCloseTo(-KEY_PITCH_MM);
      expect(offsets[1]).toBeCloseTo(0);
      expect(offsets[2]).toBeCloseTo(KEY_PITCH_MM);
    });

    it('should cluster points in loose mode', () => {
      // Input: 3 clusters of points
      // Cluster 1: around 0
      // Cluster 2: around 30mm (300px)
      // Cluster 3: around 70mm (700px)
      const points = [
        { x: 0, y: 0 },
        { x: 0, y: 10 },
        { x: 0, y: 300 },
        { x: 0, y: 310 },
        { x: 0, y: 700 },
        { x: 0, y: 710 },
      ];

      const result = calculateColumn(points, false, ppm, 'loose', 3);

      expect(result).not.toBeNull();
      if (!result) return;

      const offsets = result.keys.map((k) => k.offset).sort((a, b) => a - b);

      expect(offsets.length).toBe(3);
      // Diff between 1 and 2: ~30mm. > 19.05. No constraint needed.
      // Diff between 2 and 3: ~40mm. > 19.05. No constraint needed.

      // Check relative distances
      expect(offsets[1] - offsets[0]).toBeCloseTo(30, 1);
      expect(offsets[2] - offsets[1]).toBeCloseTo(40, 1);
    });

    it('should cluster points correctly for HORIZONTAL layout in loose mode', () => {
      // Regression test for bug where non-vertical lines used normal vector instead of tangent vector for projection
      // Input: Horizontal line. 2 clusters.
      // Cluster 1: x=0.
      // Cluster 2: x=300px (30mm).
      // ppm=10.
      const points = [
        { x: 0, y: 0 },
        { x: 10, y: 0 },
        { x: 300, y: 0 },
        { x: 310, y: 0 },
      ];

      const result = calculateColumn(points, false, ppm, 'loose', 2);
      expect(result).not.toBeNull();
      if (!result) return;

      const offsets = result.keys.map((k) => k.offset).sort((a, b) => a - b);
      expect(offsets.length).toBe(2);

      // If logic is correct (tangent vector), offsets should be ~30mm apart.
      // If logic is broken (normal vector), offsets will be 0 (all on y=0), then enforced to 19.05mm.

      const dist = offsets[1] - offsets[0];
      // We expect 30mm.
      // If broken, it would be 19.05mm.

      // Note: "offsets" are relative to MidPoint.
      // Cluster 1: ~5mm. Cluster 2: ~305mm. Diff ~300px = 30mm.
      // (The test expectation was correct).

      // If previous failure was "expected 19.05 to be close to 30", it means we got 19.05.
      // Which means clustering FAILED (found distance 0 or <19.05), so it enforced minimum.
      // This confirms the bug.

      // Wait. If tValuesRaw are correct (0, 10, 300, 310).
      // tValuesMM = 0, 1, 30, 31.
      // Cluster (k=2):
      // Centers: ~0.5, ~30.5.
      // Diff = 30.
      // Why does test fail?
      // Maybe leastSquares in test environment behaves differently?
      // "regression test for bug where non-vertical lines used normal vector"
      // If leastSquares returns m=infinity for horizontal? No.
      // If leastSquares returns "vertical" for horizontal?
      // Check isVertical logic in calculateColumn:
      // !Number.isFinite(trendline.m)

      // Let's debug inside the test by logging
      // console.log('DEBUG TEST Result Keys:', JSON.stringify(result?.keys));

      expect(dist).toBeCloseTo(30, 1);
      expect(dist).not.toBeCloseTo(19.05, 0.1);
    });

    it('should enforce minimum spacing symmetrically in loose mode', () => {
      // New requirement: "Clicking a key should not affect adjacent keys" (unnecessarily)
      // and "Should stay close to center".
      // Test: Two clusters at 0 and 10mm (Collision < 19.05).
      // Center of mass: 5mm.
      // Target positions should be symmetrically spread around 5mm.
      // i.e. 5 - 19.05/2 = -4.525 and 5 + 19.05/2 = 14.525.
      // Distance = 19.05.
      // Center = 5.

      const points = [
        { x: 0, y: 0 },
        { x: 0, y: 0 },
        { x: 0, y: 100 },
        { x: 0, y: 100 }, // 100px = 10mm
      ];

      const result = calculateColumn(points, false, ppm, 'loose', 2);

      expect(result).not.toBeNull();
      if (!result) return;

      const offsets = result.keys.map((k) => k.offset).sort((a, b) => a - b);

      // Expected:
      // Raw Centers (mm): 0, 10.
      // Constraint: 19.05.
      // Overlap: 19.05 - 10 = 9.05.
      // Push each by 4.525.
      // New Centers: -4.525, 14.525.

      // Note: Offsets in `calculateColumn` are relative to `midPoint` (Geometric center of clicks).
      // Geometric center of clicks (0, 100) -> 50px = 5mm.
      // So relative to 5mm:
      // -4.525 - 5 = -9.525.
      // 14.525 - 5 = 9.525.
      // Distance is 19.05.

      expect(offsets.length).toBe(2);
      expect(offsets[1] - offsets[0]).toBeCloseTo(KEY_PITCH_MM, 0.001);

      // Verify symmetry (approximately, allowing for float errors)
      // The centroid of new keys should match centroid of original keys
      // Original Centroid: 5. New Centroid: (-4.525 + 14.525)/2 = 5.
      // Since offsets are relative to midPoint (5), sum should be 0.
      expect(offsets[0] + offsets[1]).toBeCloseTo(0, 0.001);
    });
  });

  describe('drawKeyColumn', () => {
    it('should create correct number of shapes', () => {
      // Mock Two.js
      const mockTwo = {
        makeRectangle: () => ({ stroke: '', linewidth: 0, fill: '' }),
        makeGroup: (items: any[]) => ({ items }),
      };

      const keys = [
        { offset: 0, label: '' },
        { offset: 20, label: '' },
      ];
      const group = drawKeyColumn(mockTwo, ppm, keys);

      expect(group.items.length).toBe(2);
    });
  });
});

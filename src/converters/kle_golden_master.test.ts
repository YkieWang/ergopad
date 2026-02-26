import { describe, it, expect } from 'vitest';
import { toKLE } from './kle';
// @ts-ignore
import kle from '@ijprest/kle-serial';

describe('KLE Golden Master Tests', () => {
  // Helper to parse JSON and get absolute coordinates
  const parse = (json: any[]) => {
    const kb = kle.Serial.deserialize(json);
    const keys = kb.keys;

    let keyIndex = 0;
    const rows = json.filter((row) => Array.isArray(row));

    rows.forEach((row: any[], rIdx: number) => {
      let keysInRow = 0;
      row.forEach((token) => {
        if (typeof token === 'string') keysInRow++;
      });

      for (let i = 0; i < keysInRow; i++) {
        if (keys[keyIndex]) {
          // Subtract the row index (assuming kle-serial adds 1 per row)
          keys[keyIndex].y -= rIdx;
          // Empirical: X is also shifted by Row Index
          keys[keyIndex].x -= rIdx;

          // Convert to Global
          keys[keyIndex].x += keys[keyIndex].rotation_x;
          keys[keyIndex].y += keys[keyIndex].rotation_y;

          keyIndex++;
        }
      }
    });

    return keys;
  };

  it('should reproduce 2x2 Compact Grid structure', () => {
    const data: any = {
      thumb: [],
      index_far: [],
      index: [],
      middle: [
        { x: 0, y: 0 },
        { x: 0, y: 19.05 },
      ],
      ring: [
        { x: 19.05, y: 0 },
        { x: 19.05, y: 19.05 },
      ],
      pinky: [],
    };

    const kleJson = toKLE(data, 1, 2);
    const rows = kleJson.slice(1); // Skip meta
    expect(rows.length).toBe(2);
    expect(rows[0].length).toBe(4);
    expect(rows[1].length).toBe(4);

    const keys = parse(kleJson);
    const k1 = keys[0];
    const k2 = keys[1];
    const k3 = keys[2];
    const k4 = keys[3];

    expect(k1.x).toBeCloseTo(1, 0.1);
    expect(k1.y).toBeCloseTo(1, 0.1);
    expect(k2.x).toBeCloseTo(1, 0.1);
    expect(k2.y).toBeCloseTo(2, 0.1);
    expect(k3.x).toBeCloseTo(2, 0.1);
    expect(k3.y).toBeCloseTo(1, 0.1);
    expect(k4.x).toBeCloseTo(2, 0.1);
    expect(k4.y).toBeCloseTo(2, 0.1);
  });

  it('should reproduce Horizontal Line (3 keys)', () => {
    const data: any = {
      thumb: [],
      index_far: [],
      index: [
        { x: 0, y: 19.05 },
        { x: 0, y: 20 },
      ],
      middle: [
        { x: 19.05, y: 19.05 },
        { x: 19.05, y: 20 },
      ],
      ring: [
        { x: 38.1, y: 19.05 },
        { x: 38.1, y: 20 },
      ],
      pinky: [],
    };

    const kleJson = toKLE(data, 1, 1);
    const keys = parse(kleJson);

    keys.sort((a: any, b: any) => a.x - b.x);

    expect(keys.length).toBe(3);
    expect(keys[0].x).toBeCloseTo(1, 0.001);
    expect(keys[0].y).toBeCloseTo(1, 0.001);
    expect(keys[1].x).toBeCloseTo(2, 0.001);
    expect(keys[1].y).toBeCloseTo(1, 0.001);
    expect(keys[2].x).toBeCloseTo(3, 0.001);
    expect(keys[2].y).toBeCloseTo(1, 0.001);
  });

  it('should reproduce Cross Shape (via 3x3 grid subset)', () => {
    const data: any = {
      thumb: [],
      index_far: [],
      index: [
        { x: 0, y: 19.05 },
        { x: 0, y: 20 },
      ],
      middle: [
        { x: 19.05, y: 19.05 },
        { x: 19.05, y: 20 },
      ],
      ring: [
        { x: 38.1, y: 19.05 },
        { x: 38.1, y: 20 },
      ],
      pinky: [],
    };

    const kleJson = toKLE(data, 1, 3);
    const keys = parse(kleJson);

    const homeRowKeys = keys.filter((k: any) => Math.abs(k.y - 2) < 0.1);
    expect(homeRowKeys.length).toBe(3);

    homeRowKeys.sort((a: any, b: any) => a.x - b.x);
    expect(homeRowKeys[0].x).toBeCloseTo(1, 0.1);
    expect(homeRowKeys[1].x).toBeCloseTo(2, 0.1);
    expect(homeRowKeys[2].x).toBeCloseTo(3, 0.1);

    const middleColKeys = keys.filter((k: any) => Math.abs(k.x - 2) < 0.1);
    expect(middleColKeys.length).toBe(3);

    middleColKeys.sort((a: any, b: any) => a.y - b.y);
    expect(middleColKeys[0].y).toBeCloseTo(1, 0.1);
    expect(middleColKeys[1].y).toBeCloseTo(2, 0.1);
    expect(middleColKeys[2].y).toBeCloseTo(3, 0.1);

    const centerKey = homeRowKeys[1];
    expect(centerKey.x).toBeCloseTo(2, 0.1);
    expect(centerKey.y).toBeCloseTo(2, 0.1);
  });

  it('should reproduce Two Row Layout (Horizontal Alignment)', () => {
    const data: any = {
      thumb: [],
      index_far: [],
      index: [],
      middle: [
        { x: 0, y: 0 },
        { x: 0, y: 1 },
      ],
      ring: [
        { x: 19.05, y: 0 },
        { x: 19.05, y: 1 },
      ],
      pinky: [],
    };

    const kleJson = toKLE(data, 1, 2);
    const keys = parse(kleJson);

    const topRow = keys.filter((k: any) => Math.abs(k.y - 1) < 0.1);
    expect(topRow.length).toBe(2);
    expect(Math.abs(topRow[0].x - topRow[1].x)).toBeCloseTo(1, 0.1);

    const homeRow = keys.filter((k: any) => Math.abs(k.y - 2) < 0.1);
    expect(homeRow.length).toBe(2);
    expect(Math.abs(homeRow[0].x - homeRow[1].x)).toBeCloseTo(1, 0.1);

    expect(topRow[0].y).toBeCloseTo(topRow[1].y, 5);
    expect(homeRow[0].y).toBeCloseTo(homeRow[1].y, 5);
  });

  it('should reproduce L-Shape Layout', () => {
    const data: any = {
      thumb: [],
      index_far: [],
      index: [
        { x: 0, y: 0 },
        { x: 0, y: 19.05 },
      ],
      middle: [
        { x: 19.05, y: 0 },
        { x: 19.05, y: 19.05 },
      ],
      ring: [],
      pinky: [],
    };

    const kleJson = toKLE(data, 1, 3);
    const keys = parse(kleJson);

    expect(keys.length).toBe(6);

    const indexHome = keys.find(
      (k: any) => Math.abs(k.x - 1) < 0.1 && Math.abs(k.y - 2) < 0.1,
    );
    const middleHome = keys.find(
      (k: any) => Math.abs(k.x - 2) < 0.1 && Math.abs(k.y - 2) < 0.1,
    );
    const middleBottom = keys.find(
      (k: any) => Math.abs(k.x - 2) < 0.1 && Math.abs(k.y - 3) < 0.1,
    );

    expect(indexHome).toBeDefined();
    expect(middleHome).toBeDefined();
    expect(middleBottom).toBeDefined();

    expect(middleHome.x - indexHome.x).toBeCloseTo(1, 0.1);
    expect(middleHome.y - indexHome.y).toBeCloseTo(0, 0.1);

    expect(middleBottom.x - middleHome.x).toBeCloseTo(0, 0.1);
    expect(middleBottom.y - middleHome.y).toBeCloseTo(1, 0.1);

    const dist = Math.sqrt(
      Math.pow(middleBottom.x - indexHome.x, 2) +
        Math.pow(middleBottom.y - indexHome.y, 2),
    );
    expect(dist).toBeCloseTo(Math.sqrt(2), 0.1);
  });

  it('should respect loose mode spacing', () => {
    const data: any = {
      thumb: [],
      index_far: [],
      index: [],
      middle: [
        { x: 0, y: 0 },
        { x: 0, y: 40 },
      ],
      ring: [],
      pinky: [],
    };

    const kleJson = toKLE(data, 1, 2, 'loose' as any);
    const keys = parse(kleJson);

    expect(keys.length).toBe(2);
    const dist = Math.abs(keys[1].y - keys[0].y);
    // 40px / 19.05 = 2.099u
    expect(dist).toBeCloseTo(40 / 19.05, 0.1);
  });
});

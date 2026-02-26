import { describe, it, expect } from 'vitest';
import { toKLE } from './kle';
// @ts-ignore
import kle from '@ijprest/kle-serial';

describe('KLE Verification with kle-serial', () => {
  it('should generate valid KLE JSON that can be parsed back correctly', () => {
    // 1. Create a layout with 2 vertical columns
    const data: any = {
      thumb: [],
      index_far: [],
      index: [],
      middle: [
        { x: 0, y: 0 },
        { x: 0, y: 19.05 }, // 1u spacing
      ],
      ring: [
        { x: 19.05, y: 0 }, // 1u to the right
        { x: 19.05, y: 19.05 },
      ],
      pinky: [],
    };

    // 2. Generate KLE JSON
    const kleJson = toKLE(data, 1, 2);

    // 3. Parse with kle-serial
    const keyboard = kle.Serial.deserialize(kleJson);

    // 4. Inspect parsed keys
    const keys = keyboard.keys;
    // Should be 4 keys (2 columns * 2 keys)
    expect(keys.length).toBe(4);

    const k1 = keys[0]; // Middle Key 1
    const k2 = keys[1]; // Middle Key 2
    const k3 = keys[2]; // Ring Key 1
    const k4 = keys[3]; // Ring Key 2

    // 5. Assertions for Column 1
    expect(k1.rotation_angle).toBeCloseTo(0);
    expect(k2.rotation_angle).toBeCloseTo(0);

    const dist12 = Math.sqrt(
      Math.pow(k2.x - k1.x, 2) + Math.pow(k2.y - k1.y, 2),
    );
    expect(dist12).toBeCloseTo(1, 0.01);

    // 6. Assertions for Column 2
    expect(k3.rotation_angle).toBeCloseTo(0);

    // Check if Column 2 is separated from Column 1
    const dist13 = Math.sqrt(
      Math.pow(k3.x - k1.x, 2) + Math.pow(k3.y - k1.y, 2),
    );
    expect(dist13).toBeCloseTo(1, 0.1);
  });

  it('should preserve physical distances (Geometric Invariant Verification)', () => {
    // 1. Define Input in Pixels
    // Arbitrary diagonal layout
    // Point A: (0, 0)
    // Point B: (300, 400) -> 3-4-5 triangle.
    // Pixel Distance = 500 px.
    // PPM = 10 pixels per mm.
    // Physical Distance = 500 / 10 = 50 mm.

    // Key 1 Points (Centroid at 0,0)
    const k1_p1 = { x: 0, y: -10 };
    const k1_p2 = { x: 0, y: 10 };

    // Key 2 Points (Centroid at 300, 400)
    const k2_p1 = { x: 300, y: 390 };
    const k2_p2 = { x: 300, y: 410 };

    // Use separate columns to ensure they are treated independently
    // (If in same column, they might be forced into a line by regression logic, which is fine too)
    // But let's verify multi-column logic.
    const data: any = {
      thumb: [],
      index_far: [],
      index: [],
      middle: [k1_p1, k1_p2], // Key 1
      ring: [k2_p1, k2_p2], // Key 2
      pinky: [],
    };

    // Input Validation
    const inputDistPx = Math.sqrt(Math.pow(300 - 0, 2) + Math.pow(400 - 0, 2)); // 500
    const ppm = 10;
    const inputDistMm = inputDistPx / ppm; // 50 mm

    // 2. Convert
    // keyCount=1 (Just Home Row) to simplify
    const kleJson = toKLE(data, ppm, 1);

    // 3. Parse
    const keyboard = kle.Serial.deserialize(kleJson);
    const keys = keyboard.keys;
    expect(keys.length).toBe(2);

    const parsedK1 = keys[0];
    const parsedK2 = keys[1];

    // 4. Calculate Output Distance in mm
    // KLE 1u = 19.05mm.
    const dx = parsedK2.x - parsedK1.x;
    const dy = parsedK2.y - parsedK1.y;
    const outputDistU = Math.sqrt(dx * dx + dy * dy);
    const outputDistMm = outputDistU * 19.05;

    // 5. Assert
    // Should match within reasonable margin (e.g. 0.5mm)
    expect(outputDistMm).toBeCloseTo(inputDistMm, 0.5);
  });
});

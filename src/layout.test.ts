// src/layout.test.ts
import { expect, describe, it } from 'vitest';
import { drawKeyColumn } from './layout';

describe('drawKeyColumn', () => {
  it('should draw correct number of keys based on keyCount', () => {
    const mockTwo = (expectedCount: number) => {
      let count = 0;
      return {
        makeRectangle: () => {
          count++;
          return { stroke: '', linewidth: 0, fill: '' };
        },
        makeGroup: (items: any[]) => ({ items: items.length }), // Return count for verification
        count: () => count,
      };
    };

    // Test 1 key (Home)
    const two1 = mockTwo(1);
    const group1 = drawKeyColumn(two1 as any, 10, 1);
    // The current implementation returns a group with hardcoded 4 items.
    // We expect the group.items to reflect the keyCount passed (once implemented).
    // Note: The mock makeGroup implementation above counts the items passed to it.

    // In the current implementation, drawKeyColumn doesn't accept the 3rd argument,
    // so it will ignore it and draw 4 keys.
    // So this test SHOULD FAIL if we assert it equals 1.
    // However, the group object returned by current implementation contains 4 items.
    // So checking group1.items should be 4 currently.
    // But we want to assert it to be 1 to make it fail.

    // Also, the mockTwo.count() tracks how many times makeRectangle was called.
    // Currently it's called 4 times.

    // Let's stick to the plan's test structure but ensure it fails correctly.
    // The plan says: expect(two1.count()).toBe(1);
    expect(two1.count()).toBe(1);

    // Test 2 keys (Home + Top)
    const two2 = mockTwo(2);
    const group2 = drawKeyColumn(two2 as any, 10, 2);
    expect(two2.count()).toBe(2);

    // Test 3 keys (Bottom + Home + Top)
    const two3 = mockTwo(3);
    const group3 = drawKeyColumn(two3 as any, 10, 3);
    expect(two3.count()).toBe(3);

    // Test 4 keys (Bottom + Home + Top + Number)
    const two4 = mockTwo(4);
    const group4 = drawKeyColumn(two4 as any, 10, 4);
    expect(two4.count()).toBe(4);
  });
});

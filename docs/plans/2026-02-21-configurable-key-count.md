# Configurable Key Count Implementation Plan

**Goal:** 允许用户为每列选择按键数量（1 到 4 个），并动态渲染对应数量的按键。

**Architecture:**
在 `App` 组件状态中增加 `keyCount` (1-4)。
更新 `layout.ts` 中的 `drawKeyColumn` 函数，使其接受 `keyCount` 参数，并根据数量有条件地绘制 Bottom, Home, Top, Number 行。
在 UI 中增加一个下拉选择器（Select）来控制这个状态。

**Tech Stack:** React, TypeScript, Two.js

---

### Task 1: Update Layout Logic

**Files:**
- Modify: `src/layout.ts`
- Test: `src/layout.test.ts`

**Step 1: Write the failing test**

更新测试，验证 `drawKeyColumn` 可以根据参数绘制不同数量的按键。

```typescript
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
        makeGroup: () => ({ items: count }), // Return count for verification
        count: () => count,
      };
    };

    // Test 1 key (Home)
    const two1 = mockTwo(1);
    const group1 = drawKeyColumn(two1 as any, 10, 1);
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
```

**Step 2: Run test to verify it fails**

Run: `npm test src/layout.test.ts`
Expected: FAIL (TyepError or count mismatch, since `drawKeyColumn` doesn't accept 3rd arg yet)

**Step 3: Implement dynamic key rendering**

修改 `src/layout.ts`，增加 `keyCount` 参数（默认为 4 以保持兼容），并根据逻辑绘制。
逻辑：
- 1 key: Home
- 2 keys: Home, Top
- 3 keys: Bottom, Home, Top
- 4 keys: Bottom, Home, Top, Number

```typescript
// src/layout.ts
export const drawKeyColumn = (two: any, ppm: number, keyCount: number = 4) => {
  const keyWidth = 17 * ppm;
  const keyHeight = keyWidth;
  const gapY = 2 * ppm;
  const originX = 0;
  const originY = 0;
  
  const keys = [];

  // Home Row (Always present)
  const homeRowKey = two.makeRectangle(
    originX,
    originY,
    keyWidth,
    keyHeight,
  );
  homeRowKey.stroke = 'black';
  homeRowKey.linewidth = 2;
  homeRowKey.fill = 'transparent';
  keys.push(homeRowKey);

  // Top Row (Present if keyCount >= 2)
  if (keyCount >= 2) {
    const topRowKey = two.makeRectangle(
      originX,
      originY + gapY + keyHeight,
      keyWidth,
      keyHeight,
    );
    topRowKey.stroke = 'black';
    topRowKey.linewidth = 2;
    topRowKey.fill = 'transparent';
    keys.push(topRowKey);
  }

  // Bottom Row (Present if keyCount >= 3)
  if (keyCount >= 3) {
    const bottomRowKey = two.makeRectangle(
      originX,
      originY - gapY - keyHeight,
      keyWidth,
      keyHeight,
    );
    bottomRowKey.stroke = 'black';
    bottomRowKey.linewidth = 2;
    bottomRowKey.fill = 'transparent';
    keys.push(bottomRowKey);
  }

  // Number Row (Present if keyCount >= 4)
  if (keyCount >= 4) {
    const numberRowKey = two.makeRectangle(
      originX,
      originY + (gapY + keyHeight) * 2,
      keyWidth,
      keyHeight,
    );
    numberRowKey.stroke = 'black';
    numberRowKey.linewidth = 2;
    numberRowKey.fill = 'transparent';
    keys.push(numberRowKey);
  }

  const group = two.makeGroup(keys);
  
  return group;
};
```

**Step 4: Run test to verify it passes**

Run: `npm test src/layout.test.ts`
Expected: PASS

---

### Task 2: Add UI Control & State

**Files:**
- Modify: `src/App.tsx`

**Step 1: Add state and pass to Boo**

在 `App` 组件中增加 `keyCount` 状态。

```typescript
// src/App.tsx

// ... inside App component ...
const [keyCount, setKeyCount] = useState(4); // Default to 4

// ... inside Boo component usage ...
<Boo
  data={positions}
  ppm={ppm}
  keyCount={keyCount} // Pass it down
  showAuxiliaryLines={showAuxiliaryLines}
/>
```

**Step 2: Update Boo component signature**

```typescript
// src/App.tsx
const Boo = ({
  data,
  ppm,
  keyCount, // Add prop
  showAuxiliaryLines,
}: {
  data: Record<Column, Pos[]>;
  ppm: number;
  keyCount: number; // Add type
  showAuxiliaryLines: boolean;
}) => {
  // ... inside useTwo callback ...
  // Pass keyCount to drawKeyColumn
  const group = drawKeyColumn(two, ppm, keyCount);
  // ...
  // Add keyCount to dependency array
  // [data, ref.current, ppm, showAuxiliaryLines, keyCount]
```

**Step 3: Add Select UI**

在 `App` 的 JSX 中，添加一个选择器来控制 `keyCount`。

```typescript
// src/App.tsx
// Add near other controls (Aux lines button, etc.)

<Label className="mt-4">
  <span>Key Count</span>
  <Select
    className="mt-1"
    value={keyCount}
    onChange={(e) => setKeyCount(parseInt(e.target.value))}
  >
    <option value={1}>1 Key</option>
    <option value={2}>2 Keys</option>
    <option value={3}>3 Keys</option>
    <option value={4}>4 Keys</option>
  </Select>
</Label>
```

**Step 4: Verify in Browser**

Run: `npm start`
Manual Check: 改变下拉框的值，按键数量应实时变化。

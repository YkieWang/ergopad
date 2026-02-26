import {
  KEY_WIDTH_MM,
  KEY_GAP_MM,
  calculateColumn,
  LayoutMode,
} from '../layout';

type Column = 'pinky' | 'ring' | 'middle' | 'index' | 'index_far' | 'thumb';
type Pos = { x: number; y: number };

// 1u in mm
const U_MM = 19.05;

type KeyData = {
  r: number;
  rx: number;
  ry: number;
  y_u: number;
  label: string;
};

export const toKLE = (
  data: Record<Column, Pos[]>,
  ppm: number, // pixels per mm
  keyCount: number,
  layoutMode: LayoutMode = 'compact',
): any[] => {
  // Pass 1: Collect all keys
  const keys: KeyData[] = [];

  Object.entries(data).forEach(([colName, positions]) => {
    // Use the same geometry logic as the UI
    const geom = calculateColumn(
      positions,
      colName === 'thumb',
      ppm,
      layoutMode,
      keyCount,
    );
    if (!geom) return;

    const { midPoint, rotation, keys: columnKeys } = geom;

    // Calculate rotation
    const rotationDeg = (rotation * 180) / Math.PI;

    // Calculate origin in KLE units
    // midPoint is in pixels. ppm is px/mm. 1u = 19.05mm.
    const rx = midPoint.x / ppm / U_MM;
    const ry = midPoint.y / ppm / U_MM;

    // Generate keys for this column
    columnKeys.forEach((k) => {
      const y_u = k.offset / U_MM;
      keys.push({
        r: rotationDeg,
        rx,
        ry,
        y_u,
        label: k.label || '',
      });
    });
  });

  // Handle empty case
  if (keys.length === 0) {
    return [
      {
        meta: {
          name: 'Ergopad Layout',
          author: 'Ergopad',
        },
      },
    ];
  }

  // Pass 2: Calculate bounds (Min X and Min Y) to normalize
  // We look at the grid coordinates: x = rx, y = ry + y_u
  // And we want the top-left key to be at roughly (1, 1)
  const allGridXs = keys.map((k) => k.rx);
  const allGridYs = keys.map((k) => k.ry + k.y_u);

  const minGridX = Math.min(...allGridXs);
  const minGridY = Math.min(...allGridYs);

  // Add a small margin (e.g., 1u)
  const MARGIN_X = 1;
  const MARGIN_Y = 1;

  const shiftX = -minGridX + MARGIN_X;
  const shiftY = -minGridY + MARGIN_Y;

  // Pass 3: Generate KLE JSON
  const result: any[] = [];

  // Metadata
  result.push({
    meta: {
      name: 'Ergopad Layout',
      author: 'Ergopad',
    },
  });

  let currentRow: any[] = [];
  let currentY = 0;
  let currentX = 0;

  // Track the visual Y coordinate of the first key of the PREVIOUS row.
  // KLE resets Y to (PrevRowStartY + 1).
  let prevRowStartY = 0;

  let currentRx = 0;
  let currentRy = 0;
  let currentR = 0;

  keys.forEach((k, index) => {
    // Apply shift
    const finalRx = k.rx + shiftX;
    const finalRy = k.ry + shiftY;

    // Grid coordinates
    const finalGridX = finalRx; // Since x = rx in our model
    const finalGridY = k.ry + k.y_u + shiftY;

    // Detect Rotation Group Change
    const isNewRotationGroup =
      index === 0 ||
      k.r !== currentR ||
      finalRx !== currentRx ||
      finalRy !== currentRy;

    if (isNewRotationGroup && index > 0) {
      // Push previous row
      result.push(currentRow);
      currentRow = [];
    }

    // Determine Reset Base for X and Y
    let xBase = 0;
    // If this is the start of a new row (which happens at index 0 OR isNewRotationGroup)
    if (index === 0 || isNewRotationGroup) {
      // Reset logic
      // Unified X reset logic: X always resets to the NEW rx (finalRx).
      xBase = finalRx;

      // Y Reset Logic:
      // When Rotation Group changes (r, rx, ry), KLE Web resets Y cursor to the new Anchor (ry).
      // The y property in JSON is an offset from ry.
      // So to get Global Y = finalGridY, we need y_prop = finalGridY - ry.
      // Our delta calculation is yDelta = finalGridY - currentY.
      // Therefore, currentY must be initialized to finalRy.
      currentY = finalRy;

      // We don't need prevRowStartY anymore if we reset to ry.
      // But let's keep the variable declaration or remove it later.

      currentX = xBase;
    }

    // Calculate Deltas
    const xDelta = finalGridX - currentX;
    const yDelta = finalGridY - currentY;

    const key: any = {
      ...(xDelta !== 0 && { x: xDelta }),
      ...(yDelta !== 0 && { y: yDelta }),
      a: 7, // Center align label
    };

    // Output Rotation Props if changed (New Group)
    if (isNewRotationGroup) {
      key.r = k.r;
      key.rx = finalRx;
      key.ry = finalRy;

      // Update global state
      currentR = k.r;
      currentRx = finalRx;
      currentRy = finalRy;
    }

    currentRow.push(key);
    currentRow.push(k.label);

    // Update cursor for NEXT key in SAME row
    // Spec: "x coordinate increases by 1" after each key.
    currentX += xDelta + 1; // +1 width
    currentY += yDelta;
  });

  // Push final row
  if (currentRow.length > 0) {
    result.push(currentRow);
  }

  return result;
};

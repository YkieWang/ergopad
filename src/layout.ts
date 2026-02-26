import { leastSquares } from './leastSquares';
import {
  Point2D,
  projectPointToLine,
  slopeInterceptFormToStandardForm,
} from './geometry';

export const KEY_WIDTH_MM = 17;
export const KEY_GAP_MM = 2;
// Standard spacing (pitch) = 19.05mm
export const KEY_PITCH_MM = 19.05;

export type LayoutMode = 'compact' | 'loose';

export type KeyDefinition = {
  offset: number; // Offset in mm from the column midpoint
  label: string;
};

export type ColumnGeometry = {
  trendline: { m: number; b: number };
  midPoint: Point2D;
  rotation: number;
  isVertical: boolean;
  keys: KeyDefinition[];
};

// Simple 1D K-Means Clustering
const cluster1D = (values: number[], k: number): number[] => {
  if (values.length === 0) return Array(k).fill(0);
  if (k <= 0) return [];
  if (values.length <= k) {
    // If fewer points than clusters, just return the points (padded if needed? No, just return what we have and sort)
    // Actually, if we have 2 points but want 3 keys, we have a problem.
    // For now, let's just return sorted values and fill the rest?
    // Or just return the sorted values. The caller might need to handle k mismatch.
    // But layout usually implies we WANT k keys.
    // If we have fewer data points, K-Means is degenerate.
    // Fallback: Use standard spacing for missing keys?
    // Let's assume we duplicate the last point or distribute evenly.
    // Better: Sort values, take them as centers, add dummy centers if needed.
    const sorted = [...values].sort((a, b) => a - b);
    while (sorted.length < k) {
      sorted.push(sorted[sorted.length - 1] + KEY_PITCH_MM);
    }
    return sorted.slice(0, k);
  }

  // Initialize centers (uniformly distributed across range)
  const min = Math.min(...values);
  const max = Math.max(...values);
  let centers = Array.from(
    { length: k },
    (_, i) => min + (i * (max - min)) / (k - 1 || 1),
  );

  // Iterate
  const MAX_ITER = 10;
  for (let iter = 0; iter < MAX_ITER; iter++) {
    const clusters: number[][] = Array.from({ length: k }, () => []);

    // Assign
    values.forEach((v) => {
      let closestIdx = 0;
      let minDist = Math.abs(v - centers[0]);
      for (let i = 1; i < k; i++) {
        const dist = Math.abs(v - centers[i]);
        if (dist < minDist) {
          minDist = dist;
          closestIdx = i;
        }
      }
      clusters[closestIdx].push(v);
    });

    // Update
    const newCenters = clusters.map((cluster, i) => {
      if (cluster.length === 0) return centers[i]; // Keep old center if empty
      return cluster.reduce((a, b) => a + b, 0) / cluster.length;
    });

    // Check convergence (simple equality check or small epsilon)
    if (newCenters.every((c, i) => Math.abs(c - centers[i]) < 0.01)) {
      centers = newCenters;
      break;
    }
    centers = newCenters;
  }

  return centers.sort((a, b) => a - b);
};

const enforceMinSpacing = (centers: number[], minSpacing: number): number[] => {
  if (centers.length === 0) return [];

  // Clone to avoid mutation
  const result = [...centers];

  // Iterative Spring Relaxation (Bidirectional)
  // Repeat to propagate constraints
  // Usually 2-3 iterations is enough for small N (<=4 keys)
  for (let iter = 0; iter < 10; iter++) {
    let moved = false;
    for (let i = 0; i < result.length - 1; i++) {
      // Distance between i and i+1
      const diff = result[i + 1] - result[i];
      if (diff < minSpacing) {
        const overlap = minSpacing - diff;
        // Push apart symmetrically
        // Move i left by half overlap
        result[i] -= overlap / 2;
        // Move i+1 right by half overlap
        result[i + 1] += overlap / 2;
        moved = true;
      }
    }
    if (!moved) break;
  }

  return result;
};

// Helper to get standard compact offsets
const getCompactOffsets = (keyCount: number): number[] => {
  const stride = KEY_PITCH_MM;
  const offsets: number[] = [0];

  if (keyCount >= 2) offsets.push(stride);
  if (keyCount >= 3) offsets.push(-stride);
  if (keyCount >= 4) offsets.push(2 * stride);

  return offsets.sort((a, b) => a - b);
};

export const calculateColumn = (
  positions: { x: number; y: number }[],
  isThumb: boolean,
  ppm: number, // Added ppm
  layoutMode: LayoutMode = 'compact',
  keyCount: number = 4,
): ColumnGeometry | null => {
  if (positions.length < 2) return null;

  // Use standard regression first to detect horizontal lines
  const trendlineNormal = leastSquares(positions, false);
  let trendline = trendlineNormal;

  // If inverted regression is requested (usually for better vertical accuracy),
  // check if it's safe (i.e. not horizontal).
  // Inverted (X on Y) is bad for Horizontal (Slope of X(Y) is infinite).
  // Standard (Y on X) is bad for Vertical (Slope of Y(X) is infinite).
  const useInverted = !isThumb;

  // Heuristic: If standard slope is small (< 1, i.e. < 45 deg), it's horizontal-ish.
  // Then standard regression is better.
  // If standard slope is large (> 1), it's vertical-ish.
  // Then inverted regression is better (to avoid infinite slope).

  // Note: leastSquares returns 'm'.
  if (useInverted && Math.abs(trendlineNormal.m) > 1) {
    trendline = leastSquares(positions, true);
  }

  // Original logic: always inverted for non-thumb.
  // This caused the horizontal bug because inverted regression on horizontal data (slope 0)
  // tries to fit X = const * Y.
  // Y is constant. X varies.
  // Slope dX/dY = Infinity.
  // leastSquares returns { m: 1/slope, ... } -> m=0.
  // Wait.
  // X = slope * Y + intercept.
  // slope = infinity?
  // If ml-regression returns slope=Infinity.
  // m = 1/Infinity = 0.
  // So inverted regression returns m=0 for Horizontal line?
  // Let's trace `src/leastSquares.ts`:
  // return { m: 1 / res.slope, b: -res.intercept / res.slope };

  // If line is Horizontal (Y=0).
  // X varies. Y constant.
  // Linear Regression X vs Y.
  // Slope = Cov(X,Y) / Var(Y).
  // Var(Y) = 0.
  // Slope = Infinity / NaN.
  // So inverted regression FAILS on horizontal lines.

  // My fix: Dynamically choose regression direction based on data variance or preliminary slope.

  // Simple Fix: Check Var(Y) vs Var(X)?
  // Or just use the heuristic above: If |m| < 1, use normal.

  // Re-evaluating the heuristic:
  // If trendlineNormal.m is 0 (Horizontal). |m| < 1. Use normal. Correct.
  // If trendlineNormal.m is Infinity (Vertical). |m| > 1. Use inverted. Correct.

  // Let's replace the strict `!isThumb` with this smart choice.
  // But maybe `isThumb` implies something about intended orientation?
  // Usually non-thumbs are vertical columns. So inverted is good default.
  // But user can draw horizontal rows (as in test).
  // So we should adapt.

  // Actually, let's keep it simple:
  // Calculate both? Or just check if !isThumb AND variance Y > variance X?

  const xs = positions.map((p) => p.x);
  const ys = positions.map((p) => p.y);
  const rangeX = Math.max(...xs) - Math.min(...xs);
  const rangeY = Math.max(...ys) - Math.min(...ys);

  if (!isThumb && rangeY > rangeX) {
    trendline = leastSquares(positions, true);
  } else {
    trendline = leastSquares(positions, false);
  }

  const isVertical =
    !Number.isFinite(trendline.m) || !Number.isFinite(trendline.b);

  let projections: Point2D[];
  let rotation: number;

  if (isVertical) {
    const avgX = positions.reduce((acc, p) => acc + p.x, 0) / positions.length;
    projections = positions.map((p) => ({ x: avgX, y: p.y }));
    rotation = Math.PI;
  } else {
    projections = positions.map(
      projectPointToLine(slopeInterceptFormToStandardForm(trendline)),
    );
    rotation = Math.PI / 2 + Math.atan(trendline.m);
  }

  // Calculate 1D offsets (tValues) relative to midPoint
  // Direction vector (normalized)
  let dirX: number, dirY: number;
  let tValuesRaw: number[];
  let lineOrigin: Point2D;

  if (isVertical) {
    // Line is x = avgX.
    // Origin: (avgX, 0). Dir: (0, 1) (Down).
    const avgX = positions.reduce((acc, p) => acc + p.x, 0) / positions.length;
    lineOrigin = { x: avgX, y: 0 };
    dirX = 0;
    dirY = 1;
    tValuesRaw = positions.map((p) => p.y);
  } else {
    // Line y = mx + b.
    // Origin: (0, b). Dir: (1, m) normalized.
    const dx = 1;
    const dy = trendline.m;
    const len = Math.sqrt(dx * dx + dy * dy);
    // Tangent direction
    dirX = dx / len;
    dirY = dy / len;
    // Origin at x=0 on line. Y = m*0 + b = b.
    lineOrigin = { x: 0, y: trendline.b };

    // t = dot(P - Origin, Dir)
    tValuesRaw = positions.map(
      (p) => (p.x - lineOrigin.x) * dirX + (p.y - lineOrigin.y) * dirY,
    );

    // Debug for test
    if (Math.abs(trendline.m) < 0.0001 && positions.length === 4) {
      // console.log('DEBUG HORIZONTAL:', { trendline, dirX, dirY, tValuesRaw });
    }
  }

  // Calculate Bounds on Line (t-space)
  const minT = Math.min(...tValuesRaw);
  const maxT = Math.max(...tValuesRaw);
  const midT = (minT + maxT) / 2;

  // Calculate MidPoint (Geometric Center in Pixel Space)
  let midPoint: Point2D;
  if (isVertical) {
    midPoint = { x: lineOrigin.x, y: midT };
  } else {
    midPoint = {
      x: lineOrigin.x + midT * dirX,
      y: lineOrigin.y + midT * dirY,
    };
  }

  // Offsets relative to MidPoint
  // These are the tValues centered around 0
  const tValuesPixels = tValuesRaw.map((t) => t - midT);

  // Logic Branch
  let finalOffsetsMM: number[];

  if (layoutMode === 'compact') {
    finalOffsetsMM = getCompactOffsets(keyCount);
  } else {
    // Loose Mode
    // 1. Convert to mm
    const tValuesMM = tValuesPixels.map((v) => v / ppm);

    // 2. Cluster
    const centersMM = cluster1D(tValuesMM, keyCount);

    // 3. Enforce Constraint
    const constrainedMM = enforceMinSpacing(centersMM, KEY_PITCH_MM);

    // 4. No Recentering
    // To match user expectation: "generated simulated keys position should match clustered points"
    // We do NOT subtract centroid. We use the clustered (and constrained) offsets directly.
    // These offsets are relative to 'midPoint' (geometric center of clicks).
    finalOffsetsMM = constrainedMM;
  }

  // Generate KeyDefinitions
  const keys: KeyDefinition[] = finalOffsetsMM.map((offset) => ({
    offset,
    label: '', // Labels can be assigned by UI/KLE if needed (e.g. based on index)
  }));

  return { trendline, midPoint, rotation, isVertical, keys };
};

export const drawKeyColumn = (two: any, ppm: number, keys: KeyDefinition[]) => {
  const keyWidth = KEY_WIDTH_MM * ppm;
  const keyHeight = keyWidth;

  const shapes = [];

  keys.forEach((k) => {
    const yPos = k.offset * ppm; // relative to group origin
    const rect = two.makeRectangle(0, yPos, keyWidth, keyHeight);
    rect.stroke = 'black';
    rect.linewidth = 2;
    rect.fill = 'transparent';
    shapes.push(rect);
  });

  return two.makeGroup(shapes);
};

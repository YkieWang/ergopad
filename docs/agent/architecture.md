# Architecture

This document describes Ergopad's architectural patterns, data flow, and key design decisions.

## Project Philosophy

Ergopad is built around **functional programming principles** with a focus on type safety, immutability, and pure functions. The 866-line codebase demonstrates how fp-ts patterns can be applied to React applications for robust error handling and predictable state management.

## Core Architectural Patterns

### 1. Functional Programming Foundation (fp-ts)

The codebase heavily uses functional programming concepts from the fp-ts library:

**Either Type for Error Handling**
```typescript
// Instead of try/catch
const getFloat = (key: string): E.Either<string, number> => { ... }
```
- Explicit error handling without exceptions
- Compile-time enforcement of error cases
- Composable error chains via `pipe`

**Option Type for Null Safety**
```typescript
// Instead of null/undefined checks
const value: O.Option<number> = O.some(42)
```

**Task/TaskEither for Async Operations**
```typescript
// Instead of async/await
const setup = (): TE.TaskEither<string, Config> => { ... }
```
- Asynchronous operations as pure functions
- Composable async pipelines
- Type-safe error propagation

**Pipe Composition**
```typescript
pipe(
  { ppm: TE.fromIOEither(getFloat(PIX_PER_MM_LOCALSTORAGE_KEY)) },
  sequenceS(TE.ApplyPar),
)
```
All data transformations use this pattern, making the flow explicit and testable.

### 2. React Hooks-Based State Management

State is managed locally in the `App` component using React hooks:

```typescript
const [column, setColumn] = useState(defaultColumn);
const [positions, setPositions] = useState(defaultPositions);
const [ppm, setPpm] = useState(defaultPpm);
```

**No global state library** - All state flows through props or is kept local. This is intentional given the app's small scope.

**Custom Hooks for Abstractions**
- `useTwo`: Manages Two.js canvas lifecycle
- `useBoolState`: Simple boolean toggle state
- `usePopupState`: Modal visibility state

### 3. Canvas Rendering with Two.js

The `useTwo` hook provides a declarative interface for 2D canvas rendering:

```typescript
const canvasRef = useRef<HTMLDivElement>(null);

useTwo(canvasRef, (two, el) => {
  // Clear and redraw when dependencies change
  two.clear();
  drawKeyboard(two, positions, column);
}, [positions, column]);
```

**Rendering Pipeline in Boo Component:**
1. Calculate trend line from positions using least squares regression
2. Project each tap point onto the trend line
3. Compute midpoint of projected points
4. Draw keyboard key at midpoint, rotated to match line angle
5. Render auxiliary elements (circles at positions, projections, trend line)

### 4. Type-Safe Data Flow

**Discriminated Unions for State**
```typescript
type AsyncEitherData<E, A> =
  | { type: 'idle' }
  | { type: 'pending' }
  | { type: 'failed'; reason: E }
  | { type: 'ready'; data: A }
```
This pattern ensures all states are handled at compile time.

**Domain Types**
```typescript
type Column = 'thumb' | 'index_far' | 'index' | 'middle' | 'ring' | 'pinky';
type Pos = { x: number; y: number };
```
Strong typing prevents invalid states throughout the application.

## Data Flow

```
User Input (Pointer Events)
    ↓
onPointerDown Handler → setPositions(Record<Column, Pos[]>)
    ↓
App State Update
    ↓
Boo Component (derived data calculation)
    ├─ positions[] → leastSquares() → SlopeInterceptFormLine2D
    ├─ trend line → projectPointToLine() → Point2D[] (projections)
    ├─ projections → midPoint calculation
    └─ midPoint + angle → Two.js rendering (keyboard visualization)
    ↓
Canvas Output (SVG-like shapes on HTML5 Canvas)
```

## Module Structure

```
src/
├── index.tsx              - React entry with Windmill theme provider
├── App.tsx               - Main component (504 lines, core logic)
│
├── Functional Data Types:
├── asyncData.ts          - Basic async state hook (Task-based)
├── asyncEitherData.ts    - Async state with errors (TaskEither-based)
│
├── Utility Modules:
├── hooks.ts              - React hooks (useTwo, useBoolState, usePopupState)
├── geometry.ts           - 2D geometry (line projections, conversions)
├── leastSquares.ts       - Statistical regression wrapper
├── localStorage.ts       - Type-safe localStorage with fp-ts
├── copy.ts               - Cross-browser clipboard support
│
└── Styling:
    ├── App.css           - Component styles
    └── index.css         - Global styles
```

## Key Algorithms

### Least Sququares Regression (`leastSquares.ts`)

Fits a trend line through scattered tap positions to identify finger movement direction.

**Special Handling:**
- For thumb column: inverts X/Y axes before regression (handles vertical columns)
- Prevents divide-by-zero for near-vertical lines

**Library:** `ml-regression-simple-linear`

### Point Projection (`geometry.ts`)

Projects tap points onto the trend line to find the center position for the keyboard key.

**Function:** `projectPointToLine(point, line)`
- Uses standard form line equation (Ax + By + C = 0)
- Calculates perpendicular projection distance
- Returns projected point coordinates

### Line Form Conversions (`geometry.ts`)

Converts between mathematical line representations:
- Slope-intercept form: y = mx + b
- Standard form: Ax + By + C = 0

Both forms are useful for different calculations (projection vs. rendering).

## Build & Bundling Strategy

**Snowpack** provides:
- **Dev mode**: Fast rebuilds via individual module compilation
- **HMR**: Hot Module Replacement for instant feedback
- **Production**: Optimized bundle with tree-shaking
- **Mount points**: Flexible source mapping to public URLs

**Key Features:**
- Zero-config TypeScript compilation
- React Fast Refresh for component updates
- PostCSS for Tailwind CSS processing
- Environment variable support via dotenv

## Configuration Management

### Build Configuration
- Snowpack config defines source mapping and plugins
- Tailwind config defines utility class generation
- TypeScript config defines strict type checking

### Application Configuration
- `PIX_PER_MM_LOCALSTORAGE_KEY`: Persists user's pixels-per-millimeter setting
- Default column: `thumb`
- Default positions: Empty arrays for each column

### State Persistence
`localStorage.ts` provides type-safe wrappers using fp-ts Either:
- `getString`, `setString`: String values with error handling
- `getFloat`, `setFloat`: Numeric values with parsing/validation

## UI Component Architecture

**Component Library:** `@windmill/react-ui` (headless UI with dark mode)

**Common Patterns:**
- Functional components with hooks
- Controlled inputs (value + onChange)
- Modal dialogs via usePopupState
- Dropdowns for column selection
- Toast notifications via react-hot-toast

**Styling:**
- Tailwind CSS utility classes for layout
- Custom CSS for canvas-specific needs
- Dark mode support via media queries

## Deployment Architecture

**GitHub Pages** via static site generation:
1. `npm run release` builds and copies to `docs/`
2. Custom domain: `pashutk.ru/ergopad/`
3. Base URL: `/ergopad` (supports subpath routing)
4. No server-side rendering required (SPA)

## Key Design Decisions

**Why fp-ts?**
- Explicit error handling without exceptions
- Composable async operations
- Type-safe transformations
- Encourages pure, testable functions

**Why Two.js?**
- TypeScript types included (twojs-ts package)
- Declarative API for 2D shapes
- Better performance than raw Canvas API
- SVG-like scene graph management

**Why Snowpack?**
- Faster than Webpack for small projects
- Simpler configuration
- Native ESM support
- Built-in HMR

**Why localStorage with fp-ts?**
- Type safety prevents runtime errors
- Either type ensures errors are handled
- Composable with async setup logic
- No external state management library needed

## Extensibility Points

To add new features, consider these patterns:

1. **New finger columns:** Add to `Column` type, update defaultPositions
2. **New algorithms:** Add new modules in `src/`, export pure functions
3. **New UI components:** Import from Windmill, follow existing patterns
4. **New state:** Add useState in App component, pass via props
5. **New persistence:** Add new localStorage wrappers following existing pattern

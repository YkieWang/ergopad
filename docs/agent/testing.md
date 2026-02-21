# Testing

This document describes the test infrastructure, conventions, and patterns used in this codebase.

## Test Framework

**Runner:** `@web/test-runner` (browser-based test runner)

**Assertion Library:** `chai` (BDD-style assertions: `expect().to.equal()`)

**React Testing:** `@testing-library/react`

**Test Runner Configuration:** `web-test-runner.config.js`

## Running Tests

### Run All Tests
```bash
npm test
```
Runs all test files matching `src/**/*.test.tsx` in a headless Chromium browser.

### Debug Tests
To run tests in a visible browser for debugging:
1. Edit `web-test-runner.config.js`
2. Set `headless: false` in the config object
3. Run `npm test`
4. Browser window will open showing test results

## Current Test Coverage

**Single Test File:** `src/App.test.tsx` (13 lines)

```typescript
describe('<App>', () => {
  it('renders learn react link', () => {
    const { getByText } = render(<App />);
    const linkElement = getByText(/learn react/i);
    expect(document.body.contains(linkElement));
  });
});
```

**Status:** ⚠️ **Placeholder test** - This test is outdated and doesn't reflect current App functionality.

## Test Conventions

### File Naming
- Test files: `*.test.tsx` or `*.test.ts`
- Co-located with source: Place tests alongside files they test
- Example: `App.test.tsx` tests `App.tsx`

### Test Structure
```typescript
describe('<ComponentName>', () => {
  describe('specific feature', () => {
    it('should do X', () => {
      // Arrange
      // Act
      // Assert
    });
  });
});
```

### React Testing Library Patterns
```typescript
// Render component
const { getByText, getByRole, queryByTestId } = render(<App />);

// Query elements
const button = getByRole('button', { name: /submit/i });

// Simulate events
fireEvent.click(button);
userEvent.click(button); // Better alternative (from @testing-library/user-event)

// Assert
expect(button).toBeDisabled();
expect(getByText('Success')).toBeInTheDocument();
```

## Recommended Test Coverage Areas

### 1. Core Algorithm Tests (`geometry.ts`, `leastSquares.ts`)

**Test leastSquares.ts:**
```typescript
describe('leastSquares', () => {
  it('should calculate correct trend line for diagonal points', () => {
    const points = [{ x: 0, y: 0 }, { x: 1, y: 1 }, { x: 2, y: 2 }];
    const result = leastSquares(points);
    expect(result.slope).to.be.closeTo(1, 0.01);
    expect(result.intercept).to.be.closeTo(0, 0.01);
  });

  it('should handle vertical lines (thumb column)', () => {
    const points = [{ x: 0, y: 0 }, { x: 0, y: 10 }];
    const result = leastSquares(points, true); // isInverted = true
    expect(result).to.be.an('object');
  });
});
```

**Test geometry.ts:**
```typescript
describe('projectPointToLine', () => {
  it('should project point onto line correctly', () => {
    const line = standardForm(1, -1, 0); // y = x
    const point = { x: 2, y: 4 };
    const projection = projectPointToLine(point, line);
    expect(projection.x).to.be.closeTo(3, 0.01);
    expect(projection.y).to.be.closeTo(3, 0.01);
  });
});
```

### 2. Hook Tests (`hooks.ts`)

```typescript
describe('useBoolState', () => {
  it('should initialize with default value', () => {
    const { result } = renderHook(() => useBoolState(true));
    expect(result.current[0]).to.be.true;
  });

  it('should toggle value', () => {
    const { result } = renderHook(() => useBoolState(false));
    const [, toggle] = result.current;
    act(() => toggle());
    expect(result.current[0]).to.be.true;
  });
});
```

### 3. Component Integration Tests

**Test pointer event handling:**
```typescript
describe('App pointer handling', () => {
  it('should record position on pointer down', () => {
    const { container } = render(<App />);
    const canvas = container.querySelector('canvas');

    fireEvent.pointerDown(canvas, { clientX: 100, clientY: 200 });

    // Assert position was recorded (check positions state or rendered output)
  });
});
```

**Test column switching:**
```typescript
it('should update column when dropdown changes', () => {
  const { getByRole } = render(<App />);
  const dropdown = getByRole('combobox');

  fireEvent.change(dropdown, { target: { value: 'index' } });

  // Assert column state updated
});
```

### 4. localStorage Tests

```typescript
describe('localStorage', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('should save and retrieve string', () => {
    setString('test-key', 'hello');
    const result = getString('test-key');
    expect(result).to.deep.equal(E.right('hello'));
  });

  it('should return left for missing key', () => {
    const result = getString('non-existent');
    expect(result).to.deep.equal(E.left('key non-existent not found'));
  });
});
```

### 5. asyncEitherData Hook Tests

```typescript
describe('useAsyncEitherData', () => {
  it('should render loading state during async operation', async () => {
    const { getByText } = render(<TestComponent />);
    expect(getByText('Loading')).to.exist;
    await waitFor(() => getByText('Ready'));
  });

  it('should render error state on failure', async () => {
    const { getByText } = render(<FailingComponent />);
    await waitFor(() => getByText(/Error/i));
  });
});
```

## Mocking Patterns

### Mock Two.js
```typescript
jest.mock('two.js', () => ({
  default: jest.fn().mockImplementation(() => ({
    clear: jest.fn(),
    makeCircle: jest.fn(() => ({ fill: jest.fn() })),
    makeLine: jest.fn(() => ({ stroke: jest.fn() })),
    update: jest.fn(),
  })),
}));
```

### Mock localStorage
```typescript
const localStorageMock = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  clear: jest.fn(),
};
global.localStorage = localStorageMock;
```

## Best Practices

1. **Test behavior, not implementation** - Focus on what the component does, not how it does it
2. **Use React Testing Library queries** - `getByRole`, `getByText`, not `querySelector`
3. **Test error paths** - Ensure both success and error cases are covered
4. **Test async operations** - Use `waitFor` or `act()` for async state updates
5. **Avoid testing implementation details** - Don't test internal function names or CSS classes
6. **Mock external dependencies** - Two.js, localStorage, browser APIs
7. **Keep tests fast** - Use shallow rendering where appropriate, avoid real browser when possible

## Running Coverage

The current setup doesn't have a coverage command configured. To add coverage:

1. Install dependency:
```bash
npm install --save-dev @cypress/code-coverage
```

2. Update `web-test-runner.config.js` to add coverage plugin

3. Add script to `package.json`:
```json
"test:coverage": "npm test -- --coverage"
```

## CI/CD Integration

Tests should run in CI/CD pipeline before deployment:
```yaml
# Example for GitHub Actions
- name: Run tests
  run: npm test
```

The current repository doesn't have CI/CD configured. Consider adding:
- Pre-commit hooks (husky + lint-staged)
- GitHub Actions for automated testing on PR
- Coverage reporting (Codecov)

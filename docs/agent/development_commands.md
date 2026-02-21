# Development Commands

This document provides comprehensive information about all available npm scripts and development workflows.

## Available Scripts

### Development

```bash
npm start
```
Starts Snowpack development server with hot-reload on `localhost:8080`. This is the primary command for active development. Changes to source files trigger automatic rebuilds and browser refresh.

### Build & Production

```bash
npm run build
```
Builds the application for production using Snowpack. Outputs to `build/` directory. Includes:
- TypeScript compilation
- React JSX transformation
- Asset optimization
- Bundle generation

```bash
npm run release
```
Prepares the application for GitHub Pages deployment:
1. Runs `npm run build`
2. Removes existing `docs/` directory
3. Copies `build/` contents to `docs/`
4. Creates `docs/.nojekyll` file (prevents Jekyll processing)

After running, commit and push to trigger GitHub Pages deployment.

### Testing

```bash
npm test
```
Runs all tests using `@web/test-runner`. Tests files matching `src/**/*.test.tsx` pattern in a real browser environment. Headless by default.

### Code Quality

```bash
npm run format
```
Formats all source files using Prettier:
- Target: `src/**/*.{js,jsx,ts,tsx}`
- Configured in `.prettierrc`: single quotes, trailing commas, no semicolons

```bash
npm run lint
```
Checks code formatting without making changes (dry-run). Useful for CI/CD pipelines.

## Configuration Files

### Snowpack Configuration (`snowpack.config.mjs`)
- **Mount points**: `/` → `public/`, `/dist` → `src/`
- **Plugins**: postcss, react-refresh, typescript, dotenv
- **Base URL**: `/ergopad` (GitHub Pages subpath)

### TypeScript Configuration (`tsconfig.json`)
- Strict mode enabled
- Target: ESNext
- Module resolution: node
- JSX: preserve (handled by Snowpack)

### Prettier Configuration (`.prettierrc`)
```json
{
  "singleQuote": true,
  "semi": false,
  "trailingComma": "all"
}
```

### Test Configuration (`web-test-runner.config.js`)
- Test files: `src/**/*.test.tsx`
- Framework: Mocha
- Assertion: Chai
- Browser: Chromium (headless)

## Development Workflow

### Starting a New Feature
```bash
npm start              # Start dev server
# Make changes in src/
# Hot-reload will reflect changes automatically
```

### Pre-commit Checks
```bash
npm run format         # Format code
npm run lint           # Verify formatting
npm test               # Run tests
```

### Preparing for Release
```bash
npm run build          # Verify production build works
npm run format         # Ensure code is formatted
npm test               # Run tests
npm run release        # Build for GitHub Pages
git add docs/          # Stage docs/ for commit
git commit             # Commit changes
git push               # Deploy to GitHub Pages
```

## Troubleshooting

### Snowpack Cache Issues
If you see stale build artifacts:
```bash
rm -rf .snowpack build
npm start
```

### Type Errors
TypeScript errors are reported in both the terminal and browser overlay during development. All source files must pass type checking before build succeeds.

### Test Failures
Tests run in a headless browser. To debug, temporarily set `headless: false` in `web-test-runner.config.js`.

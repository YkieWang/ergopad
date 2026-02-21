# AGENTS.md

This file provides guidance to codeflicker when working with code in this repository.

## WHY: Purpose and Goals
Ergopad creates custom ergonomic keyboard layouts by analyzing touchscreen finger tap positions through statistical regression. It helps users design personalized keyboard layouts optimized for their hand geometry.
- Live demo: https://pashutk.ru/ergopad/
- Status: Pre-release

## WHAT: Technical Stack
- Runtime/Language: Node.js, TypeScript (strict mode)
- Framework: React 17 with functional components
- Key dependencies: fp-ts (functional programming), two.js (2D canvas), @windmill/react-ui, ml-regression-simple-linear, Snowpack

## HOW: Core Development Workflow
```bash
# Development
npm start          # Snowpack dev server with hot-reload

# Testing
npm test           # Run @web/test-runner browser tests

# Build & Deploy
npm run build      # Production build to build/
npm run release    # Build + copy to docs/ for GitHub Pages
```

## Progressive Disclosure

For detailed information, consult these documents as needed:

- `docs/agent/development_commands.md` - All build, test, lint, release commands
- `docs/agent/architecture.md` - Module structure and architectural patterns
- `docs/agent/testing.md` - Test setup, frameworks, and conventions

**When working on a task, first determine which documentation is relevant, then read only those files.**

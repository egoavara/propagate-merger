# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a TypeScript-based GitHub Action called **propagate-merger** that automatically propagates hotfix changes across multiple branches using configurable merge strategies and semantic versioning.

## Essential Commands

### Development
```bash
npm run build          # TypeScript compile + ncc bundle (generates dist/index.js)
npm run dev           # TypeScript watch mode for development
npm test              # Run Jest tests
```

### Code Quality (Biome)
```bash
npm run check:fix     # Run all checks and auto-fix issues (recommended)
npm run lint          # Lint check only
npm run lint:fix      # Auto-fix lint issues
npm run format:write  # Apply code formatting
```

**Important**: Always run `npm run build` before committing to generate the required `dist/index.js` file for GitHub Actions.

## Architecture

### Core Structure
- **Entry Point**: `src/main.ts` - Routes to appropriate mode handler
- **Mode Handlers**: 
  - `main-branch-create.ts` - Creates hotfix branches from tags
  - `main-auto-merge.ts` - Propagates hotfix changes across branches
- **Core Engine**: `HotfixManager` class in `hotfix-manager.ts` - Handles all hotfix operations
- **Utilities**: `utils/semver.ts` - Semantic version parsing and comparison

### Two-Stage Propagation Flow
1. **Stage 1 (Direct Merge)**: Propagates to `main` and future `release/*` branches
2. **Stage 2 (Update-then-Merge)**: Syncs hotfix with `dev` branch, then propagates back

### Semantic Version Filtering
The system only propagates to branches with versions newer than the hotfix base version. This prevents applying hotfixes to older releases. Version extraction from branch names uses patterns like `release/v1.2.3` or `v1.2.3`.

## Key Concepts

### Hotfix Branch Naming
Format: `hotfix/v{version}-{suffix}` (e.g., `hotfix/v0.1.2-hotfix.1`)

### Conflict Handling
- Automatic merge when possible
- Creates PR for manual resolution when conflicts detected
- Supports partial success scenarios

### GitHub Action Modes
- `branch-create`: Creates hotfix branch from version tag
- `auto-merge`: Propagates existing hotfix across target branches

## TypeScript Configuration

- **Target**: ES2022 with CommonJS modules
- **Output**: `./lib` directory
- **Bundling**: Uses `@vercel/ncc` to create single `dist/index.js` file
- **Strict mode**: Enabled with comprehensive type checking

## Code Quality Standards

### Biome Configuration
- 2-space indentation, 100-character line width
- Single quotes for JavaScript/TypeScript
- Cognitive complexity limit: 64 (adjusted from default 15)
- Strict linting rules with `unknown` types preferred over `any`

### Error Handling Patterns
Use proper type guards for error handling:
```typescript
} catch (error: unknown) {
  if (error && typeof error === 'object' && 'status' in error && error.status === 404) {
    // Handle 404 specifically
  }
  // General error handling
}
```

## Required Inputs
- `mode`: Execution mode (branch-create or auto-merge)
- `version`: Target version (e.g., v0.1.2)
- `hotfix-suffix`: Hotfix identifier (default: hotfix.1)
- `github-token`: Authentication token

## Development Workflow
1. Make changes to TypeScript source files
2. Run `npm run check:fix` to ensure code quality
3. Run `npm test` to verify functionality
4. Run `npm run build` to generate distribution files
5. Commit both source and generated files
# Propagate Merger

GitHub Action to automatically propagate hotfix changes across branches using configurable merge strategies and semantic versioning.

## Features

- 🌿 **Hotfix Branch Creation**: Create hotfix branches from Git tags
- 🔄 **Smart Propagation**: Two-stage propagation with semantic version filtering
- 🎯 **Multiple Merge Strategies**: Direct merge and update-then-merge approaches
- 🤖 **Auto-merge Capability**: Conflict-free automatic merging
- 🧹 **Branch Cleanup**: Optional hotfix branch removal after propagation
- ⚠️ **Conflict Detection**: Intelligent conflict detection and reporting
- 📊 **Detailed Reporting**: Comprehensive output information

## Quick Start

### 1. Create Hotfix Branch

```yaml
name: Create Hotfix
on:
  workflow_dispatch:
    inputs:
      version:
        description: 'Version to hotfix (e.g. v0.1.2)'
        required: true

jobs:
  create-hotfix:
    runs-on: ubuntu-latest
    steps:
      - name: Create Hotfix Branch
        uses: egoavara/propagate-merger@v1
        with:
          mode: branch-create
          version: ${{ github.event.inputs.version }}
          hotfix-suffix: hotfix.1
          github-token: ${{ secrets.GITHUB_TOKEN }}
```

### 2. Propagate Hotfix

```yaml
name: Propagate Hotfix
on:
  workflow_dispatch:
    inputs:
      version:
        description: 'Version to propagate (e.g. v0.1.2)'
        required: true

jobs:
  propagate-hotfix:
    runs-on: ubuntu-latest
    steps:
      - name: Propagate Hotfix
        uses: egoavara/propagate-merger@v1
        with:
          mode: auto-merge
          version: ${{ github.event.inputs.version }}
          hotfix-suffix: hotfix.1
          github-token: ${{ secrets.GITHUB_TOKEN }}
```

## Inputs

| Input | Description | Required | Default |
|-------|-------------|----------|---------|
| `mode` | Execution mode (`branch-create` or `auto-merge`) | Yes | - |
| `version` | Hotfix target version (e.g. `v0.1.2`) | Yes | - |
| `hotfix-suffix` | Hotfix suffix (e.g. `hotfix.1`) | Yes | `hotfix.1` |
| `github-token` | GitHub token for authentication | Yes | `${{ github.token }}` |
| `direct-merge-branches` | Stage 1: Direct merge branch patterns | No | `main,release/*` |
| `update-then-merge-branches` | Stage 2: Update then merge branches | No | `dev` |
| `auto-cleanup` | Auto-delete hotfix branch after propagation | No | `true` |

## Outputs

| Output | Description |
|--------|-------------|
| `hotfix-branch` | Created or processed hotfix branch name |
| `base-version` | Base version tag used for branch creation |
| `propagation-result` | Propagation result (`success`, `partial`, `failed`) |
| `successful-branches` | Successfully propagated branches (JSON) |
| `failed-branches` | Failed propagation branches (JSON) |
| `created-prs` | Created PR numbers (JSON) |

## How It Works

### Branch Creation Mode (`mode: branch-create`)
1. Validates the target version tag exists
2. Checks for existing hotfix branches (only one allowed)
3. Creates `hotfix/v{version}-{suffix}` branch from the version tag
4. Pushes the branch to remote repository

### Propagation Mode (`mode: auto-merge`)
1. **Stage 1 - Direct Merge**: Propagates to `main` and future `release/*` branches
2. **Stage 2 - Update Then Merge**: Updates hotfix branch with `dev`, then propagates back
3. **Cleanup**: Optionally deletes hotfix branch after successful propagation

### Semantic Version Filtering
- Only propagates to **future versions** based on semantic versioning
- Example: `v0.1.2-hotfix.1` propagates to `v0.2.0` but not `v0.1.1`
- Uses intelligent version comparison for accurate filtering

## Complete Workflow Example

```yaml
name: Hotfix Management
on:
  workflow_dispatch:
    inputs:
      action:
        description: 'Action to perform'
        required: true
        type: choice
        options:
          - create-hotfix
          - propagate-hotfix
      version:
        description: 'Version (e.g. v0.1.2)'
        required: true

jobs:
  create-hotfix:
    if: github.event.inputs.action == 'create-hotfix'
    runs-on: ubuntu-latest
    steps:
      - name: Create Hotfix Branch
        uses: egoavara/propagate-merger@v1
        with:
          mode: branch-create
          version: ${{ github.event.inputs.version }}
          hotfix-suffix: hotfix.1
          github-token: ${{ secrets.GITHUB_TOKEN }}

  propagate-hotfix:
    if: github.event.inputs.action == 'propagate-hotfix'
    runs-on: ubuntu-latest
    steps:
      - name: Propagate Hotfix
        id: propagate
        uses: egoavara/propagate-merger@v1
        with:
          mode: auto-merge
          version: ${{ github.event.inputs.version }}
          hotfix-suffix: hotfix.1
          github-token: ${{ secrets.GITHUB_TOKEN }}
      
      - name: Report Results
        run: |
          echo "Propagation result: ${{ steps.propagate.outputs.propagation-result }}"
          echo "Successful branches: ${{ steps.propagate.outputs.successful-branches }}"
          echo "Failed branches: ${{ steps.propagate.outputs.failed-branches }}"
```

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
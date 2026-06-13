# JavaScript Workflows

The JavaScript workflows detect npm, yarn, and pnpm from lockfiles.

## Static Analysis

```yml
jobs:
  static-analysis:
    uses: sympress/reusable-workflows/.github/workflows/javascript-static-analysis.yml@main
    with:
      working_directory: packages/example
      script: typecheck
```

If the configured script is missing, the workflow runs `tsc --noEmit` when TypeScript is installed.

## Unit Tests

```yml
jobs:
  unit-js:
    uses: sympress/reusable-workflows/.github/workflows/javascript-unit.yml@main
    with:
      script: test
```

If the configured script is missing, the workflow runs Jest when it is installed.


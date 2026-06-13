# JavaScript Workflows

The JavaScript workflows detect npm, yarn, and pnpm from lockfiles and use
matching dependency caches.

If no JavaScript lockfile exists, workflows fail by default instead of running
`npm install`. Prefer committing a lockfile. Use
`allow_unpinned_node_install: true` only for trusted compatibility callers.

## Static Analysis

```yml
jobs:
  static-analysis:
    uses: sympress/workflows/.github/workflows/javascript-static-analysis.yml@v1
    with:
      working_directory: packages/example
      script: typecheck
```

If the configured script is missing, the workflow runs `tsc --noEmit` when TypeScript is installed.
Custom `command` values require `allow_custom_command: true`.

## Unit Tests

```yml
jobs:
  unit-js:
    uses: sympress/workflows/.github/workflows/javascript-unit.yml@v1
    with:
      script: test
```

If the configured script is missing, the workflow runs Jest when it is installed.
Custom `command` values require `allow_custom_command: true`.

Coverage is uploaded to Codecov when `CODECOV_TOKEN` is provided and
`codecov_upload` is enabled. The default coverage file is `coverage/lcov.info`.

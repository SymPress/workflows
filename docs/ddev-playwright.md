# DDEV Playwright

Use `ddev-playwright.yml` for SymPress Starter projects or other DDEV-backed WordPress setups.

```yml
jobs:
  e2e:
    uses: sympress/workflows/.github/workflows/ddev-playwright.yml@v1
    with:
      php_version: '8.5'
      node_version: '24'
```

The workflow supports:

- DDEV PHP and Node version overrides;
- host and DDEV environment variables from JSON secrets;
- Composer auth and npm auth files;
- SSH home additions for private dependencies;
- optional ngrok setup through a caller-provided command;
- artifact upload and DDEV shutdown on failure.

The default Playwright install command uses pnpm, yarn, or npm lockfiles inside
DDEV and fails when no lockfile exists. Use `allow_unpinned_node_install: true`
only for the legacy `ddev exec npm install && npx playwright install --with-deps`
compatibility command.

Custom DDEV, setup, Playwright, and ngrok commands are disabled by default.
Set `allow_custom_commands: true` only for trusted workflow calls. Hidden files
are excluded from Playwright artifacts unless
`playwright_artifact_include_hidden_files: true` is set.

# DDEV Playwright

Use `ddev-playwright.yml` for SymPress Starter projects or other DDEV-backed WordPress setups.

```yml
jobs:
  e2e:
    uses: sympress/reusable-workflows/.github/workflows/ddev-playwright.yml@main
    with:
      php_version: '8.5'
      node_version: '24'
      setup_command: bin/console setup sympress-ci
      playwright_install_command: ddev exec npm install && npx playwright install --with-deps
      playwright_run_command: npx playwright test
```

The workflow supports:

- DDEV PHP and Node version overrides;
- host and DDEV environment variables from JSON secrets;
- Composer auth and npm auth files;
- SSH home additions for private dependencies;
- optional ngrok setup through a caller-provided command;
- artifact upload and DDEV shutdown on failure.


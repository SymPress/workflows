# Playwright

Use `playwright.yml` for browser tests that can run directly on the GitHub runner.

```yml
jobs:
  e2e:
    uses: sympress/reusable-workflows/.github/workflows/playwright.yml@v1
    with:
      playwright_script: test:e2e
      playwright_artifact_path: |
        playwright-report/
        test-results/
```

The workflow can install Composer dependencies, install Node dependencies, build assets, start `wp-env`, start ngrok, append TestRail/Xray variables to `.env.ci`, and upload artifacts even when tests fail.

`pre_script` is disabled by default. Set `allow_inline_scripts: true` only when
the caller repository is trusted. Hidden files are excluded from artifacts
unless `playwright_artifact_include_hidden_files: true` is set.

# Playwright

Use `playwright.yml` for browser tests that can run directly on the GitHub runner.

```yml
jobs:
  e2e:
    uses: sympress/reusable-workflows/.github/workflows/playwright.yml@main
    with:
      playwright_script: test:e2e
      playwright_artifact_path: |
        playwright-report/
        test-results/
```

The workflow can install Composer dependencies, install Node dependencies, build assets, start `wp-env`, start ngrok, append TestRail/Xray variables to `.env.ci`, and upload artifacts even when tests fail.


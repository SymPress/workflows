# Feature Map

The workflow set covers the full automation surface SymPress projects currently need.

## Quality

- `composer-validate.yml`: Composer validate and audit.
- `php-lint.yml`: PHP syntax linting without requiring dependencies.
- `php-coding-standards.yml`: PHPCS with Composer script auto-detection.
- `php-static-analysis.yml`: PHPStan, Psalm, or Composer script auto-detection.
- `php-unit.yml`: PHPUnit with `test:unit`, `test`, and `tests` script support.
- `sympress-qa.yml`: Root plus `packages/*` package discovery for monorepos.
- `javascript-static-analysis.yml`: TypeScript or package script static analysis.
- `javascript-unit.yml`: package test script or Jest fallback.
- `wp-scripts-lint.yml`: `@wordpress/scripts` linting for JS, styles, docs, and package metadata.
- `lint-workflows.yml`: actionlint for GitHub Actions workflow files.
- `codeql.yml`: reusable CodeQL scanning.

## Build, Release, Distribution

- `assets-build.yml`: Composer asset compiler and Node build scripts.
- `wordpress-archive.yml`: Plugin/theme artifact staging with `.distignore`.
- `build-and-distribute.yml`: Build branch publication, artifact upload, version/header updates.
- `automatic-release.yml`: semantic-release with a SymPress fallback config.

## Runtime Checks And Delivery

- `playwright.yml`: Node/wp-env Playwright flow with optional ngrok and reporting variables.
- `ddev-playwright.yml`: DDEV-oriented Playwright flow for SymPress Starter projects.
- `deploy-deployer.yml`: Deployer flow with SSH and optional WireGuard.
- `woo-qit.yml`: WooCommerce QIT execution against a generated artifact.

## SymPress Improvements

- Defaults match current SymPress projects: PHP 8.5, Node 24, Composer 2.
- Package workflows expose `working_directory`.
- Monorepo QA discovers root and `packages/*` packages.
- Optional JSON `ENV_VARS` supports both object and array formats.
- Secrets are optional unless a workflow cannot work without them.
- Build workflows avoid same-branch writes unless explicitly allowed.
- `.distignore` is supported for package artifacts.


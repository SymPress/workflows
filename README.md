# SymPress Reusable Workflows

Reusable GitHub Actions workflows for SymPress packages, WordPress projects,
and Composer-first monorepos.

## Why this repo exists

SymPress projects share the same recurring automation needs: Composer installs,
PHPCS, PHPStan, PHPUnit, asset builds, WordPress archives, Playwright checks,
semantic releases, and optional deployments. This repository keeps those
workflows in one place so project repositories only describe when automation
should run and which inputs differ.

## Feature Set

- PHPCS linting, PHPStan static analysis, unit tests, and Composer validation.
- SymPress package QA for root projects and `packages/*` monorepos.
- JavaScript static analysis and unit tests with npm, yarn, or pnpm detection.
- `@wordpress/scripts` linting for JS, styles, Markdown, and `package.json`.
- GitHub Actions linting through actionlint.
- Composer-aware asset builds for `sympress/asset-compiler` projects.
- Build-and-distribute workflow for compiled build branches and downloadable
  artifacts.
- WordPress plugin/theme archive creation with `.distignore` support.
- Semantic release with a built-in fallback release config.
- Deployer-based deployments.
- Playwright and DDEV Playwright workflows, including optional ngrok support.
- WooCommerce QIT workflow for extension archives.
- CodeQL workflow for reusable PHP security scanning.

## Calling a workflow

```yml
name: QA

on:
  pull_request:
  push:
    branches:
      - main

permissions:
  contents: read

jobs:
  qa:
    uses: sympress/reusable-workflows/.github/workflows/sympress-qa.yml@main
    with:
      php_version: '8.5'
```

Pin production repositories to a release tag once this repository starts
publishing tagged releases.

## Recommended Workflows

- [SymPress QA](docs/sympress-qa.md) for Composer projects and package
  monorepos.
- [Feature map](docs/feature-map.md) for the complete workflow coverage.
- [PHP](docs/php.md) for focused PHPCS, PHPStan, and PHPUnit jobs.
- [JavaScript](docs/javascript.md) for static analysis and unit tests.
- [WordPress scripts](docs/wp-scripts.md) for `@wordpress/scripts` linting.
- [Assets](docs/assets.md) for `sympress/asset-compiler` and npm builds.
- [Build and distribute](docs/build-and-distribute.md) for compiled build
  branches and artifacts.
- [Archive creation](docs/archive.md) for WordPress plugin/theme archives.
- [Release](docs/release.md) for semantic-release automation.
- [Playwright](docs/playwright.md) and [DDEV Playwright](docs/ddev-playwright.md)
  for browser tests.
- [Deployment](docs/deploy.md) for Deployer-based releases.
- [Woo QIT](docs/woo-qit.md) for WooCommerce extension checks.

## Design Defaults

- PHP 8.5, Composer 2, and Node 24.
- `working-directory` input on package-level workflows.
- `COMPOSER_AUTH_JSON`, `NPM_REGISTRY_TOKEN`, and `ENV_VARS` secrets are
  optional unless a workflow genuinely needs them.
- Build workflows set `COMPOSER_MIRROR_PATH_REPOS=1` so Composer path
  repositories are copied into distributable builds instead of symlinked.
- Workflows use read-only repository permissions unless they push, release, or
  deploy.

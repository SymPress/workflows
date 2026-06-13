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
- Contract tests, zizmor checks, and a workflow catalog for repository-level
  governance.

## Quick Start

Set up this repository once, then add small caller workflow files to consumer
repositories.

1. Push this repository to GitHub as `sympress/reusable-workflows`.
2. If the repository is private or internal, allow access under
   `Settings -> Actions -> General -> Access`.
3. Create a release tag, for example `v1.0.0`.
4. Add a caller workflow in a consumer repository.

```bash
git tag v1.0.0
git push origin v1.0.0
```

See [Installation](docs/installation.md) for the full repository and access
setup.

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
    uses: sympress/reusable-workflows/.github/workflows/sympress-qa.yml@v1
    with:
      php_version: '8.5'
```

Reusable workflows are called at job level with `jobs.<job_id>.uses`. See
[Usage](docs/usage.md) for permissions, secrets, outputs, and common recipes.

## Documentation

- [Documentation index](docs/index.md) for all guides.
- [Installation](docs/installation.md) for repository setup, private access,
  release tags, first consumer workflow, and secrets.
- [Usage](docs/usage.md) for day-to-day workflow calls.
- [Consumer setup checklist](docs/consumer-setup.md) for onboarding a project.
- [Enterprise WordPress monorepo QA](docs/enterprise-wordpress-monorepo.md) for
  root application install checks plus package-level PHPCS/PHPStan.
- [Workflow reference](docs/workflow-reference.md) for operators.
- [Troubleshooting](docs/troubleshooting.md) for common GitHub Actions errors.
- [Maintainer guide](docs/maintainer-guide.md) for changing this repository.

## Workflow Guides

- [SymPress QA](docs/sympress-qa.md) for Composer projects and package
  monorepos.
- [Decision guide](docs/decision-guide.md) for choosing the smallest useful
  workflow.
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
- [Security hardening](docs/security-hardening.md) for artifact, shell, SSH,
  and supply-chain defaults.
- [Release strategy](docs/release-strategy.md) for tags and migration policy.

## Design Defaults

- PHP 8.5, Composer 2, and Node 24.
- `working-directory` input on package-level workflows.
- `COMPOSER_AUTH_JSON`, `NPM_REGISTRY_TOKEN`, and `ENV_VARS` secrets are
  optional unless a workflow genuinely needs them.
- Build workflows set `COMPOSER_MIRROR_PATH_REPOS=1` so Composer path
  repositories are copied into distributable builds instead of symlinked.
- Workflows use read-only repository permissions unless they push, release, or
  deploy.
- Artifact workflows block secret-like files by default. `.env.example` and
  `.env.dist` are allowed; a real `.env` must be explicitly allowlisted when it
  is intentionally non-secret.
- Free-form shell inputs are disabled by default and require an explicit
  `allow_*` input.
- Node workflows detect npm, yarn, and pnpm lockfiles for dependency caching.

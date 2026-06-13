# Feature Map

The workflow set covers the full automation surface SymPress projects currently need.

## Quality

- `composer-validate.yml`: Composer validate and audit.
- `php-coding-standards.yml`: PHPCS with Composer script auto-detection.
- `php-static-analysis.yml`: PHPStan or Composer script auto-detection.
- `php-unit.yml`: PHPUnit with `test:unit`, `test`, and `tests` script support.
- `sympress-qa.yml`: Root plus `packages/*` package discovery for monorepos.
- `javascript-static-analysis.yml`: TypeScript or package script static analysis.
- `javascript-unit.yml`: package test script or Jest fallback.
- `wp-scripts-lint.yml`: `@wordpress/scripts` linting for JS, styles, docs, and package metadata.
- `text-quality.yml`: Typos, CSpell, and optional PR grammar review.
- `lint-workflows.yml`: actionlint for GitHub Actions workflow files.
- `codeql.yml`: CodeQL scanning.

## Build, Release, Distribution

- `assets-build.yml`: Composer asset compiler and Node build scripts.
- `wordpress-archive.yml`: Plugin/theme artifact staging with `.distignore`.
- `wordpress-archive-check.yml`: Artifact hygiene, PHP syntax, and Plugin Check PHPCS review.
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
- JSON environment variable names are validated and reserved runner variables
  are blocked.
- Secrets are optional unless a workflow cannot work without them.
- Build workflows avoid same-branch writes unless explicitly allowed.
- `.distignore` is supported for package artifacts.
- Artifact workflows block secret-like files and validate staged packages.
- Artifact workflows generate manifests and checksum files by default.
- Artifact workflows can create GitHub Artifact Attestations for generated
  manifests.
- Shell command overrides are disabled unless a caller opts in explicitly.
- Node workflows use npm, yarn, or pnpm lockfiles for dependency caching and
  reject lockfile-less installs unless explicitly allowed.
- `npm run doctor -- <repo>` provides consumer onboarding diagnostics, JSON
  output, and optional `--fail-on` CI gating.
- `workflow-catalog.json` documents trust level, category, and permissions.

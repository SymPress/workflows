# Decision Guide

Use the smallest workflow that covers the job. Smaller workflow calls need
fewer secrets, fewer permissions, and are easier to make required checks.

Start with [Installation](installation.md), then use
[Consumer Setup Checklist](consumer-setup.md) for project onboarding.

## Quality

- Use `sympress-qa.yml` for Composer-first repositories and monorepos.
- Use focused PHP workflows when a repository needs separate required checks.
- Use `wp-scripts-lint.yml` for projects standardized on `@wordpress/scripts`.
- Use JavaScript workflows for non-WordPress packages or custom toolchains.

## Build And Artifacts

- Use `assets-build.yml` when the repository only needs compiled assets.
- Use `wordpress-archive.yml` for plugin or theme ZIP inputs.
- Use `build-and-distribute.yml` only when a compiled build branch is needed.

Prefer `wordpress-archive.yml` for release artifacts because it stays read-only.
`build-and-distribute.yml` needs `contents: write` and a push credential.

## Browser Checks

- Use `playwright.yml` when tests run directly on the GitHub runner.
- Use `ddev-playwright.yml` when DDEV is part of the project contract.

Custom setup commands are disabled by default. Enable them only in trusted
repositories where maintainers control the called workflow inputs.

## Delivery

- Use `automatic-release.yml` for semantic-release and GitHub releases.
- Use `deploy-deployer.yml` for Deployer-based environments.
- Use `woo-qit.yml` after an archive workflow for WooCommerce extensions.

Pin reusable workflow calls to release tags for production repositories.
Use `@main` only while adopting or testing the workflow set.

# Enterprise WordPress Monorepo QA

Use this pattern for WordPress application repositories that have a root
`composer.json` plus custom Composer packages under `packages/*`.

The common shape is:

- root application install check;
- Composer auth for private commercial packages;
- dynamic package discovery;
- PHPCS and PHPStan only for packages that configure those tools;
- no PHPUnit in package QA unless packages explicitly need it.

## Recommended Caller Workflow

```yml
name: Testing

on:
  workflow_dispatch:
  push:
    paths-ignore:
      - '**/*.yml'
      - '**/*.yaml'
      - deploy.php
      - dev-ops/**

permissions:
  contents: read

jobs:
  website-ci:
    name: Website CI
    uses: sympress/reusable-workflows/.github/workflows/composer-validate.yml@v1
    with:
      install: true
      audit: false
      validate_options: ''
    secrets:
      COMPOSER_AUTH_JSON: ${{ secrets.COMPOSER_AUTH_JSON }}

  package-ci:
    name: Package CI
    uses: sympress/reusable-workflows/.github/workflows/sympress-qa.yml@v1
    with:
      include_root: false
      package_glob: packages/*
      run_validate: false
      run_audit: false
      run_phpunit: false
    secrets:
      COMPOSER_AUTH_JSON: ${{ secrets.COMPOSER_AUTH_JSON }}
```

## Composer Auth For Private Packages

Store Composer auth as the `COMPOSER_AUTH_JSON` secret in the caller repository
or environment.

Example for an HTTP basic Composer repository:

```json
{
  "http-basic": {
    "my.vendor.example": {
      "username": "token",
      "password": "SECRET_TOKEN"
    }
  }
}
```

This replaces ad-hoc `composer config --global --auth ...` steps in caller
workflows and keeps authentication inside the reusable workflow secret contract.

## Mapping From Legacy Workflows

| Legacy step | Reusable workflow coverage |
| --- | --- |
| `composer validate` in root | `composer-validate.yml` |
| root `composer install` | `composer-validate.yml` with `install: true` |
| private Composer auth command | `COMPOSER_AUTH_JSON` secret |
| `find packages -name composer.json` | `sympress-qa.yml` package discovery |
| package matrix | `sympress-qa.yml` matrix strategy |
| package `composer install` | `sympress-qa.yml` |
| `phpcs` or `cs` script | `sympress-qa.yml` PHPCS auto-detection |
| `phpstan` or `stan` script | `sympress-qa.yml` PHPStan auto-detection |
| no package tools notice | `sympress-qa.yml` logs missing configs without failing |

## Notes

The caller repository still owns triggers such as `paths-ignore`,
`workflow_dispatch`, `push`, and `pull_request`.

If package tests should run later, remove `run_phpunit: false`. If root QA
should also run PHPCS/PHPStan, use `sympress-qa.yml` with `include_root: true`
instead of a separate `composer-validate.yml` root job.

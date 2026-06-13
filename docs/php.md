# PHP Workflows

Focused PHP workflows are available when a repository wants separate jobs instead of `sympress-qa.yml`.

## Composer Validate And Audit

```yml
jobs:
  composer:
    uses: sympress/reusable-workflows/.github/workflows/composer-validate.yml@v1
```

## Coding Standards

```yml
jobs:
  phpcs:
    uses: sympress/reusable-workflows/.github/workflows/php-coding-standards.yml@v1
    with:
      working_directory: packages/kernel
```

Auto-detection prefers Composer scripts `cs:audit`, `phpcs`, and `cs`, then
falls back to PHPCS.
Custom `command` values require `allow_custom_command: true`.
Pull request annotations are enabled by default for PR events; branch and
manual runs keep regular PHPCS output.

## Static Analysis

```yml
jobs:
  static-analysis:
    uses: sympress/reusable-workflows/.github/workflows/php-static-analysis.yml@v1
```

Auto-detection prefers Composer scripts `cs:analyze`, `phpstan`, `stan`, and
`static-analysis`, then PHPStan config files.
Custom `command` values require `allow_custom_command: true`.
Set `dependency_versions` to `lowest` or `highest` when you want PHPStan to
exercise Composer dependency bounds instead of the lock file.

## Unit Tests

```yml
jobs:
  unit:
    uses: sympress/reusable-workflows/.github/workflows/php-unit.yml@v1
```

Auto-detection prefers Composer scripts `test:unit`, `test`, and `tests`, then falls back to PHPUnit config files.
Custom `command` values require `allow_custom_command: true`.

Coverage is uploaded to Codecov when `CODECOV_TOKEN` is provided and
`codecov_upload` is enabled. The default coverage file is `coverage.xml`.

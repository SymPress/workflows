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

Auto-detection prefers Composer scripts `cs:audit` and `cs`, then falls back to PHPCS.
Custom `command` values require `allow_custom_command: true`.

## Static Analysis

```yml
jobs:
  static-analysis:
    uses: sympress/reusable-workflows/.github/workflows/php-static-analysis.yml@v1
```

Auto-detection prefers Composer scripts `cs:analyze` and `static-analysis`, then PHPStan config files.
Custom `command` values require `allow_custom_command: true`.

## Unit Tests

```yml
jobs:
  unit:
    uses: sympress/reusable-workflows/.github/workflows/php-unit.yml@v1
```

Auto-detection prefers Composer scripts `test:unit`, `test`, and `tests`, then falls back to PHPUnit config files.
Custom `command` values require `allow_custom_command: true`.

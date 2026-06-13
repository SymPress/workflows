# PHP Workflows

Focused PHP workflows are available when a repository wants separate jobs instead of `sympress-qa.yml`.

## Composer Validate And Audit

```yml
jobs:
  composer:
    uses: sympress/reusable-workflows/.github/workflows/composer-validate.yml@main
```

## Coding Standards

```yml
jobs:
  phpcs:
    uses: sympress/reusable-workflows/.github/workflows/php-coding-standards.yml@main
    with:
      working_directory: packages/kernel
```

Auto-detection prefers Composer scripts `cs:audit` and `cs`, then falls back to PHPCS.

## Static Analysis

```yml
jobs:
  static-analysis:
    uses: sympress/reusable-workflows/.github/workflows/php-static-analysis.yml@main
```

Auto-detection prefers Composer scripts `cs:analyze` and `static-analysis`, then PHPStan config files.

## Unit Tests

```yml
jobs:
  unit:
    uses: sympress/reusable-workflows/.github/workflows/php-unit.yml@main
```

Auto-detection prefers Composer scripts `test:unit`, `test`, and `tests`, then falls back to PHPUnit config files.

# PHP Workflows

Focused PHP workflows are available when a repository wants separate jobs instead of `sympress-qa.yml`.

## Composer Validate And Audit

```yml
jobs:
  composer:
    uses: sympress/workflows/.github/workflows/composer-validate.yml@177fa0d727b278d2103052ec77c102b4a4c492a0
```

`composer-validate.yml` also accepts optional `SSH_KEY` and `SSH_KNOWN_HOSTS`
secrets for private Git dependencies. Supply a read-only deploy key and pinned
host keys together. The job uses strict host verification and removes its
temporary credentials even after a failed install. HTTPS repositories can
continue using `COMPOSER_AUTH_JSON`.

## Coding Standards

```yml
jobs:
  phpcs:
    uses: sympress/workflows/.github/workflows/php-coding-standards.yml@177fa0d727b278d2103052ec77c102b4a4c492a0
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
    uses: sympress/workflows/.github/workflows/php-static-analysis.yml@177fa0d727b278d2103052ec77c102b4a4c492a0
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
    uses: sympress/workflows/.github/workflows/php-unit.yml@177fa0d727b278d2103052ec77c102b4a4c492a0
```

Auto-detection prefers Composer scripts `test:unit`, `test`, and `tests`, then falls back to PHPUnit config files.
Custom `command` values require `allow_custom_command: true`.

Coverage is uploaded to Codecov when `CODECOV_TOKEN` is provided and
`codecov_upload` is enabled. The default coverage file is `coverage.xml`.

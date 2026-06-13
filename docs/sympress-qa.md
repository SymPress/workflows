# SymPress QA

Use `sympress-qa.yml` for Composer-first SymPress packages and monorepos.

```yml
jobs:
  qa:
    uses: sympress/reusable-workflows/.github/workflows/sympress-qa.yml@main
    with:
      php_version: '8.5'
      include_root: true
      package_glob: packages/*
```

The workflow discovers Composer packages, installs dependencies, and runs enabled checks when the package has matching scripts or config files.

Recognized Composer scripts:

- Coding standards: `cs:audit`, `cs`
- Static analysis: `cs:analyze`, `static-analysis`
- Tests: `test:unit`, `test`, `tests`

Useful inputs:

| Input | Default | Description |
| --- | --- | --- |
| `include_root` | `true` | Run the root `composer.json` when present. |
| `package_glob` | `packages/*` | Composer package discovery glob. |
| `run_validate` | `true` | Run `composer validate`. |
| `run_audit` | `true` | Run `composer audit`. |
| `run_phpcs` | `true` | Run PHPCS or coding standards scripts. |
| `run_phpstan` | `true` | Run static analysis. |
| `run_phpunit` | `true` | Run PHPUnit or test scripts. |
| `run_node_build` | `false` | Run package build scripts for packages with `package.json`. |

Secrets:

| Secret | Description |
| --- | --- |
| `COMPOSER_AUTH_JSON` | Composer auth JSON for private packages. |
| `NPM_REGISTRY_TOKEN` | npm registry token for package builds. |
| `ENV_VARS` | JSON object or array of `{ "name": "...", "value": "..." }`. |

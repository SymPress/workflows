# SymPress QA

Use `sympress-qa.yml` for Composer-first SymPress packages and monorepos.

```yml
jobs:
  qa:
    uses: sympress/workflows/.github/workflows/sympress-qa.yml@v1
    with:
      php_version: '8.5'
      include_root: true
      package_glob: packages/*
```

The workflow discovers Composer packages, fans them out as a matrix, installs
dependencies, and runs enabled checks. Every enabled gate requires its tool and
consumer configuration; missing prerequisites fail. The job sets `CI=true`, so
SymPress QA commands are strict without a separate `--strict` argument. A package
`composer qa` script is used when all three code/test gates are enabled; individual
input switches remain authoritative when any gate is explicitly disabled.

Recognized Composer scripts:

- Coding standards: `cs:audit`, `phpcs`, `cs`
- Static analysis: `cs:analyze`, `phpstan`, `stan`, `static-analysis`
- Tests: `test:unit`, `test`, `tests`

For enterprise WordPress monorepos that only run PHPCS and PHPStan in packages,
set `include_root: false`, `run_audit: false`, and `run_phpunit: false` for the
package job. Use `composer-validate.yml` with `install: true` for the root
application install check.

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
| `SSH_KEY` | Optional read-only deploy key for private Git dependencies. |
| `SSH_KNOWN_HOSTS` | Pinned host keys; required when `SSH_KEY` is supplied. |
| `NPM_REGISTRY_TOKEN` | npm registry token for package builds. |
| `ENV_VARS` | JSON object or array of `{ "name": "...", "value": "..." }`. |

SSH credentials are written only to private files in the job's temporary directory
and removed even when QA fails. Host verification is strict; no host-key scan or
personal GitHub token is required. Repository-scoped deploy keys should grant read
access only to the dependency repository. Forward both SSH secrets explicitly
from the caller, as in `examples/sympress-package-qa.yml`.

# SymPress QA

Use `sympress-qa.yml` for Composer-first SymPress packages and monorepos.

```yml
jobs:
  qa:
    uses: sympress/workflows/.github/workflows/sympress-qa.yml@177fa0d727b278d2103052ec77c102b4a4c492a0
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

With `update_dependencies: true`, Composer fetches dependencies with scripts and
plugins disabled. QA runs after fetch credentials are removed. The workflow then
registers installed PHPCS standards and PHPStan extension metadata explicitly,
including packages with `extra.phpstan` and the consumer's
`extra.phpstan/extension-installer.ignore` list, so the enabled checks retain their
rules without running Composer lifecycle hooks.

Recognized Composer scripts:

- Coding standards: `cs:audit`, `phpcs`, `cs`
- Static analysis: `cs:analyze`, `phpstan`, `stan`, `static-analysis`
- Tests: `test:unit`, `test`, `tests`

For enterprise WordPress monorepos that only run PHPCS and PHPStan in packages,
set `include_root: false`, `run_audit: false`, and `run_phpunit: false` for the
package job. Use `composer-validate.yml` with `install: true` for the root
application install check.

## Root WordPress applications

A root application (for example WordPress managed by Composer, with
`composer/installers` placing plugins under the web root) often needs more than
`composer install` before its `composer qa` contract can run. These inputs are
off by default and typed; none accepts free-form shell:

```yml
jobs:
  quality:
    uses: sympress/workflows/.github/workflows/sympress-qa.yml@<release-sha> # v1.3.0
    with:
      package_glob: ''
      run_validate: false
      run_audit: false
      env_file_template: .env.example
      run_sympress_runtime: true
      node_build_paths: packages/theme
      require_current_wordpress: true
      require_clean_checkout: true
      require_private_repository: true
    secrets:
      COMPOSER_AUTH_JSON: ${{ secrets.COMPOSER_AUTH }}
      WORDFENCE_API_KEY: ${{ secrets.WORDFENCE_API_KEY }}
```

The job then runs, in order: the private-repository guard, `.env` creation, the
WordPress currency check, `composer install` with plugins enabled, the
`sympress/runtime` binary, the locked Node builds, `composer qa`, and the
clean-checkout check. An empty `package_glob` limits QA to the root. Disable
`run_validate` and `run_audit` when `composer qa` already validates and audits,
so they do not run twice.

| Input | Default | Description |
| --- | --- | --- |
| `env_file_template` | `''` | File copied to `.env` with mode `0600` before install. |
| `run_sympress_runtime` | `false` | Run `vendor/bin/runtime --no-interaction` after install; fails when missing. |
| `node_build_paths` | `''` | Directories, one per line, with a locked `npm`/`pnpm`/`yarn` install and `build` script, run before the checks. |
| `require_current_wordpress` | `false` | Fail unless `composer.lock` pins `roots/wordpress` to the current stable release from `api.wordpress.org`. |
| `require_clean_checkout` | `false` | Run `git diff --exit-code` after QA. Untracked files are ignored. |
| `require_private_repository` | `false` | Fail before checkout unless the calling repository is private. |

Paths are relative to each target and must stay inside it. The WordPress check
needs outbound access to `api.wordpress.org`, so a new WordPress release fails
the build until the lock is updated. `WORDFENCE_API_KEY` is exported to QA only
for audits of WordPress plugins against Wordfence Intelligence; the dependency
canary never receives it.

Useful inputs:

| Input | Default | Description |
| --- | --- | --- |
| `include_root` | `true` | Run the root `composer.json` when present. |
| `package_glob` | `packages/*` | Composer package discovery glob. |
| `update_dependencies` | `false` | Resolve current permitted Composer dependencies before QA. |
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
| `WORDFENCE_API_KEY` | Wordfence Intelligence API key for WordPress plugin audits. |

SSH credentials are written only to private files in the job's temporary directory
and removed even when QA fails. Host verification is strict; no host-key scan or
personal GitHub token is required. Repository-scoped deploy keys should grant read
access only to the dependency repository. Forward both SSH secrets explicitly
from the caller, as in `examples/sympress-package-qa.yml`.

# Usage

Workflow calls are made at job level. The caller repository decides when the
job runs, which permissions are granted, which inputs are passed, and which
secrets are exposed.

## Basic Pattern

```yml
jobs:
  qa:
    uses: sympress/workflows/.github/workflows/sympress-qa.yml@v1
    with:
      php_version: '8.5'
    secrets:
      COMPOSER_AUTH_JSON: ${{ secrets.COMPOSER_AUTH_JSON }}
```

Do not call shared workflows inside `steps`. Use `jobs.<job_id>.uses`.

## GitHub Workflow Call Rules

GitHub evaluates called workflows in the caller repository context:

- the caller decides triggers, permissions, secrets, and inputs;
- `GITHUB_TOKEN` permissions can be downgraded by the called workflow, not
  elevated;
- workflow-level `env` values from the caller are not automatically propagated
  to the called workflow;
- secrets must be mapped explicitly or inherited intentionally;
- private workflow repositories need Actions access settings before callers can
  use them.

For upstream details, see GitHub's
[workflow reuse reference](https://docs.github.com/en/actions/reference/workflows-and-actions/reusing-workflow-configurations).

## Version Pinning

Use these refs intentionally:

| Ref | Use case |
| --- | --- |
| `@v1` | Normal production pin for a major release line. |
| `@v1.2.3` | Strict production pin for regulated repositories. |
| `@<sha>` | Maximum reproducibility. |
| `@main` | Adoption testing only. |

## Permissions

Set the caller workflow permissions to the least privilege needed. Called
workflows cannot elevate `GITHUB_TOKEN` permissions beyond what the caller
grants.

Read-only QA example:

```yml
permissions:
  contents: read
```

Release example:

```yml
permissions:
  contents: write
  issues: write
  pull-requests: write
```

Artifact attestation example:

```yml
permissions:
  contents: read
  actions: read
  attestations: write
  id-token: write
```

Grant attestation permissions only when `artifact_attestation: true` is enabled
for `wordpress-archive.yml` or `build-and-distribute.yml`.

## Secrets

Prefer explicit secret mapping:

```yml
secrets:
  COMPOSER_AUTH_JSON: ${{ secrets.COMPOSER_AUTH_JSON }}
```

Use `secrets: inherit` only in tightly controlled organization repositories
where all inherited secrets are expected by the workflow.

## Working Directories

Package-level workflows accept `working_directory`:

```yml
with:
  working_directory: packages/kernel
```

For monorepos, prefer `sympress-qa.yml` with `package_glob`:

```yml
with:
  include_root: true
  package_glob: packages/*
```

## Custom Commands

Free-form shell execution is disabled by default. Enable it only for trusted
repositories and protected branches.

```yml
with:
  command: composer test:integration
  allow_custom_command: true
```

Prefer Composer or npm scripts over custom commands when possible.

## Node Lockfiles

Node workflows require one of `pnpm-lock.yaml`, `yarn.lock`,
`package-lock.json`, or `npm-shrinkwrap.json` before installing dependencies.
This keeps CI reproducible and makes caches effective.

```yml
with:
  allow_unpinned_node_install: true
```

Use the compatibility switch only for trusted callers that cannot yet commit a
lockfile.

## Artifact Policy

Archive workflows exclude secret-like files and validate staged artifacts before
upload. `.env.example` and `.env.dist` are allowed by default. A real `.env`
must be explicitly allowed:

```yml
with:
  artifact_allowed_env_files: .env .env.example .env.dist
```

Only do this when `.env` is generated for distribution and contains no secrets.
Archive workflows also add `artifact-manifest.json` and
`artifact-sha256sums.txt` unless `artifact_manifest: false` is set.

## Outputs

Some workflows expose outputs for downstream jobs.

Archive plus QIT:

```yml
jobs:
  archive:
    uses: sympress/workflows/.github/workflows/wordpress-archive.yml@v1

  qit:
    needs: archive
    uses: sympress/workflows/.github/workflows/woo-qit.yml@v1
    with:
      artifact_name: ${{ needs.archive.outputs.artifact }}
    secrets:
      WOO_PARTNER_USER: ${{ secrets.WOO_PARTNER_USER }}
      WOO_PARTNER_SECRET: ${{ secrets.WOO_PARTNER_SECRET }}
```

## Common Recipes

Composer package:

```yml
jobs:
  qa:
    uses: sympress/workflows/.github/workflows/sympress-qa.yml@v1
```

WordPress plugin archive:

```yml
jobs:
  archive:
    uses: sympress/workflows/.github/workflows/wordpress-archive.yml@v1
    with:
      package_version: ${{ github.ref_name }}
```

Focused PHP checks:

```yml
jobs:
  phpcs:
    uses: sympress/workflows/.github/workflows/php-coding-standards.yml@v1

  phpstan:
    uses: sympress/workflows/.github/workflows/php-static-analysis.yml@v1

  phpunit:
    uses: sympress/workflows/.github/workflows/php-unit.yml@v1
```

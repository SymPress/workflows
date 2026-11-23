# Build And Distribute

Use `build-and-distribute.yml` when a source branch should produce a compiled build branch and an artifact.

```yml
jobs:
  build:
    uses: sympress/workflows/.github/workflows/build-and-distribute.yml@a258c0d9d040c8c1e682d62ef7ed34c82569df6c # v1.4.0
    with:
      source_branch_prefix: dev/
    secrets:
      GITHUB_USER_TOKEN: ${{ secrets.BUILD_TOKEN }}
```

Default branch mapping:

| Source branch | Build branch |
| --- | --- |
| `dev/main` | `main` |
| `dev/feature/audit` | `feature/audit` |
| `dev/hotfix/login` | `hotfix/login` |

The workflow refuses same-branch writes by default. Set `allow_same_branch: true` only for repositories that intentionally commit build artifacts to the triggering branch.

When `package_version` is empty, the workflow derives a version from the latest tag, the source branch slug, and the short commit SHA.

The version, given or derived, may contain only letters, digits, `.`, `+`, `_`
and `-` and must start with a letter or digit; anything else fails the build
before project code runs.

`skip_existing_build` is enabled by default. When the target build branch already
contains the current source `SHA` header, Composer, Node, asset compiler, and
scoper steps are skipped and the existing build branch is repackaged as the
workflow artifact. The `skipped_existing_build` output reports that decision.

## Artifact Safety

The build branch and the uploaded artifact share one staged and validated file
set. Build output ignored by the source `.gitignore` (for example `vendor/` or
`build/`) is included; `.distignore`, `artifact_extra_excludes` and the secret
checks apply to both. Only `artifact-manifest.json` and
`artifact-sha256sums.txt` stay off the branch. With a `working_directory`,
only that directory is replaced by its build; the rest of the branch mirrors
the source commit.

Secret-like files are excluded and the staged files are validated before
upload. Defaults block `.env*`, `.npmrc`, `auth.json`, SSH files, private keys,
and certificate/key material.

`.env.example` and `.env.dist` are allowed by default. Add `.env` only when the
file is generated for distribution and contains no secrets:

```yml
with:
  artifact_allowed_env_files: .env .env.example .env.dist
```

Use `artifact_extra_excludes` for project-specific generated files. `.distignore`
and `artifact_extra_excludes` still win over the default `.env` allowlist.

The uploaded artifact includes `artifact-manifest.json` and
`artifact-sha256sums.txt` by default and is scanned for common secret-content
patterns. Disable `artifact_manifest` or `artifact_secret_scan` only for a
documented trusted release exception.

Set `artifact_attestation: true` to create a GitHub Artifact Attestation for
the generated `artifact-manifest.json`. The caller job must grant
`actions: read`, `attestations: write`, and `id-token: write`, and
`artifact_manifest` must stay enabled.

`pre_script` is disabled by default. Set `allow_inline_scripts: true` only when
the caller repository is trusted.

## Push Isolation

The workflow runs two jobs. `Build and distribute` checks out the source,
installs dependencies, runs Composer, Node, asset compiler, scoper and
`pre_script` steps, and uploads the artifact. It has `contents: read` and never
receives `GITHUB_USER_TOKEN`, `GITHUB_USER_SSH_KEY` or `GITHUB_KNOWN_HOSTS`. It
hands the build branch tree to the next job as a thin Git bundle artifact named
`<artifact>-build-tree`, kept for one day.

`Push build branch` runs no project code. It verifies the bundle, checks that
its tree matches the one reported by the build job, replaces `.github` with the
directory from the source commit, commits that tree onto the current build
branch tip and pushes it. A build script therefore cannot plant a workflow or
local action that a push with `GITHUB_USER_TOKEN` or `GITHUB_USER_SSH_KEY`
would start. The credentials exist only in that job:
the token is passed through a step-scoped credential helper and never written
to `.git/config`, the SSH key is loaded only there, and Git hooks are disabled
with `core.hooksPath=/dev/null` and `--no-verify`. Pushes for the same ref are
serialized; builds are not. When the source branch has moved past the built
commit by the time its push job starts, that job skips the push, so an older
build that finishes late cannot cover a newer one.

When pushing with `GITHUB_USER_SSH_KEY`, provide `GITHUB_KNOWN_HOSTS` for
`github.com`. The `allow_github_ssh_keyscan` fallback is available only as an
explicit trust-on-first-use escape hatch.

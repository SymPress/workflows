# Build And Distribute

Use `build-and-distribute.yml` when a source branch should produce a compiled build branch and an artifact.

```yml
jobs:
  build:
    uses: sympress/workflows/.github/workflows/build-and-distribute.yml@v1
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

`skip_existing_build` is enabled by default. When the target build branch already
contains the current source `SHA` header, Composer, Node, asset compiler, and
scoper steps are skipped and the existing build branch is repackaged as the
workflow artifact. The `skipped_existing_build` output reports that decision.

## Artifact Safety

The build branch is writable, but the uploaded artifact is still guarded.
Secret-like files are excluded and the staged artifact is validated before
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

When pushing with `GITHUB_USER_SSH_KEY`, provide `GITHUB_KNOWN_HOSTS` for
`github.com`. The `allow_github_ssh_keyscan` fallback is available only as an
explicit trust-on-first-use escape hatch.

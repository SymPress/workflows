# Troubleshooting

## Workflow Is Not Found

Check that the caller uses the full workflow path:

```yml
uses: sympress/reusable-workflows/.github/workflows/sympress-qa.yml@v1
```

Reusable workflows must live directly in `.github/workflows`.

## Workflow Is Not Accessible

For private repositories, configure access in the workflow repository under
`Settings -> Actions -> General -> Access`. Also check the caller repository's
Actions policy.

## Input Is Not Defined

GitHub fails a reusable workflow call when the caller passes an input that the
called workflow has not declared. Check the workflow-specific docs and the
workflow file under `.github/workflows`.

## Secret Is Not Defined

Secrets passed by the caller must match names declared in the reusable workflow.
Prefer explicit mapping:

```yml
secrets:
  COMPOSER_AUTH_JSON: ${{ secrets.COMPOSER_AUTH_JSON }}
```

## Permissions Error

The caller controls the maximum `GITHUB_TOKEN` permissions. If a release or
build branch push fails, check the caller workflow's `permissions` block and
the token used for the operation.

## Custom Command Is Rejected

Custom shell commands are disabled by default. Either replace the command with a
Composer or npm script, or set the matching `allow_*` input in a trusted caller.

## Artifact Contains Blocked Files

Archive workflows fail when staged artifacts contain secret-like files. Remove
the file, add it to `.distignore`, or use `artifact_extra_excludes`.

For intentional non-secret `.env` files:

```yml
with:
  artifact_allowed_env_files: .env .env.example .env.dist
```

## `.env` Is Missing From An Archive

This is expected. Real `.env` files are blocked by default. Add `.env` to
`artifact_allowed_env_files` only when it is safe to distribute.

## Deploy Fails On Known Hosts

Prefer `SSH_KNOWN_HOSTS` with the deployment host key. Set
`allow_ssh_keyscan: true` only when trust-on-first-use behavior is acceptable.

## Build Branch SSH Push Fails

When using `GITHUB_USER_SSH_KEY`, provide `GITHUB_KNOWN_HOSTS` for `github.com`
or explicitly set `allow_github_ssh_keyscan: true`.

## No Composer Targets Found

For `sympress-qa.yml`, check:

- root `composer.json` exists when `include_root: true`;
- `package_glob` matches package directories;
- each package has its own `composer.json`.

## QIT Download Fails

Check `qit_ref`. The default is pinned. Override it only when upgrading QIT.
If `qit_sha256` is set, make sure it matches the downloaded executable.

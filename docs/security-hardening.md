# Security Hardening

This repository treats SymPress Workflows as shared infrastructure. Defaults
should be safe for normal callers and explicit when a caller needs more power.

## Artifact Policy

`wordpress-archive.yml` and `build-and-distribute.yml` exclude secret-like files
before upload and validate the staged artifact before publishing it.

Blocked by default:

- `.env*`
- `.npmrc`
- `auth.json` and `composer-auth.json`
- `.ssh`, `id_rsa`, `id_ed25519`, and `known_hosts`
- `*.pem`, `*.key`, `*.p12`, `*.pfx`, and `*.kubeconfig`
- `secrets.*`

The default `.env` allowlist is `.env.example .env.dist`. If a project such as a
starter setup intentionally ships a non-secret `.env`, configure it explicitly:

```yml
with:
  artifact_allowed_env_files: .env .env.example .env.dist
```

Only add `.env` when the file is generated for distribution and contains no
secrets. Use `artifact_extra_excludes` for project-specific generated files.
`.distignore` and `artifact_extra_excludes` win over the default allowlist.

The staged package is also scanned for common secret-content patterns such as
private key blocks, GitHub tokens, AWS access key IDs, and Slack tokens. Keep
`artifact_secret_scan` enabled unless a trusted release path has a documented
false positive.

Artifact workflows add two provenance files by default:

- `artifact-sha256sums.txt` lists SHA256 checksums for staged files.
- `artifact-manifest.json` records source repository, source ref, source SHA,
  workflow ref, run ID, package name/folder, and the checksum file name.

Set `artifact_manifest: false` only when a downstream packaging system requires
an exact legacy artifact shape.

For stronger provenance, set `artifact_attestation: true`. The workflow creates
a GitHub Artifact Attestation for `artifact-manifest.json`; the manifest then
anchors the artifact checksums. Caller jobs must grant `actions: read`,
`attestations: write`, and `id-token: write`, and `artifact_manifest` must
remain enabled.

## Shell Inputs

Free-form shell inputs are gated:

- `allow_inline_scripts` for `pre_script`.
- `allow_custom_command` for focused PHP and JavaScript command overrides.
- `allow_custom_commands` for DDEV Playwright command overrides.
- `allow_custom_deploy_command` for Deployer command overrides.

Leave these disabled for pull-request workflows from untrusted branches.

Argument-like inputs are passed through environment variables and argv arrays
instead of being interpolated directly into shell scripts.

## Environment Variables

`ENV_VARS` and `DDEV_ENV_VARS` accept JSON object or array formats, but variable
names must match shell environment variable syntax. Reserved GitHub and runner
names such as `GITHUB_*`, `ACTIONS_*`, `RUNNER_*`, `PATH`, `BASH_ENV`,
`LD_PRELOAD`, and `NODE_OPTIONS` are blocked.

## Lockfiles

Node dependency installs use npm, yarn, or pnpm lockfiles. If no lockfile is
present, workflows fail by default instead of running `npm install`. Set
`allow_unpinned_node_install: true` only for trusted compatibility callers, and
prefer adding a lockfile instead.

## SSH And Deployments

`deploy-deployer.yml` binds the job to the requested GitHub environment and
serializes deployments per environment. Prefer `SSH_KNOWN_HOSTS` over
`ssh-keyscan`. The `allow_ssh_keyscan` fallback is opt-in.

For build-branch pushes over SSH, provide `GITHUB_KNOWN_HOSTS`. The
`allow_github_ssh_keyscan` fallback is opt-in for repositories that accept
trust-on-first-use behavior.

## Supply Chain

- External GitHub Actions are pinned to full commit SHAs with the human-readable
  tag kept as an inline comment.
- Dependabot monitors GitHub Actions and npm dependencies so pinned refs can be
  updated through grouped pull requests instead of floating tags.
- `automatic-release.yml` installs pinned semantic-release packages.
- `woo-qit.yml` downloads QIT from a pinned ref and supports `qit_sha256`.
- Repository checks include actionlint, contract tests, doctor gates, and
  zizmor.

## Permissions

Workflows use read-only repository permissions unless they release, deploy, or
push a build branch. Prefer read-only archive workflows for normal artifacts.

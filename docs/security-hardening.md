# Security Hardening

This repository treats reusable workflows as shared infrastructure. Defaults
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

## Shell Inputs

Free-form shell inputs are gated:

- `allow_inline_scripts` for `pre_script`.
- `allow_custom_command` for focused PHP and JavaScript command overrides.
- `allow_custom_commands` for DDEV Playwright command overrides.
- `allow_custom_deploy_command` for Deployer command overrides.

Leave these disabled for pull-request workflows from untrusted branches.

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
  updated through normal pull requests instead of floating tags.
- `automatic-release.yml` installs pinned semantic-release packages.
- `woo-qit.yml` downloads QIT from a pinned ref and supports `qit_sha256`.
- Repository checks include actionlint, contract tests, and zizmor.

## Permissions

Workflows use read-only repository permissions unless they release, deploy, or
push a build branch. Prefer read-only archive workflows for normal artifacts.

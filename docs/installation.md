# Installation

This repository is a normal GitHub repository that stores reusable workflows in
`.github/workflows`. A workflow becomes reusable when it defines
`on.workflow_call`. See GitHub's
[reuse workflows documentation](https://docs.github.com/en/actions/how-tos/reuse-automations/reuse-workflows)
and [`workflow_call` syntax reference](https://docs.github.com/actions/using-workflows/workflow-syntax-for-github-actions#onworkflow_call)
for the upstream rules.

## Repository Setup

1. Create the repository as `sympress/reusable-workflows`.
2. Keep all reusable workflow files directly in `.github/workflows`.
3. Push the repository to GitHub.
4. Run repository checks on `main`.
5. Create a release tag before production consumers adopt it.

Recommended first tag:

```bash
git tag v1.0.0
git push origin v1.0.0
```

Production callers should use a tag or commit SHA instead of `@main`.

If the repository lives under another owner or name, replace
`sympress/reusable-workflows` in all caller examples with the actual
`owner/repository` value.

## Visibility And Access

Public repositories can call public reusable workflows directly when the
organization allows public GitHub Actions usage.

For private or internal use, configure the workflow repository:

1. Open the workflow repository on GitHub.
2. Go to `Settings -> Actions -> General`.
3. In `Access`, allow access from repositories owned by the same user or from
   repositories in the organization.
4. Save the setting.

Caller repositories must also allow the selected actions and reusable workflows
under their own `Settings -> Actions -> General` policy.

GitHub documents the private repository access flow in
[Sharing actions and workflows from your private repository](https://docs.github.com/actions/creating-actions/sharing-actions-and-workflows-from-your-private-repository)
and the repository-level access settings under
[Allowing access to components in a private repository](https://docs.github.com/en/repositories/managing-your-repositorys-settings-and-features/enabling-features-for-your-repository/managing-github-actions-settings-for-a-repository#allowing-access-to-components-in-a-private-repository).

## First Consumer Workflow

Create `.github/workflows/qa.yml` in a consumer repository:

```yml
name: QA

on:
  pull_request:
  push:
    branches:
      - main

permissions:
  contents: read

jobs:
  qa:
    uses: sympress/reusable-workflows/.github/workflows/sympress-qa.yml@v1
    with:
      php_version: '8.5'
```

## Required Consumer Secrets

Add only the secrets that the called workflow needs.

Common secrets:

| Secret | Used by | Purpose |
| --- | --- | --- |
| `COMPOSER_AUTH_JSON` | PHP, archive, build, deploy | Composer auth for private packages. |
| `NPM_REGISTRY_TOKEN` | Node, archive, build, deploy | npm registry token. |
| `ENV_VARS` | QA and build flows | JSON object or array of environment values. |
| `GITHUB_USER_TOKEN` | Release, build branch | Push or release token. |
| `GITHUB_USER_SSH_KEY` | Build branch, deploy | SSH key for private dependencies or push. |
| `GITHUB_KNOWN_HOSTS` | Build branch | Pinned `github.com` SSH host key entry. |
| `SSH_KNOWN_HOSTS` | Deploy | Pinned deployment host keys. |
| `WIREGUARD_CONFIGURATION` | Deploy | Optional WireGuard config. |
| `WOO_PARTNER_USER` | Woo QIT | Woo.com partner user. |
| `WOO_PARTNER_SECRET` | Woo QIT | Woo.com QIT token. |

Use environment-level secrets for production deployments.

## Recommended Branch Protection

For consumer repositories:

- Require the relevant QA jobs before merging to `main`.
- Require deployments to use GitHub environments for approval gates.
- Keep write workflows off untrusted pull requests.

For this reusable workflow repository:

- Require `Repository checks`.
- Require review for changes under `.github/workflows`.
- Use CODEOWNERS for workflow and security-sensitive files.

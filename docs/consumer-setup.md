# Consumer Setup Checklist

Use this checklist when onboarding a project repository.

## 1. Choose Workflows

- Composer package or monorepo: `sympress-qa.yml`
- Separate required checks: focused PHP and JavaScript workflows
- WordPress archive: `wordpress-archive.yml`
- Compiled build branch: `build-and-distribute.yml`
- Browser tests: `playwright.yml` or `ddev-playwright.yml`
- Release: `automatic-release.yml`
- Deployment: `deploy-deployer.yml`
- WooCommerce extension: `woo-qit.yml`

See [Decision Guide](decision-guide.md) for selection details.

## 2. Add Caller Workflow Files

Create small caller files in `.github/workflows`. Keep triggers in the caller
repository, not in this reusable workflow repository.

Example:

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
```

## 3. Configure Secrets

Add only required secrets. Prefer environment secrets for deployment.

Composer auth format:

```json
{
  "github-oauth": {
    "github.com": "TOKEN"
  }
}
```

Environment variables can be passed as object:

```json
{
  "WP_ENV": "ci",
  "APP_DEBUG": "0"
}
```

Or as array:

```json
[
  { "name": "WP_ENV", "value": "ci" },
  { "name": "APP_DEBUG", "value": "0" }
]
```

## 4. Set Permissions

Read-only checks:

```yml
permissions:
  contents: read
```

Artifact download plus QIT:

```yml
permissions:
  contents: read
  actions: read
```

Release:

```yml
permissions:
  contents: write
  issues: write
  pull-requests: write
```

## 5. Add Branch Protection

Require the caller jobs that matter:

- `QA`
- `PHP coding standards`
- `PHP static analysis`
- `PHP unit tests`
- `Playwright`
- Archive or release checks when relevant

## 6. Test Adoption

Open a small pull request that only adds workflow files. Verify:

- reusable workflow access works;
- secrets are available only where expected;
- required checks have stable names;
- artifacts contain no blocked files;
- release and deploy workflows are not triggered by pull requests.

## 7. Pin And Upgrade

Start with `@v1` after the first stable release. For stricter repositories, pin
to `@v1.0.0` or a commit SHA. Upgrade one repository first, then roll out.

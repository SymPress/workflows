# Documentation

Start here when adopting or maintaining the workflow set.

## Adoption

- [Installation](installation.md): repository setup, private access, first
  caller workflow, secrets, and branch protection.
- [Usage](usage.md): job-level calls, pinning, permissions, secrets, outputs,
  and common recipes.
- [Consumer Setup Checklist](consumer-setup.md): step-by-step onboarding for a
  project repository.
- [Decision Guide](decision-guide.md): choose the smallest useful workflow.
- `npm run doctor -- <repo>`: scan a consumer repository for workflow
  recommendations, risky caller patterns, missing lockfiles, and baseline
  permissions.
- [Enterprise WordPress Monorepo QA](enterprise-wordpress-monorepo.md): root
  application install plus dynamic package QA.
- [Troubleshooting](troubleshooting.md): common GitHub Actions and workflow
  errors.

## Reference

- [Workflow Reference](workflow-reference.md): compact operator reference.
- [Feature Map](feature-map.md): full workflow coverage.
- [Security Hardening](security-hardening.md): artifact, shell, SSH, and
  supply-chain defaults.
- [Release Strategy](release-strategy.md): versioning and upgrade policy.

## Workflow Guides

- [SymPress QA](sympress-qa.md)
- [PHP Workflows](php.md)
- [JavaScript Workflows](javascript.md)
- [WordPress Scripts Lint](wp-scripts.md)
- [Text Quality](text-quality.md)
- [Asset Builds](assets.md)
- [WordPress Archive](archive.md)
- [WordPress Archive Check](archive-check.md)
- [Build And Distribute](build-and-distribute.md)
- [Playwright](playwright.md)
- [DDEV Playwright](ddev-playwright.md)
- [Automatic Release](release.md)
- [Deploy With Deployer](deploy.md)
- [WooCommerce QIT](woo-qit.md)

## Upstream GitHub References

- [Reuse workflows](https://docs.github.com/en/actions/how-tos/reuse-automations/reuse-workflows)
- [Workflow syntax for `workflow_call`](https://docs.github.com/actions/using-workflows/workflow-syntax-for-github-actions#onworkflow_call)
- [Share actions and workflows from private repositories](https://docs.github.com/actions/creating-actions/sharing-actions-and-workflows-from-your-private-repository)
- [Manage Actions settings for repository access](https://docs.github.com/en/repositories/managing-your-repositorys-settings-and-features/enabling-features-for-your-repository/managing-github-actions-settings-for-a-repository#allowing-access-to-components-in-a-private-repository)

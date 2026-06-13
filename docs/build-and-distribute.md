# Build And Distribute

Use `build-and-distribute.yml` when a source branch should produce a compiled build branch and an artifact.

```yml
jobs:
  build:
    uses: sympress/reusable-workflows/.github/workflows/build-and-distribute.yml@main
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


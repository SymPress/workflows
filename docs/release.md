# Automatic Release

Use `automatic-release.yml` for semantic-release based releases.

```yml
jobs:
  release:
    uses: sympress/reusable-workflows/.github/workflows/automatic-release.yml@v1
    secrets:
      GITHUB_USER_TOKEN: ${{ secrets.GITHUB_TOKEN }}
```

If the repository has `release.config.cjs`, it is used. Otherwise, the workflow copies the built-in SymPress config and helper script.

The fallback config:

- supports `main`, `next`, `beta`, and `alpha`;
- generates changelog entries;
- creates GitHub releases;
- updates `composer.json`, `package.json`, `package-lock.json`, and WordPress headers when present;
- commits release files with `[skip ci]`.

The workflow serializes releases per ref and installs pinned semantic-release
packages. Production callers should pin this reusable workflow to a release tag.
See [Release Strategy](release-strategy.md).

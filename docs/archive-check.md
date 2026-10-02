# WordPress Archive Check

Use `wordpress-archive-check.yml` after `wordpress-archive.yml` or
`build-and-distribute.yml` to inspect the exact artifact that would be shipped.

```yml
jobs:
  archive:
    uses: sympress/workflows/.github/workflows/wordpress-archive.yml@177fa0d727b278d2103052ec77c102b4a4c492a0

  archive-check:
    needs: archive
    uses: sympress/workflows/.github/workflows/wordpress-archive-check.yml@177fa0d727b278d2103052ec77c102b4a4c492a0
    with:
      artifact_name: ${{ needs.archive.outputs.artifact }}
```

The workflow downloads the artifact, resolves the package folder, checks for
blocked secret-like files, runs `parallel-lint`, and runs WordPress Plugin Check
PHPCS rules when a plugin main file is detected.

`plugin_check_ref` is pinned by default. Update it deliberately when adopting a
new WordPress Plugin Check revision.

Use `excluded_sniffs` for project-specific exceptions and keep that list small.
The workflow annotates Plugin Check PHPCS output on pull requests when
`annotate` is enabled.

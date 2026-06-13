# Asset Builds

Use `assets-build.yml` for Composer asset compiler builds, Node builds, or both.

```yml
jobs:
  assets:
    uses: sympress/reusable-workflows/.github/workflows/assets-build.yml@main
    with:
      working_directory: .
      run_asset_compiler: true
      run_node_build: true
      artifact_name: assets
      artifact_path: public/wp-content
```

The workflow:

- installs Composer dependencies when `composer.json` exists;
- runs `composer compile-assets` when that script exists;
- installs npm/yarn/pnpm dependencies when `package.json` exists;
- runs the configured build script when present;
- optionally uploads build output as an artifact.


# WordPress Archive

Use `wordpress-archive.yml` for plugin or theme artifacts.

```yml
jobs:
  archive:
    uses: sympress/reusable-workflows/.github/workflows/wordpress-archive.yml@main
    with:
      package_version: ${{ inputs.version }}
```

The workflow:

- installs production Composer dependencies;
- runs the frontend build script when present;
- auto-detects a WordPress plugin main file or theme `style.css`;
- updates `Version` and optional `SHA` headers;
- stages the artifact in a stable package folder;
- applies `.distignore` when present;
- uploads the package folder as a GitHub artifact.


# WordPress Archive

Use `wordpress-archive.yml` for plugin or theme artifacts.

```yml
jobs:
  archive:
    uses: sympress/reusable-workflows/.github/workflows/wordpress-archive.yml@v1
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

## Artifact Safety

Secret-like files are excluded before upload and the staged package is checked
again before publishing. Defaults block `.env*`, `.npmrc`, `auth.json`, SSH
files, private keys, and certificate/key material.

The only `.env` files allowed by default are `.env.example` and `.env.dist`.
If a starter project intentionally ships a non-secret `.env`, allow it
explicitly:

```yml
with:
  artifact_allowed_env_files: .env .env.example .env.dist
```

Use `artifact_extra_excludes` for project-specific generated files. `.distignore`
and `artifact_extra_excludes` still win over the default `.env` allowlist.

`pre_script` is disabled by default. Set `allow_inline_scripts: true` only when
the caller repository is trusted.

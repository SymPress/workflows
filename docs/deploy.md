# Deploy With Deployer

Use `deploy-deployer.yml` when a repository has a Deployer setup.

```yml
jobs:
  deploy:
    uses: sympress/workflows/.github/workflows/deploy-deployer.yml@8d06f7038c1137e0d720e29d69eff5ce7b5ee488
    with:
      environment: production
      deployment_directory: deployment
    secrets:
      GITHUB_USER_SSH_KEY: ${{ secrets.DEPLOY_SSH_KEY }}
      COMPOSER_AUTH_JSON: ${{ secrets.COMPOSER_AUTH_JSON }}
      DEPLOY_HOSTNAME: ${{ secrets.DEPLOY_HOSTNAME }}
      SSH_KNOWN_HOSTS: ${{ secrets.SSH_KNOWN_HOSTS }}
      DEPLOY_USER: ${{ secrets.DEPLOY_USER }}
```

The project and deployment directory must each commit a valid `composer.lock`.
Their installs validate the lock and use `--no-dev --no-scripts --no-plugins`.
Private Composer authentication is available only during those fetch steps.
Private Git dependencies can use the separate read-only `INSTALL_SSH_KEY` and
verified `INSTALL_SSH_KNOWN_HOSTS` secrets. The production deployment key is loaded
after dependency installation and authorized builds, immediately before deployment.

Node installs require a selected npm, pnpm, or Yarn lockfile and disable lifecycle
scripts. Yarn 1 uses `--frozen-lockfile --ignore-scripts`; Yarn 2 uses `--immutable
--skip-builds`; Yarn 3 and 4 use `--immutable --mode=skip-build`. Builds run in a
separate step without install tokens or an SSH agent. Any required Composer
post-install/plugin work must be explicitly moved to an authorized credential-free
build step before adopting this workflow.

The dependency artifact includes downloaded Composer archives and a sanitized
Git object cache for source-only private packages. Authentication files, Git
remotes, hooks and external object alternates are excluded. Restored mirrors have
only a minimal bare-repository configuration, objects and refs. Composer reinstallation in the build
step uses this cache with networking disabled; no install secret or SSH agent is
available. A missing cached package fails the build instead of requesting credentials.
The final release artifact excludes these download caches.

WireGuard is supported through the `WIREGUARD_CONFIGURATION` secret.

Deployments are bound to the requested GitHub environment and serialized per
environment. `SSH_KNOWN_HOSTS` must contain verified host keys; empty or malformed
files fail. Host verification is strict. The legacy `allow_ssh_keyscan` and
`allow_unpinned_node_install` inputs remain accepted for caller compatibility,
but cannot enable deployment host scans or unlocked installs.

Custom `deploy_command` values require `allow_custom_deploy_command: true`.
Keep the default command for normal deployments. A gated custom shell command
receives the validated environment and verbosity as positional `$1` and `$2`.
Invalid inputs, any nonzero Deployer or tee status, cancellation, and missing or
nonnumeric result output fail the job. Cleanup runs even when deployment fails.

Outputs exposed to caller workflows:

| Output | Description |
| --- | --- |
| `deploy_exit_code` | Deployer process exit code. |
| `deploy_reason` | Bounded generic result without raw log content. |
| `deploy_warnings` | Retained compatibility output; empty. |
| `deploy_log_excerpt` | Retained compatibility output; empty. |

The workflow uses isolated fetch, build and deploy jobs. `dependencies` installs the project and
Deployer locks with scripts and plugins disabled and fetch-only credentials.
`build` restores that run's artifact and runs application build scripts without
any operator secrets or deployment environment. `deploy` checks out the exact
tested caller commit into a separate trusted source directory and installs its
deployment lock with scripts/plugins disabled and fetch-only authentication.
It verifies the recipe, regular Deployer proxy and dependency paths before loading
SSH or WireGuard credentials. Artifact files cannot overwrite this checkout.
The built archive is downloaded by its exact ID and verified before extraction
into a new directory outside the executable workspace. Secret files, authentication configuration,
VCS metadata and private caches are excluded. Internal relative symlinks retain
pnpm's dependency resolution; absolute or external links and links or hardlinks
to private files fail packaging. Restores use Python's `data` extraction filter.

Deployment recipes run from the trusted checkout. Use the absolute
`SYMPRESS_RELEASE_DIRECTORY` environment variable as the upload source, for example
`upload(getenv('SYMPRESS_RELEASE_DIRECTORY') . '/', '{{release_path}}')`.
Treat files in that directory as upload data: do not include PHP files from it,
load its Composer autoloader, or run its local commands with deployment credentials.
Remote application PHP execution remains part of the deployment recipe's scope.
For standalone Deployer usage, a recipe may fall back to its usual local source
when this environment variable is absent.

Modern Yarn uses a workspace-local cache so PnP dependencies survive the job
boundary. The dependency artifact replaces `.yarnrc.yml` with only public
`nodeLinker`, `enableGlobalCache`, `yarnPath` and `cacheFolder` settings. Yarn paths
must remain inside the workspace; registry and authentication settings are
excluded, and the original configuration is unchanged. The release artifact
omits this configuration and `node_modules` after the build.

The default SSH transport requires `GITHUB_USER_SSH_KEY` at runtime.
Set `use_ssh: false` only for Deployer recipes using local or non-SSH hosts.
The repository's local Deployer fixture exercises these jobs and
checks that build output reaches deployment while inert credential files do not.
Its build also tampers with the artifact recipe, verification script and both
Deployer binary paths. Deployment succeeds using freshly installed trusted tools
and trusted verification code that reads the built payload as data.

## Release inventory and verification

The build audits the locked production Composer dependencies and rejects high or
critical Node advisories before packaging. Every archive includes
`sympress-sbom.cdx.json` in CycloneDX 1.6 format, derived from installed Composer
packages. Installed development packages fail the build. npm lockfile v2/v3
production inputs are included; Yarn/pnpm JavaScript inventories are explicitly
marked incomplete in the SBOM. Review those inventories separately before a release.

The build exports the SHA-256 of the final archive. Deployment compares the
downloaded bytes with this job output before opening the tar file. The checksum
is not read from a file supplied by the archive.

For public production repositories, enable both provenance and SBOM attestations:

```yml
permissions:
  contents: read
  actions: read
  attestations: write
  id-token: write
jobs:
  deploy:
    uses: SymPress/workflows/.github/workflows/deploy-deployer.yml@REVIEWED_40_CHARACTER_COMMIT
    with:
      artifact_attestation: true
      attestation_signer_digest: REVIEWED_40_CHARACTER_COMMIT
```

Replace both placeholders with the same reviewed workflow commit. A separate job
signs the archive's exact digest without deployment credentials. Deployment uses
`gh attestation verify` and requires the reusable signer workflow, its full commit,
the caller's source commit/ref, and a GitHub-hosted runner. Verification failure
stops extraction and deployment. No additional human approver is required by this
workflow. Consumers may opt out only when their hosting plan cannot provide
attestations; archive digest and audit gates still apply.

GitHub requires Enterprise Cloud for attestations of private repositories. This
workflow does not publish private packages or grant them to public consumers.
See [GitHub's attestation action](https://github.com/actions/attest) and the
[verification command](https://cli.github.com/manual/gh_attestation_verify).

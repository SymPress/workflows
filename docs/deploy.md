# Deploy With Deployer

Use `deploy-deployer.yml` when a repository has a Deployer setup.

```yml
jobs:
  deploy:
    uses: sympress/workflows/.github/workflows/deploy-deployer.yml@177fa0d727b278d2103052ec77c102b4a4c492a0
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

The workflow uses three isolated jobs. `dependencies` installs the project and
Deployer locks with scripts and plugins disabled and fetch-only credentials.
`build` restores that run's artifact and runs application build scripts without
any operator secrets or deployment environment. `deploy` restores the built
artifact by its exact ID, verifies its source commit and run, then loads SSH
and optional WireGuard credentials. Secret files, authentication configuration,
VCS metadata and caches are excluded; external links fail packaging.

The default SSH transport requires `GITHUB_USER_SSH_KEY` at runtime.
Set `use_ssh: false` only for Deployer recipes using local or non-SSH hosts.
The repository's local Deployer fixture exercises the same three jobs and
checks that build output reaches deployment while inert credential files do not.

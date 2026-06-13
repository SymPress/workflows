# Deploy With Deployer

Use `deploy-deployer.yml` when a repository has a Deployer setup.

```yml
jobs:
  deploy:
    uses: sympress/reusable-workflows/.github/workflows/deploy-deployer.yml@v1
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

The workflow installs project dependencies, optionally builds frontend assets, installs deployment dependencies, configures SSH known hosts, and runs Deployer.

WireGuard is supported through the `WIREGUARD_CONFIGURATION` secret.

Deployments are bound to the requested GitHub environment and serialized per
environment. Prefer `SSH_KNOWN_HOSTS` for host verification. The `ssh-keyscan`
fallback is disabled unless `allow_ssh_keyscan: true` is set.

Custom `deploy_command` values require `allow_custom_deploy_command: true`.
Keep the default command for normal deployments.

Outputs exposed to caller workflows:

| Output | Description |
| --- | --- |
| `deploy_exit_code` | Deployer process exit code. |
| `deploy_reason` | Short parsed deployment result. |
| `deploy_warnings` | Warning-like lines parsed from Deployer output. |
| `deploy_log_excerpt` | Last lines of Deployer output for notifications. |

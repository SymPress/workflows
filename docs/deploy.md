# Deploy With Deployer

Use `deploy-deployer.yml` when a repository has a Deployer setup.

```yml
jobs:
  deploy:
    uses: sympress/reusable-workflows/.github/workflows/deploy-deployer.yml@main
    with:
      environment: production
      deployment_directory: deployment
    secrets:
      GITHUB_USER_SSH_KEY: ${{ secrets.DEPLOY_SSH_KEY }}
      COMPOSER_AUTH_JSON: ${{ secrets.COMPOSER_AUTH_JSON }}
      DEPLOY_HOSTNAME: ${{ secrets.DEPLOY_HOSTNAME }}
      DEPLOY_USER: ${{ secrets.DEPLOY_USER }}
```

The workflow installs project dependencies, optionally builds frontend assets, installs deployment dependencies, configures SSH known hosts, and runs Deployer.

WireGuard is supported through the `WIREGUARD_CONFIGURATION` secret.


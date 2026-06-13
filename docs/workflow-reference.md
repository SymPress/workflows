# Workflow Reference

Use this page as the compact operator reference. Detailed usage lives in each
workflow-specific document.

## Quality Workflows

| Workflow | Use for | Permissions | Required secrets |
| --- | --- | --- | --- |
| `composer-validate.yml` | Composer validate and audit | `contents: read` | None |
| `sympress-qa.yml` | Composer packages and monorepos | `contents: read` | None |
| `php-coding-standards.yml` | PHPCS | `contents: read`, `checks: write` | None |
| `php-static-analysis.yml` | PHPStan | `contents: read` | None |
| `php-unit.yml` | PHPUnit | `contents: read` | None |
| `javascript-static-analysis.yml` | TypeScript or static analysis scripts | `contents: read` | None |
| `javascript-unit.yml` | JavaScript tests | `contents: read` | None |
| `wp-scripts-lint.yml` | `@wordpress/scripts` linting | `contents: read` | None |
| `text-quality.yml` | Spelling and optional grammar review | `contents: read`, `checks: write`, `pull-requests: write` | None |
| `lint-workflows.yml` | actionlint in consumers | `contents: read` | None |
| `codeql.yml` | CodeQL | `security-events: write` | None |

Private Composer or npm dependencies may require `COMPOSER_AUTH_JSON` or
`NPM_REGISTRY_TOKEN`.

## Build And Distribution

| Workflow | Use for | Permissions | Important outputs |
| --- | --- | --- | --- |
| `assets-build.yml` | Build assets and optionally upload output | `contents: read` | None |
| `wordpress-archive.yml` | WordPress plugin or theme artifacts | `contents: read` | `artifact` |
| `wordpress-archive-check.yml` | Validate downloaded WordPress artifacts | `contents: read`, `actions: read`, `checks: write` | None |
| `build-and-distribute.yml` | Build branch plus artifact | `contents: write` | `artifact`, `built_branch`, `package_version`, `skipped_existing_build` |

Prefer `wordpress-archive.yml` unless the project truly needs a build branch.

## Browser And Delivery

| Workflow | Use for | Permissions | Required secrets |
| --- | --- | --- | --- |
| `playwright.yml` | Runner-based browser tests | `contents: read` | None |
| `ddev-playwright.yml` | DDEV-backed browser tests | `contents: read` | None |
| `automatic-release.yml` | semantic-release | `contents: write` | `GITHUB_USER_TOKEN` for custom token |
| `deploy-deployer.yml` | Deployer deployments | `contents: read` | `GITHUB_USER_SSH_KEY` |
| `woo-qit.yml` | WooCommerce QIT | `contents: read`, `actions: read` | `WOO_PARTNER_USER`, `WOO_PARTNER_SECRET` |

## Trust-Sensitive Inputs

| Input | Workflows | Meaning |
| --- | --- | --- |
| `allow_inline_scripts` | Archive, build, Playwright | Allows `pre_script`. |
| `allow_custom_command` | Focused PHP and JavaScript | Allows explicit shell command override. |
| `allow_custom_commands` | DDEV Playwright | Allows command overrides. |
| `allow_custom_deploy_command` | Deploy | Allows non-default Deployer command. |
| `allow_ssh_keyscan` | Deploy | Allows trust-on-first-use host key scan. |
| `allow_github_ssh_keyscan` | Build and distribute | Allows trust-on-first-use for GitHub SSH push. |
| `artifact_allowed_env_files` | Archive, build | Allows selected `.env*` files into artifacts. |

Keep these disabled for untrusted pull request paths.

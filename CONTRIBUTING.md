# Contributing

Thanks for improving SymPress automation.

SymPress Workflows is shared CI/CD infrastructure. Contributions should keep
consumer repositories simple while making defaults safer, faster, and easier to
operate.

## Ways To Contribute

- Report reproducible workflow failures.
- Improve documentation, examples, and migration guidance.
- Add focused workflow coverage for real SymPress or WordPress use cases.
- Strengthen security defaults, supply-chain controls, or contract tests.
- Improve developer experience for workflow adoption and diagnostics.

## Before You Start

- Search existing issues and pull requests.
- Open an issue before large behavior changes or new workflow families.
- Keep proposals scoped to one problem.
- Prefer opt-in behavior for risky compatibility paths.
- Preserve existing caller contracts unless a breaking change is intentional and
  documented.

## Local Checks

Run these checks before opening a pull request:

```sh
npm ci
npm run lint:workflows
npm run lint:docs
npm run test:contracts
npm run doctor:repo
npm run doctor -- --fail-on high fixtures/wp-plugin
```

## Workflow Guidelines

- Prefer explicit `permissions`.
- Keep workflows callable through `workflow_call`.
- Keep default versions aligned with current SymPress projects: PHP 8.5,
  Composer 2, Node 24, and WordPress-friendly tooling.
- Support `working-directory` for package repositories and monorepos.
- Avoid organization-specific secrets in workflow names. Use neutral inputs and
  secrets that callers can map from their own repositories.
- Do not add project-specific deployment logic unless it is behind an explicit
  input.
- Keep distributable artifact workflows guarded by manifest/checksum generation,
  secret scanning, and optional attestation rather than caller-managed shell.
- Add or update contract checks when changing workflow security defaults,
  permissions, dependency installation, or artifact behavior.

## Pull Requests

1. Make the smallest change that solves the problem.
2. Update documentation and examples for caller-facing behavior.
3. Add or update contract tests for new invariants.
4. Run the local checks and paste the results into the pull request.
5. Call out permission changes, secret handling, shell execution, artifact
   contents, and migration impact.

## Review

Maintainers may ask for changes to scope, naming, documentation, tests,
permissions, or compatibility. Review is part of keeping SymPress Workflows
consistent and safe across consumer repositories.

## License

By contributing, you agree that your contribution is licensed under the project
license.

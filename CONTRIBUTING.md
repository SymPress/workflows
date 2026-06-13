# Contributing

Thanks for improving SymPress automation.

## Local Checks

Run these checks before opening a pull request:

```sh
npm ci
npm run lint:workflows
npm run lint:docs
```

## Workflow Guidelines

- Prefer explicit `permissions`.
- Keep reusable workflows callable through `workflow_call`.
- Keep default versions aligned with current SymPress projects: PHP 8.5,
  Composer 2, Node 24, and WordPress-friendly tooling.
- Support `working-directory` for package repositories and monorepos.
- Avoid organization-specific secrets in workflow names. Use neutral inputs and
  secrets that callers can map from their own repositories.
- Do not add project-specific deployment logic unless it is behind an explicit
  input.

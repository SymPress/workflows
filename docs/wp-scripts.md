# WordPress Scripts Lint

Use `wp-scripts-lint.yml` when a package uses `@wordpress/scripts`.

```yml
jobs:
  wp-scripts:
    uses: sympress/workflows/.github/workflows/wp-scripts-lint.yml@8f03d8b2520e366e5d7cc3398e0c368ccb83e311 # v1.3.0
    with:
      lint_tools: '["js","style","md-docs","pkg-json"]'
```

Supported tools:

- `js`: `wp-scripts lint-js`
- `style`: `wp-scripts lint-style`
- `md-docs`: `wp-scripts lint-md-docs`
- `pkg-json`: `wp-scripts lint-pkg-json`

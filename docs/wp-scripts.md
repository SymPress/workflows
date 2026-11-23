# WordPress Scripts Lint

Use `wp-scripts-lint.yml` when a package uses `@wordpress/scripts`.

```yml
jobs:
  wp-scripts:
    uses: sympress/workflows/.github/workflows/wp-scripts-lint.yml@4d668133403d357d8335fdbfb850bb13a9105ece # v2.0.0
    with:
      lint_tools: '["js","style","md-docs","pkg-json"]'
```

Supported tools:

- `js`: `wp-scripts lint-js`
- `style`: `wp-scripts lint-style`
- `md-docs`: `wp-scripts lint-md-docs`
- `pkg-json`: `wp-scripts lint-pkg-json`

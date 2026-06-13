# WooCommerce QIT

Use `woo-qit.yml` after an archive or build workflow has uploaded an artifact.

```yml
jobs:
  qit:
    uses: sympress/reusable-workflows/.github/workflows/woo-qit.yml@main
    with:
      artifact_name: ${{ needs.archive.outputs.artifact }}
      qit_test: activation
    secrets:
      WOO_PARTNER_USER: ${{ secrets.WOO_PARTNER_USER }}
      WOO_PARTNER_SECRET: ${{ secrets.WOO_PARTNER_SECRET }}
```

Run multiple QIT checks with a matrix:

```yml
strategy:
  matrix:
    qit_test:
      - activation
      - security
```


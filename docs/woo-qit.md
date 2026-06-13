# WooCommerce QIT

Use `woo-qit.yml` after an archive or build workflow has uploaded an artifact.

```yml
jobs:
  qit:
    uses: sympress/reusable-workflows/.github/workflows/woo-qit.yml@v1
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

The QIT executable is downloaded from a pinned `woocommerce/qit-cli` ref by
default. Override `qit_ref` only during planned upgrades. Provide `qit_sha256`
when you want checksum verification for the downloaded executable.

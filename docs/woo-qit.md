# WooCommerce QIT

Use `woo-qit.yml` after an archive or build workflow has uploaded an artifact.

```yml
jobs:
  qit:
    uses: sympress/workflows/.github/workflows/woo-qit.yml@177fa0d727b278d2103052ec77c102b4a4c492a0
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

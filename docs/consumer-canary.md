# Consumer contract canary

Repository checks validate the reusable-workflow calls in `SymPress/cli`,
`SymPress/demo`, and `SymPress/kernel` against the interfaces generated from the
current workflow sources. This catches removed workflows, renamed inputs or
secrets, and newly required arguments before a release.

Run the same check locally against any checked-out consumer:

```bash
npm run generate:interfaces
npm run test:consumers -- ../kernel
```

The canary is structural. Before tagging a behavioral change, point a consumer
branch at the candidate workflow ref and run its normal CI, as described in the
maintainer release process.

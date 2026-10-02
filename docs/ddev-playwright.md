# DDEV Playwright

Use `ddev-playwright.yml` for SymPress Starter projects or other DDEV-backed WordPress setups.

```yml
jobs:
  e2e:
    uses: sympress/workflows/.github/workflows/ddev-playwright.yml@8639b193c127039573a9a907f811db7c3574c23e
    with:
      php_version: '8.5'
      node_version: '24'
```

The workflow supports:

- DDEV PHP and Node version overrides;
- host and DDEV environment variables from JSON secrets;
- private install-only Composer, npm, and SSH authentication;
- verified SSH known hosts required when an install key is supplied;
- optional ngrok setup through a caller-provided command;
- artifact upload and DDEV shutdown on failure.

DDEV starts with an empty read-only authentication mount. Private files are
created only for locked dependency fetches, with mode 0600, and removed on success
or failure before setup, Playwright installation, builds, and tests. Composer
fetches use `--no-scripts --no-plugins`; Node fetches disable lifecycle scripts,
including workspace builds on modern Yarn. Private SSH fetches use supplied
verified known hosts with strict verification; credentials are never copied into
DDEV home additions or repository auth files. The workflow checks the host and
container mount are empty before running project code and repeats cleanup before
shutdown.

Container installation reads a temporary literal script from the private mount
with raw DDEV execution. The install trap also removes that script. Optional
authentication is read inside the container; shell substitutions and secret
values never enter the outer command arguments. Credential checks execute raw
commands and fail if the mount contains files or an SSH agent socket is available.
The temporary project configuration also omits DDEV's SSH agent, preserving
other project omissions and leaving global DDEV settings unchanged. The unused
default socket environment variable is cleared; verification also rejects a
remaining socket file at DDEV's default path.

The default browser install is `npx --no-install playwright install --with-deps`
inside DDEV. Commit dependency lockfiles and install Playwright through the locked
project dependencies. Any application initialization previously performed by
Composer or npm lifecycle hooks must run explicitly in the subsequent authorized
setup/build step. The legacy unpinned command requires the explicit unpinned-install opt-in;
other custom commands require the custom-command opt-in.

Custom DDEV, setup, Playwright, and ngrok commands are disabled by default.
Set `allow_custom_commands: true` only for trusted workflow calls. Hidden files
are excluded from Playwright artifacts unless
`playwright_artifact_include_hidden_files: true` is set.

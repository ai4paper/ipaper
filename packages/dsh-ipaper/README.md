# @isomoes/dsh-ipaper

IPaper is the DeepSeek Harness (DSH) product bundle for planning, researching, drafting, and revising academic papers. It owns the academic-writing preset and IPaper branding while reusing the exact external shared browser dependency `@isomoes/dsh-web-ui@0.5.1`; no shared Web UI source is copied into this package.

## Install and run

Both packages must be direct dependencies of the same DSH profile because browser modules resolve from that profile root:

```sh
dsh plugin --profile ipaper add @isomoes/dsh-ipaper @isomoes/dsh-web-ui@0.5.1 --registry=https://registry.npmjs.org
dsh --profile ipaper
```

Only `@isomoes/dsh-ipaper` belongs in `dsh.profile.bundles`. `@isomoes/dsh-web-ui` is a direct plain dependency, not a second bundle. Use `--host`, `--port`, or repeated `--trusted-host` options when the browser must be reachable beyond the default `127.0.0.1:3090`.

## Update or remove

Keep the Web UI version exact when updating the product:

```sh
dsh plugin --profile ipaper add @isomoes/dsh-ipaper@latest @isomoes/dsh-web-ui@0.5.1 --registry=https://registry.npmjs.org
dsh plugin --profile ipaper remove @isomoes/dsh-ipaper @isomoes/dsh-web-ui
```

After an update, restart DSH and refresh the existing browser page.

## Built-in preset

`academic-writing` is installed as a read-only system-trust preset and is the default for new sessions. Its persona preserves author intent, separates sourced claims from inference, identifies uncertainty and verification gaps, and prohibits fabricated citations, quotations, bibliographic metadata, data, and results.

## Architecture

The Cordis patch composes the shared DSH host/session/transport services, a complete shared Web client roster, the IPaper brand client, and the academic preset. Host registry identities remain product-neutral; product wording is confined to user-facing CLI text, prompts, metadata, branding, and preset content.

The package build:

1. compiles product host adapters;
2. bundles only `ui-brand-ipaper` into shared sidebar/conversation brand slots;
3. resolves `@isomoes/dsh-web-ui/web/index.html` through the dependency's public export;
4. copies the prebuilt shell, applies locally owned IPaper title/manifest/favicon metadata, and removes dangling upstream source-map directives.

The Web shell requires DSH to inject `window.__DSH_BOOT__`; it is not a standalone Vite application.

## Extension recipe

IPaper deliberately adds no private editor or citation API. Extensions use DSH services, Typert contracts, and the shared Web UI slot contract:

1. Publish the extension as its own package and install it directly in the same profile so host and browser entry resolution is deterministic.
2. Define the host service and Remote/Typert contract in that package. Add its Typert package to the `typert-loader.config.packages` list in a profile patch when browser RPC is required.
3. Publish a `dsh.client` entry whose manifest lists every injected shared client and whose browser module contributes only to documented shared slots such as conversation, composer, reference, or settings seats.
4. Add host rows before dependent browser rows in a later profile `cordis.patch.yml` layer; do not edit IPaper's published roster. Use unique row and plugin IDs, and declare ordering/injection explicitly.
5. For reference providers, normalize results through the DSH file/session reference contracts. For citation providers, keep bibliographic retrieval and validation in a typed host service and render through shared composer/conversation slots. Editor integrations should preserve author-owned files and use an explicit save/write service rather than browser-local hidden state.
6. Test the extension against an isolated profile: verify package resolution, Typert registration, host service availability, slot occupancy/order, and operation with the unmodified IPaper composition.

This layering lets later editor, reference, and citation backends extend the product without forking the shell or coupling to IPaper internals.

## Development

Requires Node `^22.19.0 || >=24.0.0`, pnpm 11.7.0, and a configured DSH model provider.

```sh
pnpm install --frozen-lockfile
pnpm typecheck
pnpm build
pnpm test
pnpm pack:check
pnpm dev          # builds, installs profile ipaper-dev, starts brand watcher + DSH
pnpm dev:config   # print the effective installed composition
```

`pnpm dev:remove` removes both direct profile dependencies. Product-brand HMR requires the watcher started by `pnpm dev`; shared shell updates always require rebuilding, restarting DSH, and refreshing the existing URL.

## License

MIT

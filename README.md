# IPaper

IPaper is an academic paper-writing product bundle for [DeepSeek Harness (DSH)](https://www.npmjs.com/package/@deepseek-ai/dsh). The publishable package is `@isomoes/dsh-ipaper`; it owns the product preset and branding while reusing exactly `@isomoes/dsh-web-ui@0.5.1` as an external shared browser dependency.

## Install, run, and update

Both packages must be direct dependencies of the same DSH profile because browser client modules resolve from the profile root:

```sh
DSH_HOME="$HOME/.ipaper" dsh plugin --profile ipaper add @isomoes/dsh-ipaper @isomoes/dsh-web-ui@0.5.1 --registry=https://registry.npmjs.org
DSH_HOME="$HOME/.ipaper" dsh --profile ipaper
```

Only `@isomoes/dsh-ipaper` belongs in `dsh.profile.bundles`; Web UI remains a direct plain dependency. To update or remove:

```sh
DSH_HOME="$HOME/.ipaper" dsh plugin --profile ipaper add @isomoes/dsh-ipaper@latest @isomoes/dsh-web-ui@0.5.1 --registry=https://registry.npmjs.org
DSH_HOME="$HOME/.ipaper" dsh plugin --profile ipaper remove @isomoes/dsh-ipaper @isomoes/dsh-web-ui
```

Restart DSH and refresh the existing browser page after updates.

## Development and validation

Requires Node `^22.19.0 || >=24.0.0`, pnpm 11.7.0, and a configured DSH model provider.

```sh
pnpm install --frozen-lockfile
pnpm typecheck
pnpm build
pnpm test
pnpm pack:check
pnpm dev
pnpm dev:config
```

`pnpm dev` packs and installs IPaper with both direct dependencies into `ipaper-dev`, then runs the IPaper brand watcher beside DSH. The archive install deliberately avoids duplicate DSH service modules from a workspace link; the watcher mirrors its rebuilt browser artifact into that installed package for client HMR. `pnpm dev:remove` removes both packages. The build copies the prebuilt shell through the dependency's public `./web/*` export, applies locally owned IPaper metadata, and does not contain or rebuild shared Web UI source.

## Built-in preset

`ipaper` is the product's supported built-in agent preset. It is read-only, system-trust, and the default for new sessions, supporting scholarly planning, research, drafting, and revision while preserving author intent and forbidding fabricated citations, quotations, bibliographic metadata, data, and results. In **Agent presets**, users can duplicate `ipaper` into their writable profile preset directory, customize the copied composition and metadata, and select it for later sessions. General and code-agent preset roots remain excluded.

## Architecture and extensions

The Cordis patch composes product-neutral DSH host/session/transport services, the complete shared browser roster, IPaper's branding client, and the academic preset. The shared shell uses DSH-injected `window.__DSH_BOOT__` and is not a standalone Vite app.

Extensions remain separate profile-root packages rather than forks of IPaper. Define host services and Remote/Typert contracts in the extension, register required contract packages in `typert-loader.config.packages`, and publish `dsh.client` entries that inject documented shared Web UI clients and occupy shared conversation, composer, reference, or settings slots. Add host rows before dependent browser rows in a later profile patch, with unique IDs and explicit ordering. Reference providers should use DSH reference contracts; citation providers should keep retrieval/validation in typed host services; editor integrations should preserve author files through explicit save services. Validate resolution, Typert registration, service availability, and slot ordering in an isolated profile with the unmodified IPaper bundle.

The publishable package README contains the complete extension recipe and package-specific runtime details.

## Historical note

Before this migration, IPaper was a standalone Bun/Hono/React 19/Claude Agent SDK chat prototype. That runtime has been removed; repository history retains it for archaeology.

## License

MIT

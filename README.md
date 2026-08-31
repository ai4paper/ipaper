# IPaper

IPaper is an academic paper-writing product bundle for [DeepSeek Harness (DSH)](https://www.npmjs.com/package/@deepseek-ai/dsh). The publishable package is `@ai4paper/dsh-ipaper`; it owns the product preset and branding while reusing exactly `@isomoes/dsh-web-ui@0.5.1` as an external shared browser dependency and `@ai4paper/apaper-plugin@0.2.3` as its profile-root academic toolkit.

## Install, run, and update

All three packages must be direct dependencies of the same DSH profile because browser modules and agent-preset extensions resolve from the profile root:

```sh
DSH_HOME="$HOME/.ipaper" dsh plugin --profile ipaper add @ai4paper/dsh-ipaper @isomoes/dsh-web-ui@0.5.1 @ai4paper/apaper-plugin@0.2.3 --registry=https://registry.npmjs.org
DSH_HOME="$HOME/.ipaper" dsh --profile ipaper
```

Only `@ai4paper/dsh-ipaper` belongs in `dsh.profile.bundles`; Web UI and APaper remain direct plain dependencies. To update or remove:

```sh
DSH_HOME="$HOME/.ipaper" dsh plugin --profile ipaper add @ai4paper/dsh-ipaper@latest @isomoes/dsh-web-ui@0.5.1 @ai4paper/apaper-plugin@0.2.3 --registry=https://registry.npmjs.org
DSH_HOME="$HOME/.ipaper" dsh plugin --profile ipaper remove @ai4paper/dsh-ipaper @isomoes/dsh-web-ui @ai4paper/apaper-plugin
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

`pnpm dev` builds IPaper and links all three direct profile dependencies into this workspace's installed dependency graph, then runs the IPaper brand watcher beside DSH. Linking Web UI and APaper alongside the live IPaper checkout prevents duplicate profile-root DSH runtimes from splitting private service symbols, while rebuilt host, preset, and browser artifacts remain immediately visible. `pnpm dev:remove` removes all three packages. The build copies the prebuilt shell through the dependency's public `./web/*` export, applies locally owned IPaper metadata, and does not contain or rebuild shared Web UI source.

## Built-in preset

`ipaper` is the product's supported built-in agent preset. It is read-only, system-trust, and the default for new sessions. The preset activates [APaper](https://github.com/ai4paper/apaper-plugin), providing its `writing` and `creating-figures` skills and `apaper-mcp` literature-research tools, while preserving author intent and forbidding fabricated citations, quotations, bibliographic metadata, data, and results. In **Agent presets**, users can duplicate `ipaper` into their writable profile preset directory, customize the copied composition and metadata, and select it for later sessions. General and code-agent preset roots remain excluded.

## Architecture and extensions

The Cordis patch composes product-neutral DSH host/session/transport services, the complete shared browser roster, IPaper's branding and paper-status clients, and the academic preset. It also mounts one host-owned `paperProjects` service over the versioned `ipaper_project` DSH storage domain. That service owns workspace/session resolution, per-workspace serialization, deterministic graph IDs, optimistic node versions, recoverable multi-record commits, and committed read snapshots. A read-only trusted RPC supplies a workspace-scoped **Paper status** main surface with dynamic framing, research, argument, production, and validation signals—never a fabricated global completion percentage. One button in the left sidebar—or `Mod+Shift+P`—toggles that surface in place of the conversation and returns to chat when invoked again. The `ipaper` preset exposes exactly two graph tools—`ipaper_record` and `ipaper_state`—and injects their provenance and checkpoint protocol as a scoped system-prompt section. The shared shell uses DSH-injected `window.__DSH_BOOT__` and is not a standalone Vite app.

Extensions remain separate profile-root packages rather than forks of IPaper. Define host services and Remote/Typert contracts in the extension, register required contract packages in `typert-loader.config.packages`, and publish `dsh.client` entries that inject documented shared Web UI clients and occupy shared conversation, composer, reference, or settings slots. Add host rows before dependent browser rows in a later profile patch, with unique IDs and explicit ordering. Reference providers should use DSH reference contracts; citation providers should keep retrieval/validation in typed host services; editor integrations should preserve author files through explicit save services. Validate resolution, Typert registration, service availability, and slot ordering in an isolated profile with the unmodified IPaper bundle.

The publishable package README contains the complete extension recipe and package-specific runtime details.

## Historical note

Before this migration, IPaper was a standalone Bun/Hono/React 19/Claude Agent SDK chat prototype. That runtime has been removed; repository history retains it for archaeology.

## License

MIT

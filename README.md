# IPaper

IPaper is an academic paper-writing product bundle for [DeepSeek Harness (DSH)](https://www.npmjs.com/package/@deepseek-ai/dsh). The publishable package, `@ai4paper/dsh-ipaper`, contributes academic presets, paper-project tools and views, and branding to upstream DSH Web `0.2.2-rc.1`. APaper supplies the profile-root academic toolkit.

## Install, run, and update

Use DSH `0.2.2-rc.1` and pnpm 11. APaper `0.2.3` requires a profile-local override so its MCP adapter shares the supported DSH runtime. For a new profile, create this configuration before installing:

```sh
mkdir -p "$HOME/.ipaper/profiles/ipaper"
cat > "$HOME/.ipaper/profiles/ipaper/pnpm-workspace.yaml" <<'YAML'
packages:
  - .
nodeLinker: hoisted
autoInstallPeers: true
overrides:
  '@ai4paper/apaper-plugin@0.2.3>@deepseek-ai/dsh-mcp-client': 0.2.2-rc.1
allowBuilds:
  '@deepseek-ai/dsh-subprocess-local': true
  node-pty: true
  '@google/genai': false
  esbuild: true
  koffi: true
  protobufjs: false
YAML
```

Install upstream Web before IPaper; APaper remains a separate direct dependency:

```sh
DSH_HOME="$HOME/.ipaper" dsh plugin --profile ipaper add @deepseek-ai/dsh-base@0.2.2-rc.1 @deepseek-ai/dsh-web-app@0.2.2-rc.1 --registry=https://registry.npmjs.org
DSH_HOME="$HOME/.ipaper" dsh plugin --profile ipaper add @deepseek-ai/dsh@0.2.2-rc.1 @ai4paper/dsh-ipaper @ai4paper/apaper-plugin@0.2.3 --registry=https://registry.npmjs.org
DSH_HOME="$HOME/.ipaper" pnpm --dir "$HOME/.ipaper/profiles/ipaper" exec dsh --profile ipaper
```

The profile's bundle order is `@deepseek-ai/dsh-base`, `@deepseek-ai/dsh-web-app`, then `@ai4paper/dsh-ipaper`. The CLI and APaper are plain dependencies, not bundles. Launch and manage the installed product through its profile-local CLI to keep DSH service identities shared. To update or remove the product:

```sh
DSH_HOME="$HOME/.ipaper" pnpm --dir "$HOME/.ipaper/profiles/ipaper" exec dsh plugin --profile ipaper add @ai4paper/dsh-ipaper@latest @ai4paper/apaper-plugin@0.2.3 --registry=https://registry.npmjs.org
DSH_HOME="$HOME/.ipaper" pnpm --dir "$HOME/.ipaper/profiles/ipaper" exec dsh plugin --profile ipaper remove @ai4paper/dsh-ipaper @ai4paper/apaper-plugin
```

Preserve the profile override during updates; merge it into an existing workspace file rather than replacing other settings. Restart DSH and refresh the browser page after updates. See the [migration reference](docs/upstream-web-migration.md) before updating an existing fork-based profile.

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

`pnpm dev` builds IPaper, provisions the development profile, and runs the product-client watcher beside DSH. Upstream Web supplies the shell and standard plugins; IPaper builds only its product plugins and branding assets. The shell requires DSH-injected `window.__DSH_BOOT__`.

## Built-in preset

`ipaper` is the supported built-in agent preset: read-only, system-trust, and the default for new sessions. It includes IPaper's `find-the-problem` skill and activates [APaper](https://github.com/ai4paper/apaper-plugin), providing `writing`, `creating-figures`, and literature-research tools. The persona preserves author intent and prohibits fabricated citations, quotations, bibliographic metadata, data, and results. Users can manually copy the preset into the writable user root, customize it, and restart DSH; the [package README](packages/dsh-ipaper/README.md#custom-presets) describes the procedure. General and code-agent system roots are excluded.

Select `/find-the-problem` from the composer or **Start guided workflow** in Paper status to begin live search, shortlisting, boundary mapping, gap verification, and interest/novelty/feasibility selection.

## Architecture and extensions

The product Cordis patch extends upstream Web with academic presets, branding, and Paper status. One host-owned `paperProjects` service stores the workspace-scoped [Paper Project Graph](packages/dsh-ipaper/README.md#architecture), with provenance, deterministic IDs, optimistic versions, recoverable commits, and read-only trusted browser access. The `ipaper_record` and `ipaper_state` tools expose the graph to root agents and subagents. Paper status shows the **Find a question** boundary map and framing, research, argument, production, and validation signals without inventing a global completion percentage.

The [shared research memory design](docs/arch.md) describes the planned simplification to sources, findings, and notes and the migration from the current graph.

Extensions remain separate profile-root packages and use upstream public service, RPC, and browser-slot contracts. The [package README](packages/dsh-ipaper/README.md) defines the extension recipe and package-specific runtime details.

## License

MIT

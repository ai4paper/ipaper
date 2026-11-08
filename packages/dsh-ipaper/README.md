# @ai4paper/dsh-ipaper

IPaper is the DeepSeek Harness (DSH) product bundle for planning, researching, drafting, and revising academic papers. It extends upstream `@deepseek-ai/dsh-web-app@0.2.2-rc.1` with academic presets, paper-project services and views, and branding. The profile-root academic toolkit is `@ai4paper/apaper-plugin@0.2.3`.

## Install and run

Use DSH `0.2.2-rc.1` and pnpm 11. APaper `0.2.3` requires a profile-local override for its MCP adapter. For a new profile, prepare this before installation; merge the override rather than overwriting an existing workspace file:

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

Install upstream Web before IPaper in the same profile:

```sh
DSH_HOME="$HOME/.ipaper" dsh plugin --profile ipaper add @deepseek-ai/dsh-base@0.2.2-rc.1 @deepseek-ai/dsh-web-app@0.2.2-rc.1 --registry=https://registry.npmjs.org
DSH_HOME="$HOME/.ipaper" dsh plugin --profile ipaper add @deepseek-ai/dsh@0.2.2-rc.1 @ai4paper/dsh-ipaper @ai4paper/apaper-plugin@0.2.3 --registry=https://registry.npmjs.org
DSH_HOME="$HOME/.ipaper" pnpm --dir "$HOME/.ipaper/profiles/ipaper" exec dsh --profile ipaper
```

The profile's `dsh.profile.bundles` order is `@deepseek-ai/dsh-base`, `@deepseek-ai/dsh-web-app`, then `@ai4paper/dsh-ipaper`. The CLI and APaper are direct plain dependencies, not bundles. Launch and manage the product through the profile-local CLI so its runtime and profile plugins share service identities. Upstream Web owns launch flags, transport, and the standard browser roster. Use `--host`, `--port`, or repeated `--trusted-host` options when the browser must be reachable beyond the default `127.0.0.1:3080`.

## Update or remove

Keep the supported DSH and APaper versions exact when updating the product:

```sh
DSH_HOME="$HOME/.ipaper" pnpm --dir "$HOME/.ipaper/profiles/ipaper" exec dsh plugin --profile ipaper add @ai4paper/dsh-ipaper@latest @ai4paper/apaper-plugin@0.2.3 --registry=https://registry.npmjs.org
DSH_HOME="$HOME/.ipaper" pnpm --dir "$HOME/.ipaper/profiles/ipaper" exec dsh plugin --profile ipaper remove @ai4paper/dsh-ipaper @ai4paper/apaper-plugin
```

Preserve the profile-local override across updates. After an update, restart DSH and refresh the existing browser page. Existing fork-based profiles require the layer-order migration in the [migration reference](../../docs/upstream-web-migration.md).

## Built-in preset

`ipaper` is the product's supported built-in agent preset. It is installed as read-only system-trust and is the default for new sessions. It ships the IPaper-owned `find-the-problem` skill and activates [APaper](https://github.com/ai4paper/apaper-plugin), which contributes the `writing` and `creating-figures` skills and `apaper-mcp` literature-research tools. `/find-the-problem` is model- and user-invocable: it appears in the shared composer skill picker, and the Paper status **Start guided workflow** action submits the same ordinary user prompt to begin live search, human shortlisting, PDF boundary analysis, gap verification, and interest/novelty/feasibility selection. General and code-agent system presets remain excluded. The supported persona preserves author intent, separates sourced claims from inference, identifies uncertainty and verification gaps, and prohibits fabricated citations, quotations, bibliographic metadata, data, and results.

### Custom presets

The upstream registry exposes read-only preset documents; the previous browser duplication editor is retired. IPaper discovers user-authored directories under `<dshHome>/.agent-presets` at startup. To create a copy for the installation above:

```sh
mkdir -p "$HOME/.ipaper/.agent-presets"
cp -R "$HOME/.ipaper/profiles/ipaper/node_modules/@ai4paper/dsh-ipaper/preset/ipaper" "$HOME/.ipaper/.agent-presets/my-paper"
```

Edit `my-paper/preset.yml` and `my-paper/agent.cordis.yml`, then restart DSH and select the new preset. The directory name is its identity. The packaged `ipaper` identity always takes precedence over a same-named user directory. User compositions are executable configuration; the adapter validates metadata and plugin entries without evaluating Loader expressions during discovery. Invalid files fail startup rather than silently falling back. The adapter never writes either preset root.

## Architecture

The product Cordis patch extends upstream Web with IPaper-owned brand and paper-status clients and the academic preset. It mounts the singleton `paperProjects` host service after DSH storage and workspace services. The service owns one durable research memory per workspace in the `ipaper_memory` domain, trusted session/parent-lineage resolution, project-scoped IDs, optimistic versions, and per-workspace write queues. Sources, findings, and notes contain origin, related-record, and workspace-file references. Manuscripts and working plans remain author-owned files. Trusted read-only RPC powers **Paper status**, showing bounded counts, recent records, and author-marked unresolved questions. The `ipaper` preset exposes exactly `ipaper_record` and `ipaper_state`, with a scoped system-prompt protocol for root and subagent use. Host registry identities remain product-neutral; product wording is confined to prompts, metadata, branding, and preset content.

### Research memory tools

`ipaper_record` accepts `records` and/or `updates`, with at most 50 entries in each array. Creates require `ref`, `kind` (`source`, `finding`, or `note`), `title`, and `text`. Updates require `id` and `expectedVersion`. Optional mutable fields are `title`, `text`, `archived`, `unresolved`, `quotation`, `uncertainty`, `source`, and `references`. Supplied arrays and source metadata replace their previous values. Unspecified fields retain their values. Titles are limited to 1,000 characters, text to 50,000, uncertainty to 5,000, and references to 100 per supplied record.

Source metadata has `inspection` (`discovered` or `inspected`), optional `doi`, `url`, `citationKey`, and plain-text `bibliographicMetadata`. Inspected sources also require `inspectedContent`, describing what was actually read. Source metadata is only valid on sources. `unresolved` marks an author-identified question on a finding or note. `quotation` is valid only on findings and requires an origin reference with a precise locator. Findings describe uncertainty in plain text; a reference or identifier does not certify verification or scholarly support.

Migrated inspected sources with no recorded summary carry an explicit historical description of that gap; see [migration normalization](../../docs/arch.md#migration-from-the-graph).

References use one of these shapes:

- `{ "kind": "origin", "recordId": "<source ID or batch ref>", "locator": "Section 2, p. 3" }`, or the same shape with `path` instead of `recordId`;
- `{ "kind": "related", "recordId": "<ID or batch ref>", "explanation": "Optional relationship description" }`;
- `{ "kind": "file", "path": "draft.md", "locator": "Optional location" }`.

Paths must remain inside the workspace, including through existing symlinks. They do not create files. Record reads report current file existence and check time. A missing file is permitted; an escaping path is rejected. Creates may reference each other's call-local aliases. All record IDs belong to the caller's resolved project. Root agents can update and archive; subagents can append and reference records without a `taskId`, but cannot update existing records. Results return `projectId`, `revision`, alias-to-ID `created` mappings, and `updated` IDs with versions. Read fresh state and reconcile before retrying a version conflict.

Containment checks also resolve symlinks whose targets are missing and reject symlink loops. A symlinked workspace root is supported.

`ipaper_state` defaults to `view: "summary"`, with active-record counts, up to ten recent records, and up to ten explicitly unresolved findings or notes. `search` supports `kinds`, case-insensitive `query`, and `includeArchived`. `record` requires `recordId` and returns full content, references, and paginated incoming references. `history` optionally filters by `recordId` and returns change summaries. Paginated views accept `limit` (1–100, default 20) and a returned `cursor`; repeat the same query to continue and restart pagination after a revision change. Search and history text snippets are capped at 400 characters. Full before/after records remain in host storage.

The host creates memory on the first agent or registered-workspace browser read. Each complete workspace revision is stored atomically as one format-version-2 record, including change history. This provides single-host batch visibility and restart safety, but rewrites the workspace's memory and history on each batch; large archives may need a later storage optimization. Browser reads never expose the complete storage record or legacy snapshots.

Startup recovers pending v1 graph commits and migrates sources to sources, evidence/claims to findings, and other semantic nodes to notes. Original nodes, relationships, events, and project metadata remain in a recoverable host-only legacy snapshot and the retained `ipaper_project` domain. The memory format uses project-scoped IDs; original IDs remain in migration metadata. Migration does not overwrite workspace files or infer unresolved questions from legacy statuses. Legacy history is retained in storage rather than merged into the new history view. Restart skips already migrated projects. Legacy graph payloads (`nodes`, `edges`, `taskId`, and old read views) receive a compatibility error; use the current tool schemas after upgrading.

The package build:

1. compiles product host adapters and the read-only Paper Project status RPC;
2. bundles one package-root browser module containing product branding and Paper status contributions to upstream slots;
3. packages product-owned favicon and manifest assets.

Upstream Web resolves and serves its own shell. IPaper does not copy shared Web source or assets. Compatibility decisions and verification evidence live in the [migration reference](../../docs/upstream-web-migration.md).

The Web shell requires DSH to inject `window.__DSH_BOOT__`; it is not a standalone Vite application.

### Browser contributions

**Paper status** is available from the sidebar even before the first message, and as a conversation-view tab. Both views use the selected session's workspace. The upstream tab overflow menu exposes the tab when the viewport is narrow. **Start guided workflow** is available with empty memory; it submits `/find-the-problem` through the upstream session binding, returns to chat on success, and displays submission failures inline. The summary shows up to ten records per section; use agent memory search and record reads for details.

The brand client occupies upstream sidebar and conversation artwork slots. Upstream owns its headline, version labels, navigation, and shortcut policy. To use blue/orange status accents while preserving upstream light/dark/system preferences, add this profile patch:

```yaml
- id: ipaper-brand
  config:
    colorblind: true
```

The palette uses public theme-token overrides rather than a separate custom theme ID; the profile owns this preference, while upstream persists the user's light/dark/system selection.

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

`pnpm dev` provisions upstream Web and IPaper in `ipaper-dev`, keeping DSH service symbols in one workspace dependency graph. Product-brand HMR requires the watcher started by `pnpm dev`; upstream dependency updates require rebuilding, restarting DSH, and refreshing the existing URL.

The workspace dev launcher defaults to an OS-assigned available port and DSH prints the browser URL. See the [workspace development instructions](../../README.md#development-and-validation) for fixed-port usage.

## License

MIT

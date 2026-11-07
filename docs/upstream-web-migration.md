# Upstream Web migration

This reference records IPaper's implemented migration from the shared Web fork to upstream DSH Web `0.2.2-rc.1`, the retained compatibility adaptations, and verification evidence. The migration adopts upstream interaction policies; it does not claim parity with every historical fork feature. The [Paper Project Graph architecture](arch.md) owns the scholarly process model.

## Composition and ownership

```text
@deepseek-ai/dsh-base
  → @deepseek-ai/dsh-web-app
    → @ai4paper/dsh-ipaper
```

Upstream owns the shell, Web startup, transport, standard browser roster, and shared UI services. IPaper contributes academic presets, citation-integrity requirements, skills, paper-project services and views, and branding. The fork dependency, copied roster, startup adapters, module aliases, and copied shell are removed.

IPaper publishes one package-root `./client` browser module with a `dsh.client` manifest. Upstream `0.2.2-rc.1` discovers exact package specifiers and path-like entries, not the fork's nested package subpaths. The product-brand host row discovers the browser half, whose internal contributions occupy upstream slots. Product code does not copy shared UI source.

The host uses `webServer.tapIndex()` and exact resource routes for title metadata, favicon, manifest, and product configuration metadata. The build copies only the two product-owned branding assets. A public shell-slot contribution maintains the live document title, as detailed under retained adaptations.

Cordis patches change specific rows. Overriding `config` replaces that entire field, so an override must restate every owned key. The product's Connection compatibility override changes only `inject`, preserving upstream transport configuration.

## Installation and runtime identity

The [root README](../README.md#install-run-and-update) and [package README](../packages/dsh-ipaper/README.md#install-and-run) contain installation procedures. Provision base/Web first, then the profile-local CLI, IPaper, and APaper. The CLI and APaper are plain direct dependencies, not bundles. Launch and manage the installed profile through its local CLI with a hoisted dependency graph and automatic peer installation.

Launching registry-installed profile plugins through the repository/global CLI reproduced a split runtime identity: saving the Preview Notice setting failed with `dsh: profile reload requires the root Include entry`. Installing and launching the CLI from the same profile graph fixes the actual live settings reload. Matching version numbers alone did not prevent the split.

APaper remains pinned to `0.2.3`: versions `0.3.0` and `0.3.1` no longer ship its DSH adapter. The workspace and installed profiles override only `@ai4paper/apaper-plugin@0.2.3>@deepseek-ai/dsh-mcp-client` to `0.2.2-rc.1`. Profile policy also includes the upstream native-build decisions; an override-only workspace file is insufficient. Installation scripts merge required policy while preserving other settings and extension dependencies.

### Existing profiles

Stop DSH before migrating a fork-based profile. Preserve its settings and custom extensions, remove `@isomoes/dsh-web-ui`, and establish base → Web → IPaper bundle order, followed by later extension bundles. Merge the documented profile workspace policy, install the supported versions and profile-local CLI, then use that CLI to restart. Session and Paper Project storage remain under the existing DSH home; migration does not require deleting them.

`pnpm dev:install` performs this composition migration for the managed `ipaper-dev` profile. User presets remain under `.agent-presets`. The new adapter registers the packaged preset first, prevents user shadowing, preserves Loader expressions, and rejects invalid user compositions. Upstream exposes read-only preset documents; duplication and editing now use files plus a restart, as described in [Custom presets](../packages/dsh-ipaper/README.md#custom-presets).

## Comparison baseline

| Source | Version and evidence |
| --- | --- |
| Historical fork | `@isomoes/dsh-web-ui@0.5.1`, iKanban commit [`02332d434a3f3d6d9fdcac503101143532239e8e`](https://github.com/isomoes/ikanban/tree/02332d434a3f3d6d9fdcac503101143532239e8e/packages/web-ui) |
| Fork's recorded upstream baseline | DSH `0.1.1-rc.1`, commit `528c682e061696f5a160f363f236ecbf53cbd006`, recorded in the fork's `UPSTREAM.md` |
| Adopted upstream | DSH `0.2.2-rc.1`, commit [`66491b05e3f05ad35bcdd4f6cd7ed26041d9e3db`](https://github.com/deepseek-ai/deepseek-harness/tree/66491b05e3f05ad35bcdd4f6cd7ed26041d9e3db) |

The initial comparison inspected source and package documentation. Final compatibility checks use the published packages; browser evidence is scoped below. Missing historical equivalents are product decisions rather than automatic upstream defects.

## Product behavior decisions

| Area | Adopted behavior |
| --- | --- |
| Shortcuts | Upstream registry, editor, persistence, conflict handling, and platform policy. Linux Web leaves many actions, including archive, unbound by default. The fork's Paper status binding is retired. |
| Navigation focus | Upstream desktop composer autofocus on session navigation; no focus-preservation override. |
| Archive navigation | Upstream clears the archived main-session selection; no automatic next-session selection. |
| Model defaults | Upstream process default and per-session selection; no workspace-default precedence or implicit migration of fork-local settings. |
| Sounds | Completion and permission sounds are retired from the bundled product. |
| Transcript navigation | Upstream scrolling and editable-control handling; no document-wide Arrow/PageUp/PageDown handler. |
| Palette and workspace switching | Upstream command and shortcut surfaces; the fork's local palette and fuzzy switcher are retired. |
| Timeline | Upstream completed-turn branching. The fork's combined prompt-restoration, quiesce, and archive transaction is retired, not represented as equivalent. |
| Workspace review | Upstream per-turn changes and comparisons; the fork's whole-workspace review view is retired. |
| Presentation | Upstream controls, layout, headline, and version labels, with IPaper artwork, document branding, and Paper status. Academic preset filtering and citation integrity remain product-owned. |
| Colorblind palette | Optional blue/orange dual-mode token overrides through the public theme API. Upstream persists light/dark/system selection; the profile owns the palette switch, applied on page load. Custom upstream theme IDs are not persisted, so IPaper does not use one. |

Paper status uses a public sidebar/main panel for access before the first message, alongside a visible conversation-view tab. Both use the selected session's workspace. The empty graph offers **Start guided workflow**; successful `/find-the-problem` submission returns to chat, while rejected receipts remain visible as inline errors. No hidden tab, sidebar portal, or global layout manipulation is needed.

### Reference latency and cancellation

Published upstream `0.2.2-rc.1` combines file and session lookup behind `Promise.all`. Tests confirm that an unresolved session lookup delays ready file candidates, and a failed session lookup can discard successful file results. Quoted paths skip session lookup. Superseded and closed requests receive an aborted signal; late settlements cannot overwrite newer suggestions or reopen a dismissed menu.

IPaper accepts this upstream latency limitation rather than retaining the fork's reference implementation. Separate public trigger sources can settle independently, but the registry cannot remove or split another plugin's source; adding a second file source would duplicate results. No reference source patch is shipped. Any future performance patch must preserve reference codecs, retained-session behavior, breadcrumbs, quoted paths, and cancellation.

## Retained compatibility adaptations

| Scope | Demonstrated gap | Regression and removal condition |
| --- | --- | --- |
| `@deepseek-ai/dsh-client-connection@0.2.2-rc.1` | Registering the custom Paper RPC in a packaged profile fails with `cannot get property "webServer" without inject`; the registrar reads its provider context. | Add `webServer` alongside upstream `webStartup` injection. The real Connection/WebServer test checks unauthorized rejection, authenticated status, and disposal. Remove the provider injection when that test and packaged startup pass without it. |
| APaper `0.2.3` MCP dependency | The adapter declares an older MCP runtime. | The scoped profile override and `pack:check` verify that APaper and the profile resolve the same module at the supported version. Remove the override on a compatible APaper DSH-adapter release. |
| `@deepseek-ai/dsh-client-ui-layout@0.2.2-rc.1` document title | The shell overwrites the host title with its build-time product name during navigation and exposes no runtime title option. | A null-rendering `shell.overlay` occupant reads public session/panel mirrors and schedules IPaper's title after the passive-effect flush. Cleanup cancels stale writes. Unit tests check the pinned upstream effect contract; browser checks cover navigation and rename. Replace this projection when upstream exposes runtime title configuration. |

No upstream source/package patch is carried. On every upstream upgrade, rerun each adaptation's reproducer against unmodified upstream and remove adaptations whose requirements pass there. Keep useful behavior-level regression coverage; a partial equivalent requires an explicit decision about the remaining behavior.

## Verification

- `pnpm typecheck` passed; `pnpm test` passed all 69 tests covering host/browser contracts, preset precedence and user roots, scholarly integrity, durable session lineage, APaper skills, RPC ownership, product slots, and title lifecycle.
- `pnpm pack:check` passed against a tarball installed in a clean profile. It checks exports, product-only assets, source-map references, bundle order, APaper module identity, upstream startup, 73 browser module identities and their batches, branding resources, Paper RPC, live settings reload, default preset, session creation, and all three packaged skills.
- An unmodified upstream `web` profile was started and opened in Linux Chromium before product verification. The packaged IPaper profile passed Chromium checks for branding, settings persistence, platform shortcuts, navigation/focus, rename/title transitions, Paper status before the first prompt, rejected/successful workflow receipts, and archive selection. The rebuilt profile also passed with the colorblind palette enabled, including the dark success token after a page reload.
- Reference tests execute intact published browser bundles with stubbed services. Browser checks additionally hold and release reference responses to reproduce latency coupling, dismissal, and quoted-path behavior. They establish client cancellation/rendering semantics, not cancellation of server-side work.
- Workflow browser checks intercept prompt receipts; no model prompts are sent. The retired timeline/archive transaction is not claimed as retained or tested. Native macOS/Windows keyboard behavior and real-model research output are outside this verification.

### Repeating browser verification

Use an isolated profile because the check creates a workspace/session and changes appearance settings. Run `TMPDIR=/tmp/opencode PACK_CHECK_KEEP=1 pnpm pack:check`, restart the retained profile using its printed profile-local CLI command, and copy its authenticated launch URL. With Playwright Chromium installed, run:

```sh
pnpm browser:check 'http://127.0.0.1:PORT/?token=TOKEN'
```

`CHROMIUM_PATH=/usr/bin/chromium` selects an existing Chromium installation. `IPAPER_COLORBLIND=1` additionally checks the dark palette when the profile enables `ipaper-brand.config.colorblind`. Browser fixtures are retained under the temporary directory for inspection.

## Alternatives and trade-offs

**Continue the shared fork.** This preserves old interactions with less initial work but retains source-refresh maintenance and blocks direct upstream adoption.

**Port every customization unchanged.** This duplicates upstream assembly and evolved interaction infrastructure. Explicit product decisions keep the extension focused, at the cost of documented interaction differences.

**Use configuration for every change.** Configuration handles composition, not arbitrary internal behavior. Public product contributions cover branding and Paper status; the small version-pinned title projection addresses the demonstrated missing runtime option without copying the shell.

One distributable bundle does not imply automatic profile initialization or a single runtime plugin. Separate extension dependencies and shared runtime identity remain installation contracts, verified against packaged profiles rather than inferred from linked development.

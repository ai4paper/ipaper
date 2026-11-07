# Upstream Web migration

This reference defines the target composition, compatibility findings, and completion requirements for replacing IPaper's shared Web fork with upstream DSH Web. The migration is not implemented: IPaper currently declares DSH `^0.1.1-rc.1` and `@isomoes/dsh-web-ui@0.5.1`.

## Scope

IPaper currently owns a broad Web roster in `packages/dsh-ipaper/cordis.patch.yml`, startup/runtime glue in `packages/dsh-ipaper/src/startup.ts` and `src/index.ts`, and a build helper that copies the shared shell into `lib/web`. The shared dependency contains both useful custom behavior and copied upstream infrastructure, making upstream updates expensive to adopt.

The migration targets one distributable IPaper extension bundle over upstream Web. Retain product behavior and verified missing fixes; retire implementations that upstream already covers. This document owns the migration comparison and rationale, while the [Paper Project Graph architecture](arch.md) owns the scholarly process model.

## Target composition

```text
@deepseek-ai/dsh-base
  → @deepseek-ai/dsh-web-app
    → @ai4paper/dsh-ipaper
```

Upstream owns the shell, Web startup, transport, standard browser roster, and shared UI services. IPaper owns academic presets, integrity requirements, skills, paper-project services and views, branding, and explicitly retained behavior.

One installable IPaper bundle may contribute several host and browser plugins. It does not imply one runtime plugin or automatic profile initialization. Installation must establish the upstream Web layer before IPaper and preserve separate profile-root extensions such as apaper.

Use upstream extension APIs first. Cordis patches add, disable, configure, or replace specific rows; overriding a row replaces its whole `config`, so every owned key must be restated. YAML cannot change arbitrary internal component behavior.

A source/package patch requires a demonstrated missing requirement without a suitable extension point. Each retained patch needs its upstream version, reproducer, affected package, and removal condition. Copying the shell or broad shared UI source into IPaper would retain the ownership problem this migration addresses.

## Comparison baseline

| Source | Version and evidence |
| --- | --- |
| Historical fork | `@isomoes/dsh-web-ui@0.5.1`, iKanban commit [`02332d434a3f3d6d9fdcac503101143532239e8e`](https://github.com/isomoes/ikanban/tree/02332d434a3f3d6d9fdcac503101143532239e8e/packages/web-ui) |
| Fork's recorded upstream baseline | DSH `0.1.1-rc.1`, commit `528c682e061696f5a160f363f236ecbf53cbd006`, recorded in the fork's `UPSTREAM.md` |
| Migration target | DSH `0.2.2-rc.1`, commit [`66491b05e3f05ad35bcdd4f6cd7ed26041d9e3db`](https://github.com/deepseek-ai/deepseek-harness/tree/66491b05e3f05ad35bcdd4f6cd7ed26041d9e3db) |

The old fork is available in the Git history of `/home/isomoes/code/js/ikanban`; its current checkout has removed `packages/web-ui`. Findings below come from source and package-documentation inspection, not browser parity tests. Missing equivalents are candidates for retention, not proof of upstream defects. Upstream client paths below are relative to `packages/client/` unless otherwise specified.

## Compatibility findings

### Implementations to retire

| Old implementation | Upstream coverage and migration treatment |
| --- | --- |
| Shortcut registry, editor, persistence, and conflict handling | `shortcuts/` and `ui-shortcuts/` provide these. Reuse upstream infrastructure and verify desired bindings separately. |
| Archive-session shortcut | `ui-workspace/src/client/shortcuts.ts` provides the action. Retain a custom binding only if required. |
| Fork module aliases, package identities, and copied shell | Remove when upstream owns Web assembly. These support the fork rather than product behavior. |
| Custom theme infrastructure | `ui-theme/README.md` documents `ctx.theme` registration. Port the colorblind theme definition; verify selection persistence separately. |

Upstream browser shortcut rules differ from the fork's. Linux Web restricts bindings and leaves several commands unbound by default. Infrastructure coverage does not establish keyboard parity.

### Remaining differences

| Behavior | Finding in the target | Treatment to verify |
| --- | --- | --- |
| Independent file/session suggestions | `ui-reference/src/client/index.ts` still joins lookups with `Promise.all`; the fork separates sources and debounces session lookup by 150 ms. | First candidate for a focused performance fix. Reproduce slow session lookup while preserving retained-session, cancellation, and reference-codec semantics. |
| Preserve focus on session navigation | `ui-conversation/README.md` retains desktop autofocus on mount/session switching. | Product interaction preference; adapt only the required change to the current editor. |
| Open next session after archive | `ui-workspace/README.md` says archiving the main session clears selection. | Product navigation extension if retained. |
| Workspace-specific model defaults | `packages/core/agent-default-model/README.md` documents a process-wide default; selection also persists per session. | Define workspace precedence and migration before porting. |
| Completion and permission sounds | No equivalent browser sound implementation found in the inspected client tree. | Candidate standalone extension; validate current event semantics. |
| Arrow/PageUp/PageDown history navigation without transcript focus | No equivalent to the fork's `ui-conversation/client/chat/history-keyboard.ts` handler found. | Preserve editable controls and current scroll ownership if retained. |
| Local action palette and fuzzy workspace switching | Slash-command popups and the shortcut reference are different surfaces. | Evaluate as a product feature without replacing upstream command/shortcut infrastructure. |

### Partial equivalents and product choices

- **Timeline:** upstream supports branching at completed turns. The fork's `ui-timeline/timeline.ts` also restores a selected prompt into a child draft, quiesces the source, and archives it. Ordinary branching does not replace that transaction.
- **Workspace review:** upstream `packages/deliverables/workspace-changes/` supplies per-turn changes and comparisons, not demonstrated parity with the fork's whole-workspace changes view.
- **Presentation and presets:** branding, hiding `standard`, compact controls, sidebar layout, version labels, and the colorblind palette are product choices, not upstream defects. Academic presets and scholarly-integrity requirements remain IPaper-owned.
- **Static branding:** title, favicon, and manifest customization need verification before retiring asset copying. Sidebar slots alone do not cover them.

## Migration requirements

The migration requires a clean upstream `0.2.2-rc.1` Web profile with a verified effective roster, followed by compatible IPaper host/preset contracts and browser contributions. Remove dependencies only after migrating their consumers.

Replace the copied roster, startup, and shell with the upstream layer and a small product patch. Reproduce candidate gaps on upstream before carrying fixes forward; regression coverage must express the required behavior rather than mirror the old implementation.

Update both READMEs, installation scripts, package checks, composition tests, and root `AGENTS.md` together. The current instructions requiring the exact fork dependency remain applicable until that implementation change.

### Patch retirement

On each upstream upgrade, run every retained patch's reproducer against unpatched upstream. Remove a patch when the requirement passes there, retaining useful behavior-level regression coverage. A partial equivalent requires an explicit decision about the remaining behavior rather than automatic deletion.

### Completion criteria

- A clean packaged profile starts upstream Web plus IPaper in the documented order, without `@isomoes/dsh-web-ui` or copied shared Web source/assets.
- Upstream supplies the standard browser roster and startup; IPaper contributes product plugins and justified overrides.
- Academic preset selection, system trust/read-only behavior, user-root behavior, paper-project services/views, and citation-integrity requirements work.
- Product title, manifest, favicon, and branding work through the selected extension mechanism; API endpoints and browser module identities resolve in a clean packaged installation.
- Every retained fix has a demonstrated gap, regression coverage, and removal condition. Product preferences and partial equivalents have explicit decisions.
- Browser verification covers navigation/focus, reference latency and cancellation, platform shortcuts, and retained timeline/archive transactions.
- `pnpm typecheck`, `pnpm test`, and `pnpm pack:check` pass; startup and browser checks use the built package rather than only linked dependencies.
- Documentation reflects the completed implementation and records actual verification results; completed migration tasks no longer appear as future requirements.

## Alternatives and trade-offs

**Continue the shared Web fork.** This minimizes initial migration effort and preserves current behavior, but retains source-refresh maintenance and prevents direct adoption of upstream Web improvements.

**Port every customization unchanged.** This preserves superficial parity while duplicating upstream shortcuts, assembly, and evolved behavior. Comparing requirements before retaining implementations reduces that duplication.

**Use configuration patches for every change.** Configuration handles composition, not arbitrary internal behavior. Focused plugins and justified package patches remain necessary where extension points are insufficient.

DSH preset, session, editor, and UI contracts changed since the fork baseline; version replacement alone is insufficient. Upstream adoption may change keyboard defaults and presentation even where functionality exists. Replacement rows can hide upstream additions, and source patches can fail on upgrades, so browser verification and explicit patch scope remain necessary.

One distributable bundle does not guarantee one-command installation. Profile provisioning, separate extension dependencies, and shared runtime identity need verification; duplicate runtime packages can split service/module identity in linked development.

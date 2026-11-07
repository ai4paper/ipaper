# AGENTS.md

IPaper is an academic paper-writing product bundle for DeepSeek Harness (DSH). The publishable package is `packages/dsh-ipaper` (`@ai4paper/dsh-ipaper`). Read its [README](packages/dsh-ipaper/README.md) before changing package composition and [Paper Project Graph architecture](docs/arch.md) before changing the scholarly process model; follow [docs/AGENTS.md](docs/AGENTS.md) for documentation.

## Product and runtime ownership

IPaper owns academic presets, product host adapters, and branding. Compose the exact supported DSH `0.2.2-rc.1` layers in order: `@deepseek-ai/dsh-base`, `@deepseek-ai/dsh-web-app`, then `@ai4paper/dsh-ipaper`. Upstream Web owns startup, transport, the shell, and the standard browser roster. Keep APaper a separate profile-root extension. Migration rationale and verification belong in [Upstream Web migration](docs/upstream-web-migration.md).

**Application launch.** Use the profile-local DSH CLI and the documented profile dependency policy to preserve shared runtime identities. The shared Web shell requires DSH-injected `window.__DSH_BOOT__`; it is not a standalone Vite application.

## Repository layout

```text
packages/dsh-ipaper/       Publishable product bundle
  src/                    TypeScript host plugins and adapters
  client/                 Product-owned browser plugins
  preset/ipaper/          Academic-writing preset and agent composition
  cordis.patch.yml        Host/browser plugin roster and configuration
  web-brand/              Manifest and favicon inputs
  tests/                  Integration and package-artifact tests
  scripts/                Package build helpers
  lib/                    Generated output; never edit directly
scripts/                  Workspace development, validation, and packing
docs/                     Architecture and development documentation
```

### Run relevant checks locally

- Use the narrowest relevant check while iterating. For shipped-artifact or package-composition changes, run `pnpm typecheck`, `pnpm test`, and `pnpm pack:check`.
- Add or update tests for behavior changes. Match verification to the affected behavior: host/browser types, preset installation and selection, read-only/system trust, service resolution, Typert registration, and browser ordering.
- Verify package exports, shipped files, title/manifest/favicon/branding, and absence of dangling source-map references when changing artifacts. Report only checks actually run.
- Product-brand HMR requires the watcher started by `pnpm dev`. Shared shell or dependency changes require rebuilding IPaper, restarting DSH, and refreshing the existing browser page.

## Conventions

- **Source, not generated output.** Edit source, presets, composition, tests, and branding inputs; never edit `lib/` directly.
- **Reuse upstream Web.** Do not copy its shell, assets, or shared UI source here. Use upstream public extension contracts and keep locally owned browser behavior and assets product-specific.
- **Explicit composition.** Preserve Cordis row ordering and dependencies. A patch replaces a row's whole `config`; restate every owned key. Place host rows before dependent browser rows, with unique IDs and explicit `inject` ordering.
- **Separate extensions.** Keep extensions as profile-root packages rather than adding private editor, citation, or reference APIs to the core product.
- **Product wording, neutral services.** Keep IPaper-specific wording in prompts, presets, metadata, CLI text, and branding; preserve established product-neutral host/service identities.
- **ESM and strict TypeScript.** Use two-space indentation, single quotes, and no semicolons. Use `import type` for type-only imports and explicit return types for exported functions.
- **Public types.** Use public interfaces for configuration/service values; respect `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`, and unused-code checks.
- **Focused plugins.** Keep plugins small and declarative; expose pure helpers when logic needs direct testing.
- **Behavior tests.** Use `node:test` and `node:assert/strict` in `*.test.mjs` files.
- **Durable decisions.** Record substantial architecture and migration rationale in topic-named documents under `docs/`, following [the documentation standard](docs/AGENTS.md). Update the existing owner when possible; mechanical/local edits do not require a new document.

## Type safety and documentation

Comments and documentation state behavior, ownership, failure conditions, and safe-use requirements rather than narrating implementation. Keep package contracts with their owners and link decision rationale instead of repeating it.

Update affected documentation with code changes. Behavior or installation changes update both the root README and publishable package README when applicable. Document placement, Markdown-only authoring, current-state prose, and review rules live in [docs/AGENTS.md](docs/AGENTS.md).

## Editing these instructions

Keep root instructions short, self-contained, and repository-wide; link detailed owners. Subtree instructions add only subtree-specific rules. Preserve actual package constraints and commands when adapting upstream conventions; proposals do not describe shipped behavior.

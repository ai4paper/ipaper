# AGENTS.md

## Scope

These instructions apply to the entire repository.

IPaper is an academic paper-writing product bundle for DeepSeek Harness (DSH). The publishable package is `packages/dsh-ipaper` (`@isomoes/dsh-ipaper`). It owns the product preset, DSH composition, host adapters, and IPaper branding while consuming the exact external browser dependency `@isomoes/dsh-web-ui`.

## Repository map

- `packages/dsh-ipaper/src/`: TypeScript host plugins and adapters.
- `packages/dsh-ipaper/client/ui-brand-ipaper/`: the locally owned browser branding client.
- `packages/dsh-ipaper/preset/ipaper/`: the academic-writing preset and agent composition.
- `packages/dsh-ipaper/cordis.patch.yml`: the DSH host/browser plugin roster and configuration.
- `packages/dsh-ipaper/web-brand/`: locally owned manifest and favicon inputs.
- `packages/dsh-ipaper/tests/`: Node test-runner integration and package-artifact tests.
- `packages/dsh-ipaper/scripts/`: package build helpers.
- `scripts/`: workspace development, validation, and packing helpers.
- `packages/dsh-ipaper/lib/`: generated build output; do not edit it directly.

## Toolchain and commands

Use Node `^22.19.0 || >=24.0.0` and pnpm 11.7.0.

From the repository root:

```sh
pnpm install --frozen-lockfile
pnpm typecheck
pnpm build
pnpm test
pnpm pack:check
```

Useful development commands:

```sh
pnpm dev          # install the ipaper-dev profile and run brand watcher + DSH
pnpm dev:config   # print the effective installed composition
pnpm dev:remove   # remove both profile dependencies
```

Run the narrowest relevant check while iterating, then run `pnpm typecheck`, `pnpm test`, and `pnpm pack:check` for changes that affect shipped artifacts or package composition. Tests build the package first.

## Change guidelines

- Edit source files, presets, composition, tests, or branding inputs—not generated `lib/` files.
- Keep `@isomoes/dsh-web-ui` pinned to the exact supported version. It must remain a direct profile dependency and must not be added to `dsh.profile.bundles`.
- Do not copy or fork shared Web UI source into this repository. IPaper should bundle only its branding client and consume the shared shell through the dependency's public `./web/*` export.
- The shared Web shell depends on DSH-injected `window.__DSH_BOOT__`; do not treat it as a standalone Vite application.
- Keep product-specific wording in prompts, preset content, metadata, CLI text, and branding. Host and service identities should remain product-neutral where established.
- Preserve the Cordis row ordering and dependency relationships in `cordis.patch.yml`. A patch replaces a row's complete `config`, so restate every owned key when overriding one.
- Add host rows before browser rows that depend on them. Use unique row/plugin IDs and explicit `inject` ordering.
- Keep extensions as separate profile-root packages rather than adding private editor, citation, or reference APIs to the core product.
- Preserve scholarly integrity requirements: never weaken the preset's prohibition on fabricated citations, quotations, bibliographic metadata, data, or results.
- If behavior or installation changes, update both the root README and the publishable package README when applicable.

## Code style

- The codebase uses ESM and strict TypeScript.
- Follow existing formatting: two-space indentation, single quotes, and no semicolons.
- Prefer explicit return types for exported functions and public interfaces for configuration/service values.
- Use `import type` for type-only imports.
- Respect `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`, and unused-code checks.
- Keep plugins small and declarative; expose focused pure helpers when logic needs direct testing.
- Tests use `node:test` and `node:assert/strict` in `*.test.mjs` files.

## Validation expectations

Add or update tests for behavior changes. Depending on the affected area, verify:

- TypeScript host and browser client typechecking.
- Preset installation, visibility, default selection, and read-only/system-trust behavior.
- Cordis package resolution, Typert registration, service availability, and browser slot ordering.
- Shipped package exports and file contents.
- IPaper-owned title, manifest, favicon, and branding.
- Absence of dangling source-map references in published JavaScript and declarations.

For product-brand client changes, HMR works only while the watcher started by `pnpm dev` is running. Shared shell or dependency changes require rebuilding IPaper, restarting DSH, and refreshing the existing browser page.

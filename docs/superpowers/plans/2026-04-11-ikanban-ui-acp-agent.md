# iKanban-Derived ACP Agent UI Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rework the `ipaper` web agent frontend so it satisfies the current single-agent ACP workflow by directly reusing the interaction model and visual structure already proven in `/home/isomoes/code/js/ikanban/packages/web`, without inventing a new UI redesign.

**Architecture:** Keep the existing ACP backend, browser session flow, and SolidStart routes. Limit the frontend work to reshaping the current `src/components/agent/*` experience so it behaves like a simplified `ikanban` session surface: one active agent, one transcript, one composer dock, visible plan/tool progress, and lightweight session configuration for mode/model/cwd. Treat `ikanban` as the source of truth for layout rhythm, prompt controls, settings patterns, and state flow, but copy only the parts needed for the single-agent ACP product instead of porting its entire multi-project shell.

**Tech Stack:** SolidStart, SolidJS, Tailwind utilities, existing `src/components/ui/*` primitives, current ACP HTTP/SSE routes, Vitest for targeted state tests.

---

## Current Repo Facts

- `ipaper` already has working ACP session routes: `src/routes/api/agent/session.ts`, `prompt.ts`, `cancel.ts`, `mode.ts`, and `model.ts`.
- The browser already streams normalized events through `useAgentSession()` and renders transcript, plan, and tool-call data.
- The current frontend is functional but visually custom and more "hero page + floating dock" than the denser workstation UI already present in `ikanban`.
- `/home/isomoes/code/js/ikanban/packages/web` already contains the interaction patterns we want to reuse:
- `src/components/prompt-input.tsx` for bottom-dock composer, agent/model selectors, and compact controls.
- `src/components/dialog-settings.tsx`, `settings-providers.tsx`, and `settings-models.tsx` for settings-page density and row/list treatment.
- `src/components/dialog-select-mcp.tsx` for simple searchable toggle lists.
- `src/context/local.tsx` and related session command wiring for single-current-agent and model selection behavior.
- In `ikanban`, `SettingsAgents` and `SettingsMcp` are placeholders, so this plan should not depend on them as implementation sources.
- The single-agent ACP requirement means we do not need `ikanban`'s multi-project sidebar, workspace tree, or agent-cycling UI; we only need one fixed active agent session.

## Requirements This Plan Must Preserve

- No visual redesign from scratch.
- Reuse `ikanban` UI patterns directly where they fit.
- Keep scope to one ACP agent session at a time.
- Keep existing backend contracts unless a frontend blocker requires a small, explicit API extension.
- Preserve mobile usability and desktop density.
- Avoid importing the whole `ikanban` package as a runtime dependency; copy/adapt proven patterns into `ipaper`'s existing component set.

## Reference Mapping From `ikanban`

Use these files as implementation references during execution:

- `/home/isomoes/code/js/ikanban/packages/web/src/components/prompt-input.tsx`
  Reference for the bottom tray structure, compact selects, status chips, and control grouping.
- `/home/isomoes/code/js/ikanban/packages/web/src/components/dialog-settings.tsx`
  Reference for the settings shell and vertical tab layout.
- `/home/isomoes/code/js/ikanban/packages/web/src/components/settings-providers.tsx`
  Reference for dense section headers, connected-item rows, and action placement.
- `/home/isomoes/code/js/ikanban/packages/web/src/components/settings-models.tsx`
  Reference for searchable grouped lists and compact switch rows.
- `/home/isomoes/code/js/ikanban/packages/web/src/components/dialog-select-mcp.tsx`
  Reference for lightweight searchable toggle dialogs.
- `/home/isomoes/code/js/ikanban/packages/web/src/context/local.tsx`
  Reference for separating current agent/model state from the rest of the page state.

## File Structure

### Files to Modify

- `src/routes/index.tsx`
  Remove the remaining marketing-shell framing so the page behaves like an app surface.
- `src/components/agent/AgentApp.tsx`
  Convert the top-level composition into an `ikanban`-style session shell with a denser transcript area and a persistent bottom composer region.
- `src/components/agent/MessageList.tsx`
  Rework transcript rendering so assistant/user messages stay primary and tool activity reads like structured session output, not marketing cards.
- `src/components/agent/ActivityPanel.tsx`
  Restyle and tighten the secondary plan/tool status rail to match the target workstation feel.
- `src/components/agent/PromptComposer.tsx`
  Replace the current floating card with a direct `ikanban`-inspired dock/composer layout.
- `src/components/agent/useAgentSession.ts`
  Tighten UI state handling for auto-start, ready/prompting transitions, config controls, and any extra derived state the new shell needs.
- `src/components/agent/types.ts`
  Adjust browser view types only if the revised UI needs clearer grouping or derived metadata.
- `src/app.tsx`
  Keep global app metadata and shell framing aligned with the app-style session surface.

### Files to Create

- `src/components/agent/agent-layout.ts`
  Small pure helpers for transcript ordering, plan counts, status labels, and any dense UI formatting shared across agent components.
- `src/components/agent/agent-layout.test.ts`
  Unit coverage for the layout helper logic.
- `src/components/agent/AgentSettingsDialog.tsx`
  Minimal settings shell for single-agent configuration, borrowing the `ikanban` settings structure but scoped to this product.
- `src/components/agent/AgentQuickSwitchDialog.tsx`
  Optional compact dialog for choosing mode/model when the dock needs a searchable picker instead of large native selects.

### Optional Small Backend Touches

- `src/routes/api/agent/session.ts`
  Only if needed to return a slightly richer initial config payload for the revised UI.
- `src/lib/acp/types.ts`
  Only if the frontend needs one new normalized event or a clearer status enum.

## Non-Goals

- No multi-agent UI.
- No workspace sidebar, project tree, or kanban board port from `ikanban`.
- No provider/MCP management surface unless it is required for the single-agent ACP workflow in this repo.
- No backend rewrite.
- No full design-system migration to `ikanban-ui`.

## Design Decisions

1. Treat the current `ipaper` ACP backend as stable and move most work into presentation and browser-state cleanup.
2. Reuse `ikanban` interaction density, spacing, and control grouping, but render through `ipaper`'s existing UI primitives unless a missing primitive forces a small local component.
3. Keep one active session and one active agent; remove any UI suggestions that imply agent switching.
4. Keep transcript-first hierarchy: conversation in the main pane, plan/tools in a smaller secondary pane, composer fixed at the bottom.
5. Prefer compact dialogs or popovers over large dedicated settings pages when the single-agent flow only needs a small set of controls.

## Chunk 1: Align The Shell With The Existing Product

### Task 1: Replace the landing-page framing with an app shell

**Files:**
- Modify: `src/routes/index.tsx`
- Modify: `src/app.tsx`

- [ ] Remove any remaining page-marketing wrapper styles that make the agent look like a showcase page instead of an application.
- [ ] Keep the accessible skip link and page title.
- [ ] Make the root layout height-driven so the transcript and dock can share the viewport cleanly.
- [ ] Ensure the main content width and padding match a dense desktop app rather than a centered marketing card.
- [ ] Run: `bun test`
- [ ] Expected: no route or app-shell regressions.

### Task 2: Define shared layout helpers before touching UI markup

**Files:**
- Create: `src/components/agent/agent-layout.ts`
- Test: `src/components/agent/agent-layout.test.ts`

- [ ] Extract pure helpers for transcript timeline ordering, plan completion counts, and any status badge labeling currently duplicated in components.
- [ ] Keep helpers UI-agnostic so component changes remain mostly markup-only.
- [ ] Add tests for timeline ordering when message and tool timestamps interleave.
- [ ] Add tests for plan summary counts and empty-state helpers.
- [ ] Run: `bun test src/components/agent/agent-layout.test.ts`
- [ ] Expected: the layout logic is stable before the UI is restructured.

### Task 3: Reshape `AgentApp` into an `ikanban`-style session shell

**Files:**
- Modify: `src/components/agent/AgentApp.tsx`
- Modify: `src/components/agent/types.ts`

- [ ] Remove the current hero-style header copy and summary cards.
- [ ] Build a session shell with these regions:
- [ ] a compact top status strip for current cwd, session status, mode, and model
- [ ] a main content grid with transcript first and activity rail second
- [ ] a persistent bottom composer region
- [ ] Keep the desktop split view, but collapse to a single-column stack on small screens.
- [ ] Ensure the shell consumes derived helper data instead of recomputing counts inline.
- [ ] Run: `bun test`
- [ ] Expected: page structure is app-like and still fully powered by the existing session hook.

## Chunk 2: Make The Transcript Match The Target Interaction Pattern

### Task 4: Refactor the transcript into a dense session feed

**Files:**
- Modify: `src/components/agent/MessageList.tsx`
- Modify: `src/components/agent/agent-layout.ts`

- [ ] Rework the header so it reads like a session transcript header, not a dashboard card block.
- [ ] Keep user/assistant messages visually distinct, but tone them down to match `ikanban`'s compact session styling.
- [ ] Render tool-call events as structured inline activity rows/cards that support long content without dominating the page.
- [ ] Add a stable empty state that explains the single-agent workflow in one short sentence.
- [ ] Ensure long assistant messages, code blocks, and tool output wrap or scroll cleanly inside the transcript pane.
- [ ] Preserve the inline error block, but restyle it to fit the same panel language.
- [ ] Run: `bun test`
- [ ] Expected: transcript becomes the primary work surface and remains readable for long ACP sessions.

### Task 5: Tighten the side activity panel around plan + tool progress

**Files:**
- Modify: `src/components/agent/ActivityPanel.tsx`
- Modify: `src/components/agent/types.ts`

- [ ] Reduce decorative styling and match the denser side-rail rhythm from `ikanban` panels.
- [ ] Separate plan progress from tool-call history with short section headers.
- [ ] Show useful compact metadata only: status, updated time if available, and concise labels.
- [ ] Keep the panel useful when empty by showing waiting-state copy instead of dead chrome.
- [ ] On mobile, place this panel below the transcript without making the composer jump.
- [ ] Run: `bun test`
- [ ] Expected: the secondary rail supports the transcript instead of competing with it.

## Chunk 3: Port The Composer And Configuration Flow

### Task 6: Rebuild the bottom composer using `ikanban` prompt-input patterns

**Files:**
- Modify: `src/components/agent/PromptComposer.tsx`

- [ ] Replace the large floating card treatment with a flatter bottom dock/tray modeled on `packages/web/src/components/prompt-input.tsx`.
- [ ] Keep the composer focused on the single-agent ACP workflow: prompt input, send, cancel, cwd, mode, and model.
- [ ] Remove the fake attachment affordance unless it is implemented; do not keep dead controls.
- [ ] Group controls like `ikanban`: status indicator, compact selectors, prompt input, primary send/cancel actions.
- [ ] Ensure keyboard submission behavior remains clear and mobile spacing still works.
- [ ] Make the prompt area resilient to long text without covering transcript content.
- [ ] Run: `bun test`
- [ ] Expected: the composer feels like a direct simplification of `ikanban`, not a new custom dock.

### Task 7: Decide whether mode/model stay as inline selects or move to quick-pick dialogs

**Files:**
- Create: `src/components/agent/AgentQuickSwitchDialog.tsx`
- Modify: `src/components/agent/PromptComposer.tsx`
- Modify: `src/components/agent/useAgentSession.ts`

- [ ] Start by checking whether the current mode/model lists are short enough for inline selects.
- [ ] If they are short, keep inline controls and skip dialog wiring.
- [ ] If they are long or need descriptions, create a minimal searchable dialog using `dialog-select-mcp.tsx` as the reference pattern.
- [ ] Keep the decision explicit in the implementation comments or plan notes.
- [ ] Do not implement both patterns unless there is a clear product need.
- [ ] Run: `bun test`
- [ ] Expected: selector UX stays compact and does not force a redesign.

### Task 8: Add a minimal settings dialog only if the dock gets crowded

**Files:**
- Create: `src/components/agent/AgentSettingsDialog.tsx`
- Modify: `src/components/agent/AgentApp.tsx`
- Modify: `src/components/agent/PromptComposer.tsx`

- [ ] Mirror `ikanban`'s settings shell structure at a smaller scope.
- [ ] Include only single-agent controls that are genuinely needed outside the dock.
- [ ] Recommended contents: cwd/session controls, current mode, current model, and a short connection/status section.
- [ ] Do not add placeholder tabs for MCP, providers, or agents unless backed by real `ipaper` functionality.
- [ ] Skip this task entirely if the dock comfortably holds the needed controls.
- [ ] Run: `bun test`
- [ ] Expected: configuration remains compact without copying `ikanban`'s entire settings surface.

## Chunk 4: Clean Up Session State To Support The Revised UI

### Task 9: Make `useAgentSession()` match the new single-agent shell

**Files:**
- Modify: `src/components/agent/useAgentSession.ts`
- Test: `src/components/agent/useAgentSession.test.ts`

- [ ] Audit `canSend`, `canConfigure`, `canStartSession`, and `canCloseSession` against the new UI so controls never advertise impossible actions.
- [ ] Decide whether the session should still require an explicit start or should lazy-start on first send while keeping the start action optional.
- [ ] Recommended: preserve lazy start on first send, keep explicit start available, and make the UI text reflect that clearly.
- [ ] Ensure event-stream disconnects leave the transcript intact and surface a recoverable error state.
- [ ] Ensure mode/model restore logic does not race with the revised UI during initial session creation.
- [ ] Add tests for session creation, prompt send, stream error handling, and config update transitions.
- [ ] Run: `bun test src/components/agent/useAgentSession.test.ts`
- [ ] Expected: browser state remains reliable after the UI shell changes.

### Task 10: Add only the smallest backend payload change if the new shell needs it

**Files:**
- Modify: `src/routes/api/agent/session.ts`
- Modify: `src/lib/acp/types.ts`
- Modify: related route tests if touched

- [ ] Verify the redesigned shell can render fully from the existing session payload.
- [ ] If not, add one minimal missing field rather than introducing a new endpoint.
- [ ] Keep the event union stable unless a real UI gap forces one additional normalized event.
- [ ] Update tests for any contract change immediately.
- [ ] Run: `bun test`
- [ ] Expected: backend changes, if any, stay additive and small.

## Chunk 5: Verification And Finish

### Task 11: Verify visual behavior against the actual target reference

**Files:**
- No new files required

- [ ] Run `bun run dev` in `ipaper`.
- [ ] Run `bun run dev` in `/home/isomoes/code/js/ikanban/packages/web` if needed for side-by-side comparison.
- [ ] Compare these specific behaviors, not vague visual taste:
- [ ] transcript density
- [ ] bottom composer grouping
- [ ] status/control placement
- [ ] side panel compactness
- [ ] mobile stack behavior
- [ ] Confirm the final `ipaper` result clearly looks derived from `ikanban` and not like a third design direction.

### Task 12: Run the full verification set

**Files:**
- No new files required

- [ ] Run: `bun test`
- [ ] Run: `bun run build`
- [ ] Manually verify one full flow: set cwd, start or lazy-create session, send prompt, stream assistant response, change mode/model, cancel a run, close session.
- [ ] Expected: ACP session flow still works end to end with the revised frontend.

## Implementation Notes For The Engineer

- Prefer adapting structure and spacing from `ikanban` over porting its exact CSS classes blindly.
- Preserve `ipaper`'s current component boundaries unless a file becomes too hard to read.
- Do not add fake multi-agent affordances just because `ikanban` supports agent cycling.
- If a copied pattern from `ikanban` depends on its context providers or `ikanban-ui` primitives, translate the behavior into `ipaper`'s local primitives instead of importing a large new dependency chain.
- If execution reveals a missing ACP capability for the frontend, fix the smallest backend contract needed and keep the rest of the plan unchanged.

## Suggested Commit Sequence

1. `refactor: reshape agent shell around transcript workflow`
2. `refactor: rebuild composer with ikanban-style controls`
3. `test: cover agent layout and session state updates`

Plan complete and saved to `docs/superpowers/plans/2026-04-11-ikanban-ui-acp-agent.md`. Ready to execute?

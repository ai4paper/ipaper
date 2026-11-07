# AGENTS.md — The documentation standard

This file defines document structure, Markdown tiers, writing rules, and review expectations for IPaper. It follows the [DSH documentation standard](https://github.com/deepseek-ai/deepseek-harness/blob/master/docs/AGENTS.md), adapted to this repository. Documentation uses `*.md` files; translations and YAML consistency sidecars are not required.

## Document structure

These rules apply to human-facing documentation, including architecture and migration references. A document's subject and tree position fix its scope: describe its subject at appropriate detail and direct children by purpose and responsibility; link to the owning descendant for lower-level detail.

Use descriptive, topic-based kebab-case filenames, such as `upstream-web-migration.md`. Do not use dated Agent Note filenames, lifecycle/class directories, `Agent Note:` titles, or mandatory `Status:` headers. State migration scope and whether the work is implemented in the introduction; keep current behavior distinct from the target design.

Classify each guide as a tutorial or reference. Tutorials follow an ordered path to an outcome and introduce only what each step needs. References define a lookup scope and current behavior without a teaching sequence. Separate substantial tutorial and reference content; label a section when either part is small.

Before writing a tutorial, establish the reader's prerequisites and order concepts by dependency and difficulty. Move unnecessary advanced material to a separate guide.

Author in this order: locate the document in the tree; set its permitted detail; choose tutorial or reference; order tutorial concepts; relocate descendant-owned detail; replace lower-level explanations with links to their owners.

## The tier taxonomy: one home per fact

Each fact has one home: the tier whose job it is. Elsewhere, link there. Add new document categories only when their content is needed.

| Tier | Job | Does NOT belong there |
| --- | --- | --- |
| Root `AGENTS.md` | Standing orders needed in every session, stated briefly and linked to their owner | Stories, worked examples, situational procedures, duplicated rules |
| Subtree `AGENTS.md` | Orders specific to that subtree | Repository-wide rules already carried at root |
| Architecture references | Package relationships, composition, ownership, and extension points | Per-package inventories, decision history, implementation-status annotations |
| Migration and design references | Target design, rationale, alternatives, compatibility evidence, and verification requirements | Claims that unbuilt behavior is already shipped; unrelated package contracts |
| Development guides | Contributor setup, daily workflow, and task-oriented procedures | Runtime decision rationale or copied script inventories |
| Root README | Product introduction, installation, and entry points | Internal implementation detail and contributor decision history |
| Package README | Package configuration, behavior, limitations, and extension contracts | Other packages' concerns, JSDoc restatement, copied source catalogs |

Placement: design rationale → the owning design or migration reference; procedures → development guides; package contracts → package READMEs; standing orders → root or subtree `AGENTS.md`; composition and ownership → architecture references.

## Writing rules

- **Document current state.** Product references and READMEs describe live behavior. A migration reference explicitly distinguishes current behavior, target design, and completion criteria. Distinguish observed evidence from unverified expectations.
- **Preserve durable rationale.** Record substantial design alternatives and trade-offs in their owning document. Mechanical/local edits do not need new documents. Search for an existing owner before adding one and repair links when consolidating or moving content.
- **One physical line per paragraph.** Use editor soft-wrap. Code blocks, tables, and list structure keep their formatting.
- **Examples match executable contracts.** Check commands against package scripts and code examples against the relevant API. Do not imply an example was compiled or run unless it was.
- **Update owners together.** Change affected README and API documentation with the implementation. Installation and product usage changes update both product READMEs when applicable.
- **Comments state complete contracts.** Preserve behavior, failure, timing, ownership, exceptions, and safe-use facts. Remove code restatement, reasoning transcripts, and unrelated explanations; link durable rationale.
- **Write directly.** Name concrete packages, types, commands, operations, and behavior. Avoid vague metaphors, inflated emphasis, and ambiguous claims of correctness.
- **Markdown only.** A single English Markdown document is sufficient. Do not add translation sidecars, generated catalogs, or upstream documentation tooling merely to imitate upstream's layout.

## Document size

Keep standing instructions brief and link details to their owner. This repository has no automated documentation word-budget gate. Review size by responsibility and readability rather than copying upstream's numeric ceilings.

When a document becomes difficult to navigate:

1. Relocate content that belongs in another tier and leave a link.
2. Condense repetition while retaining behavior and decision rationale.
3. Keep necessary detail when it genuinely belongs to the document's subject.

## The review checklist

- Duplicated rules or facts: keep one owner and link the rest.
- History in product references: retain only necessary context and link to the owning design or migration reference.
- Status annotations that drift: keep migration scope in its introduction and update it with implementation rather than scattering status labels across diagrams.
- Hand-copied command, package, or test inventories: link to authoritative source unless the document adds a necessary contract.
- Reasoning transcripts: retain the resulting decision and trade-off, not the investigation sequence.
- Paragraph walls: separate distinct obligations; use a table or list when it improves lookup.
- Emphasis inflation: reserve emphasis for meaningful constraints.
- Completed migration tasks presented as future requirements: describe shipped reality in present tense and retain consequences and actual verification evidence.

## Repository references and verification

Use relative Markdown links for local files. Pin external evidence to a release or commit when a conclusion depends on that version. Verify local targets, package names, paths, commands, and claims about implementation state.

Run a whitespace check for documentation edits and relevant code checks when behavior also changes. Documentation-only edits do not require rebuilding the package. Report only checks actually executed; upstream documentation gates are not installed here.

---
name: find-the-problem
description: Leads a provenance-first literature workflow to identify a defensible research question: search current work, map who addressed which question with which method, verify boundaries and gaps in original papers, and compare candidate directions by interest, novelty, and feasibility. Use when the author asks for a paper topic, title, research question, research gap, literature landscape, related-work direction, or what to work on next.
disable-model-invocation: false
user-invocable: true
---

# Find the Problem

Help the author choose a research question from verified boundaries in current literature. Do not invent ideas from model memory and then search only for confirmation. Build the map first; choose at its boundary.

The user can explicitly start this workflow with `/find-the-problem` followed by an optional narrow direction.

## Completion target

Produce and record a research-gap report containing:

1. roughly five most relevant papers with title, authors, venue/date, BibTeX or stable identity, and exact search provenance;
2. the question each paper addresses, its contribution, method/experiment, explicit limitations, and inferred boundaries;
3. a horizontal question × paper/person × method boundary map;
4. candidate gaps with original-paper locators, or a clear `pending` label when unverified;
5. one selected question, or one to two candidates, justified by interest, novelty, and feasibility.

Do not treat a broad topic, a paper title, and a research question as interchangeable. Choose the question first; propose a working title only after the question is selected.

## Workflow

### 1. Establish the starting direction

Read `ipaper_state` before adding duplicate work. Determine:

- a narrow direction or phenomenon;
- target community, venues, or arXiv category;
- available data, equipment, time, and skills;
- important constraints from the workspace or author.

Inspect available project files before asking. If the author has not supplied a direction or essential feasibility constraints, ask only for the missing author-owned choices. Prefer a narrow frame such as “Y problem for LLMs in X setting” over a whole field.

Record the direction and concrete research tasks in the Paper Project Graph.

### 2. Search live, with provenance

Use `apaper-mcp`; never present model-memory results as current literature.

Search complementary sources:

- arXiv: recent work, normally the last 12 months, with category/date filters;
- DBLP: target venues over roughly three years, retaining BibTeX;
- Google Scholar: cross-community and high-impact omission check;
- IACR or CNKI when the direction requires them.

For every retained source, record the provider, exact query, filters, and search date. Merge duplicates without losing provenance. Rank by relevance, explain each match in one sentence, and ask the author to confirm the shortlist when judgment is material. Aim for about five primary papers, not an unfiltered bibliography.

Record papers as `source` nodes with `sourceType: "paper"`, authors, publication date, venue, BibTeX/DOI/URL when available, `searchProvenance`, and `shortlisted`. Never mark bibliographic metadata verified without an actual verification basis.

### 3. Read PDFs and extract structured coverage

Download and inspect the shortlisted full texts. For each paper extract separately:

- research question or problem addressed;
- claimed contribution;
- method and experiment design;
- explicit limitations and future work;
- inferred boundaries such as dataset scale, scenario assumptions, excluded populations, missing baselines, or resource demands.

Record questions as `objective` nodes with `objectiveType: "question"`. Connect each paper to the question with `addresses`. Record contribution, method, limitation, and boundary claims with the matching `claimType`; connect each claim to its paper with `derived_from` and to its question with `addresses`. Set `inferenceType` to `explicit` or `inferred` truthfully.

Keep author statements separate from agent inference. A useful summary is not a substitute for these relations.

### 4. Verify the boundary

For every proposed gap, return to the original paper. Capture paper plus section/page and, when useful, the exact quotation as evidence. Evidence must derive from the inspected paper before it supports a claim.

Use these states:

- `pending`: locator or reverse search is incomplete;
- `verified`: the original text was checked and a reverse search found no satisfactory answer under the stated scope.

“Not mentioned in the text processed by the model” is not evidence that the paper did not do it. Search again for each important gap, including alternate terminology. Distinguish apparently unaddressed gaps from work that may be absent because it is impractical.

### 5. Compare and choose

For each candidate question, assess three gates independently:

- **interest** — who cares and why now;
- **novelty** — what evidence shows no satisfactory solution exists;
- **feasibility** — whether the author can produce evidence with available data, equipment, time, and skills.

Use `questionStage: "gap"` while evaluating and `questionStage: "selected"` only after the author chooses. Record gate levels and concise bases. Do not hide a weak gate behind a combined score.

If existing candidates fail, formulate a narrower new question from the mapped boundary and verify it with another live search. Do not force a selection.

## Interaction rules

- AI expands candidates; the author narrows and makes the final choice.
- Show useful intermediate results after search, shortlist, and gap verification rather than disappearing into one long run.
- Use subagents only for bounded parallel paper inspection, each tied to a concrete Paper Project task.
- Keep all scholarly conclusions traceable through `ipaper_record`; manuscript files remain author-owned.
- Never fabricate citations, quotations, bibliographic metadata, paper contents, data, experiments, or verification.

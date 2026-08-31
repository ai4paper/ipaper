import { z } from 'zod'
import { defineDomain, domainTable } from '@deepseek-ai/dsh-storage-domain'
import {
  PAPER_EDGE_KINDS,
  PAPER_NODE_KINDS,
  PAPER_NODE_STATUSES,
} from './types.js'
import type {
  MutablePaperNodeKind,
  PaperNodeKind,
} from './types.js'

const id = z.string().min(1)
const timestamp = z.string().datetime({ offset: true })
const optionalNonempty = z.string().min(1).optional()

export const projectAttributesSchema = z.object({
  workspacePath: z.string().min(1),
}).strict()

const gateLevel = z.enum(['unknown', 'low', 'medium', 'high'])

export const objectiveAttributesSchema = z.object({
  objectiveType: z.enum(['question', 'hypothesis', 'contribution', 'scope', 'other']).optional(),
  questionStage: z.enum(['candidate', 'covered', 'gap', 'selected']).optional(),
  verificationStatus: z.enum(['pending', 'verified']).optional(),
  interest: gateLevel.optional(),
  novelty: gateLevel.optional(),
  feasibility: gateLevel.optional(),
  interestBasis: optionalNonempty,
  noveltyBasis: optionalNonempty,
  feasibilityBasis: optionalNonempty,
}).strict()

export const requirementAttributesSchema = z.object({
  requirementType: z.enum(['venue', 'deadline', 'formatting', 'ethics', 'authorship', 'submission', 'other']).optional(),
  dueAt: timestamp.optional(),
}).strict()

export const taskAttributesSchema = z.object({
  taskType: z.enum(['research', 'analysis', 'writing', 'revision', 'review', 'other']).optional(),
}).strict()

export const sourceAttributesSchema = z.object({
  citationKey: optionalNonempty,
  doi: z.string().regex(/^10\.\d{4,9}\/\S+$/i, 'invalid DOI').optional(),
  url: z.url().optional(),
  sourceType: z.enum(['paper', 'dataset', 'web', 'book', 'other']).optional(),
  authors: z.array(z.string().min(1)).optional(),
  publicationDate: optionalNonempty,
  venue: optionalNonempty,
  bibtex: optionalNonempty,
  searchProvenance: z.array(z.object({
    provider: z.enum(['arxiv', 'dblp', 'google-scholar', 'iacr', 'cnki', 'other']),
    query: z.string().min(1),
    filters: optionalNonempty,
    searchedAt: timestamp,
  }).strict()).optional(),
  shortlisted: z.boolean().optional(),
  bibliographicMetadataVerified: z.boolean(),
  verification: z.object({
    method: z.enum(['doi', 'url', 'manual']),
    verifiedAt: timestamp,
    basis: z.string().min(1),
  }).strict().optional(),
}).strict()

export const evidenceAttributesSchema = z.object({
  evidenceType: z.enum(['quotation', 'paraphrase', 'observation', 'measurement', 'result', 'synthesis', 'other']),
  locator: optionalNonempty,
  confidence: z.number().min(0).max(1).optional(),
  verbatim: z.boolean(),
}).strict().superRefine((attributes, context) => {
  if (attributes.verbatim && attributes.locator === undefined) {
    context.addIssue({
      code: 'custom',
      path: ['locator'],
      message: 'verbatim evidence requires an exact locator',
    })
  }
})

export const claimAttributesSchema = z.object({
  claimType: z.enum(['statement', 'hypothesis', 'result', 'conclusion', 'contribution', 'method', 'limitation', 'boundary', 'research-gap', 'other']).optional(),
  inferenceType: z.enum(['explicit', 'inferred']).optional(),
  verificationStatus: z.enum(['pending', 'verified']).optional(),
}).strict()

export const artifactAttributesSchema = z.object({
  artifactType: z.enum(['outline', 'section', 'manuscript', 'figure', 'table', 'dataset', 'bibliography', 'supplement', 'pdf', 'submission-package', 'other']),
  path: optionalNonempty,
  mimeType: optionalNonempty,
  checksum: optionalNonempty,
  versionLabel: optionalNonempty,
  pathStatus: z.enum(['exists', 'missing']).optional(),
  pathCheckedAt: timestamp.optional(),
}).strict().superRefine((attributes, context) => {
  if ((attributes.pathStatus === undefined) !== (attributes.pathCheckedAt === undefined)) {
    context.addIssue({ code: 'custom', message: 'pathStatus and pathCheckedAt must be recorded together' })
  }
})

export const reviewAttributesSchema = z.object({
  severity: z.enum(['info', 'minor', 'major', 'blocking']).optional(),
}).strict()

export const decisionAttributesSchema = z.object({
  rationale: z.string().min(1),
}).strict()

export const noteAttributesSchema = z.object({
  noteType: z.enum(['research', 'writing', 'review', 'coordination', 'other']).optional(),
}).strict()

export const eventAttributesSchema = z.object({
  operationSummary: z.string().min(1),
  callerSessionId: id,
  callerOrigin: z.enum(['root', 'subagent', 'host']),
  committedAt: timestamp,
  createdNodeIds: z.array(id),
  updatedNodes: z.array(z.object({
    id,
    beforeVersion: z.number().int().positive(),
    afterVersion: z.number().int().positive(),
  }).strict()),
  createdEdgeIds: z.array(id),
  committedRevision: z.number().int().nonnegative(),
}).strict()

export const paperNodeAttributesSchemas = {
  objective: objectiveAttributesSchema,
  requirement: requirementAttributesSchema,
  task: taskAttributesSchema,
  source: sourceAttributesSchema,
  evidence: evidenceAttributesSchema,
  claim: claimAttributesSchema,
  artifact: artifactAttributesSchema,
  review: reviewAttributesSchema,
  decision: decisionAttributesSchema,
  note: noteAttributesSchema,
} as const satisfies Readonly<Record<MutablePaperNodeKind, z.ZodType>>

function nodeSchema<K extends PaperNodeKind, A extends z.ZodType>(
  kind: K,
  attributes: A,
) {
  return z.object({
    id,
    projectId: id,
    kind: z.literal(kind),
    title: z.string().min(1),
    summary: z.string(),
    status: z.enum(PAPER_NODE_STATUSES[kind]),
    attributes,
    version: z.number().int().positive(),
    createdBySessionId: id,
    updatedBySessionId: id,
    createdAt: timestamp,
    updatedAt: timestamp,
  }).strict()
}

export const paperNodeSchema = z.discriminatedUnion('kind', [
  nodeSchema('project', projectAttributesSchema),
  nodeSchema('objective', objectiveAttributesSchema),
  nodeSchema('requirement', requirementAttributesSchema),
  nodeSchema('task', taskAttributesSchema),
  nodeSchema('source', sourceAttributesSchema),
  nodeSchema('evidence', evidenceAttributesSchema),
  nodeSchema('claim', claimAttributesSchema),
  nodeSchema('artifact', artifactAttributesSchema),
  nodeSchema('review', reviewAttributesSchema),
  nodeSchema('decision', decisionAttributesSchema),
  nodeSchema('note', noteAttributesSchema),
  nodeSchema('event', eventAttributesSchema),
])

export const paperEdgeSchema = z.object({
  id,
  projectId: id,
  kind: z.enum(PAPER_EDGE_KINDS),
  sourceId: id,
  targetId: id,
  createdBySessionId: id,
  createdAt: timestamp,
}).strict()

const nextNodeSequenceSchema = z.object(Object.fromEntries(
  PAPER_NODE_KINDS.map(kind => [kind, z.number().int().positive()]),
) as Record<PaperNodeKind, z.ZodNumber>).strict()

export const paperProjectRecordSchema = z.object({
  projectId: id,
  workspaceId: id,
  workspacePath: z.string().min(1),
  rootNodeId: id,
  revision: z.number().int().nonnegative(),
  nextNodeSequenceByKind: nextNodeSequenceSchema,
  nextEdgeSequence: z.number().int().positive(),
  createdAt: timestamp,
  updatedAt: timestamp,
}).strict()

const pendingMutationSchema = z.object({
  mutationId: id,
  finalProject: paperProjectRecordSchema,
  nodes: z.array(paperNodeSchema),
  edges: z.array(paperEdgeSchema),
}).strict()

export const storedPaperProjectRecordSchema = paperProjectRecordSchema.extend({
  pendingMutation: pendingMutationSchema.optional(),
}).strict()

export type StoredPaperNode = z.infer<typeof paperNodeSchema>
export type StoredPaperEdge = z.infer<typeof paperEdgeSchema>
export type StoredPaperProjectRecord = z.infer<typeof storedPaperProjectRecordSchema>
export type PendingPaperMutation = z.infer<typeof pendingMutationSchema>

export const paperProjectDomainSpec = defineDomain({
  // DSH storage unit names permit underscores, not hyphens.
  name: 'ipaper_project',
  version: 1,
  tables: {
    projects: domainTable<string, StoredPaperProjectRecord>(storedPaperProjectRecordSchema),
    nodes: domainTable<string, StoredPaperNode>(paperNodeSchema),
    edges: domainTable<string, StoredPaperEdge>(paperEdgeSchema),
  },
})

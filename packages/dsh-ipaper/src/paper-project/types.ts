export const PAPER_NODE_KINDS = [
  'project',
  'objective',
  'requirement',
  'task',
  'source',
  'evidence',
  'claim',
  'artifact',
  'review',
  'decision',
  'note',
  'event',
] as const

export type PaperNodeKind = typeof PAPER_NODE_KINDS[number]
export type MutablePaperNodeKind = Exclude<PaperNodeKind, 'project' | 'event'>

export const PAPER_EDGE_KINDS = [
  'contains',
  'addresses',
  'depends_on',
  'produces',
  'derived_from',
  'supports',
  'contradicts',
  'cites',
  'reviews',
  'resolves',
  'supersedes',
  'affects',
] as const

export type PaperEdgeKind = typeof PAPER_EDGE_KINDS[number]

export const PAPER_NODE_STATUSES = {
  project: ['active', 'archived'],
  objective: ['proposed', 'accepted', 'resolved', 'retired'],
  requirement: ['open', 'satisfied', 'waived'],
  task: ['pending', 'active', 'blocked', 'done', 'cancelled'],
  source: ['discovered', 'inspected', 'verified', 'rejected'],
  evidence: ['unverified', 'verified', 'disputed'],
  claim: ['proposed', 'supported', 'contested', 'rejected'],
  artifact: ['planned', 'draft', 'review', 'ready', 'superseded'],
  review: ['open', 'resolved'],
  decision: ['proposed', 'accepted', 'reversed'],
  note: ['active', 'archived'],
  event: ['recorded'],
} as const satisfies Readonly<Record<PaperNodeKind, readonly string[]>>

export type PaperNodeStatus<K extends PaperNodeKind> = typeof PAPER_NODE_STATUSES[K][number]

export interface PaperNodeBase<K extends PaperNodeKind, A> {
  readonly id: string
  readonly projectId: string
  readonly kind: K
  readonly title: string
  readonly summary: string
  readonly status: PaperNodeStatus<K>
  readonly attributes: A
  readonly version: number
  readonly createdBySessionId: string
  readonly updatedBySessionId: string
  readonly createdAt: string
  readonly updatedAt: string
}

export interface ProjectAttributes {
  readonly workspacePath: string
}

export interface ObjectiveAttributes {
  readonly objectiveType?: 'question' | 'hypothesis' | 'contribution' | 'scope' | 'other'
  readonly questionStage?: 'candidate' | 'covered' | 'gap' | 'selected'
  readonly verificationStatus?: 'pending' | 'verified'
  readonly interest?: 'unknown' | 'low' | 'medium' | 'high'
  readonly novelty?: 'unknown' | 'low' | 'medium' | 'high'
  readonly feasibility?: 'unknown' | 'low' | 'medium' | 'high'
  readonly interestBasis?: string
  readonly noveltyBasis?: string
  readonly feasibilityBasis?: string
}

export interface RequirementAttributes {
  readonly requirementType?: 'venue' | 'deadline' | 'formatting' | 'ethics' | 'authorship' | 'submission' | 'other'
  readonly dueAt?: string
}

export interface TaskAttributes {
  readonly taskType?: 'research' | 'analysis' | 'writing' | 'revision' | 'review' | 'other'
}

export interface SourceSearchProvenance {
  readonly provider: 'arxiv' | 'dblp' | 'google-scholar' | 'iacr' | 'cnki' | 'other'
  readonly query: string
  readonly filters?: string
  readonly searchedAt: string
}

export interface SourceAttributes {
  readonly citationKey?: string
  readonly doi?: string
  readonly url?: string
  readonly sourceType?: 'paper' | 'dataset' | 'web' | 'book' | 'other'
  readonly authors?: readonly string[]
  readonly publicationDate?: string
  readonly venue?: string
  readonly bibtex?: string
  readonly searchProvenance?: readonly SourceSearchProvenance[]
  readonly shortlisted?: boolean
  readonly bibliographicMetadataVerified: boolean
  readonly verification?: {
    readonly method: 'doi' | 'url' | 'manual'
    readonly verifiedAt: string
    readonly basis: string
  }
}

export interface EvidenceAttributes {
  readonly evidenceType: 'quotation' | 'paraphrase' | 'observation' | 'measurement' | 'result' | 'synthesis' | 'other'
  readonly locator?: string
  readonly confidence?: number
  readonly verbatim: boolean
}

export interface ClaimAttributes {
  readonly claimType?: 'statement' | 'hypothesis' | 'result' | 'conclusion' | 'contribution' | 'method' | 'limitation' | 'boundary' | 'research-gap' | 'other'
  readonly inferenceType?: 'explicit' | 'inferred'
  readonly verificationStatus?: 'pending' | 'verified'
}

export interface ArtifactAttributes {
  readonly artifactType: 'outline' | 'section' | 'manuscript' | 'figure' | 'table' | 'dataset' | 'bibliography' | 'supplement' | 'pdf' | 'submission-package' | 'other'
  readonly path?: string
  readonly mimeType?: string
  readonly checksum?: string
  readonly versionLabel?: string
  readonly pathStatus?: 'exists' | 'missing'
  readonly pathCheckedAt?: string
}

export interface ReviewAttributes {
  readonly severity?: 'info' | 'minor' | 'major' | 'blocking'
}

export interface DecisionAttributes {
  readonly rationale: string
}

export interface NoteAttributes {
  readonly noteType?: 'research' | 'writing' | 'review' | 'coordination' | 'other'
}

export interface EventAttributes {
  readonly operationSummary: string
  readonly callerSessionId: string
  readonly callerOrigin: 'root' | 'subagent' | 'host'
  readonly committedAt: string
  readonly createdNodeIds: readonly string[]
  readonly updatedNodes: readonly {
    readonly id: string
    readonly beforeVersion: number
    readonly afterVersion: number
  }[]
  readonly createdEdgeIds: readonly string[]
  readonly committedRevision: number
}

export type PaperNode =
  | PaperNodeBase<'project', ProjectAttributes>
  | PaperNodeBase<'objective', ObjectiveAttributes>
  | PaperNodeBase<'requirement', RequirementAttributes>
  | PaperNodeBase<'task', TaskAttributes>
  | PaperNodeBase<'source', SourceAttributes>
  | PaperNodeBase<'evidence', EvidenceAttributes>
  | PaperNodeBase<'claim', ClaimAttributes>
  | PaperNodeBase<'artifact', ArtifactAttributes>
  | PaperNodeBase<'review', ReviewAttributes>
  | PaperNodeBase<'decision', DecisionAttributes>
  | PaperNodeBase<'note', NoteAttributes>
  | PaperNodeBase<'event', EventAttributes>

export interface PaperEdge {
  readonly id: string
  readonly projectId: string
  readonly kind: PaperEdgeKind
  readonly sourceId: string
  readonly targetId: string
  readonly createdBySessionId: string
  readonly createdAt: string
}

export interface PaperProjectRecord {
  readonly projectId: string
  readonly workspaceId: string
  readonly workspacePath: string
  readonly rootNodeId: string
  readonly revision: number
  readonly nextNodeSequenceByKind: Readonly<Record<PaperNodeKind, number>>
  readonly nextEdgeSequence: number
  readonly createdAt: string
  readonly updatedAt: string
}

export interface PaperProjectSnapshot {
  readonly projectId: string
  readonly workspaceId: string
  readonly revision: number
  readonly root: PaperNode
  readonly nodes: readonly PaperNode[]
  readonly edges: readonly PaperEdge[]
  readonly cursor?: string
}

export interface PaperNodeCreateInput {
  readonly ref: string
  readonly kind: MutablePaperNodeKind
  readonly title: string
  readonly summary?: string
  readonly status?: string
  readonly attributes?: unknown
}

export interface PaperNodeUpdateInput {
  readonly id: string
  readonly expectedVersion: number
  readonly title?: string
  readonly summary?: string
  readonly status?: string
  readonly attributesPatch?: unknown
}

export interface PaperEdgeCreateInput {
  readonly source: string
  readonly kind: PaperEdgeKind
  readonly target: string
}

export interface PaperMutationInput {
  readonly operationSummary: string
  readonly taskId?: string
  readonly nodes?: readonly PaperNodeCreateInput[]
  readonly updates?: readonly PaperNodeUpdateInput[]
  readonly edges?: readonly PaperEdgeCreateInput[]
}

export interface PaperMutationCaller {
  readonly sessionId: string
  readonly origin: 'root' | 'subagent' | 'host'
}

export interface PaperMutationResult {
  readonly projectId: string
  readonly revision: number
  readonly created: Readonly<Record<string, string>>
  readonly updated: readonly { readonly id: string; readonly version: number }[]
  readonly edgeIds: readonly string[]
  readonly eventId: string
}

export type PaperStateView = 'overview' | 'graph' | 'related' | 'history'

export interface PaperStateInput {
  readonly view?: PaperStateView
  readonly nodeId?: string
  readonly kinds?: readonly PaperNodeKind[]
  readonly statuses?: readonly string[]
  readonly query?: string
  readonly cursor?: string
  readonly limit?: number
}

export interface PaperLensState {
  readonly status: 'clear' | 'active' | 'needs-attention'
  readonly count: number
  readonly nodeIds: readonly string[]
}

export interface PaperProjectOverview {
  readonly view: 'overview'
  readonly projectId: string
  readonly workspaceId: string
  readonly revision: number
  readonly countsByKind: Readonly<Record<string, number>>
  readonly countsByStatus: Readonly<Record<string, number>>
  readonly activeTaskIds: readonly string[]
  readonly blockedTaskIds: readonly string[]
  readonly unsupportedClaimIds: readonly string[]
  readonly contestedClaimIds: readonly string[]
  readonly openReviewIds: readonly string[]
  readonly unverifiedSourceIds: readonly string[]
  readonly integrityGaps: readonly { readonly code: string; readonly nodeId: string; readonly message: string }[]
  readonly lenses: Readonly<Record<'framing' | 'research' | 'argument' | 'production' | 'validation', PaperLensState>>
}

export interface PaperGraphPage {
  readonly view: 'graph'
  readonly projectId: string
  readonly workspaceId: string
  readonly revision: number
  readonly nodes: readonly PaperNode[]
  readonly edges: readonly PaperEdge[]
  readonly cursor?: string
}

export interface PaperRelatedPage {
  readonly view: 'related'
  readonly projectId: string
  readonly workspaceId: string
  readonly revision: number
  readonly node: PaperNode
  readonly incoming: readonly PaperEdge[]
  readonly outgoing: readonly PaperEdge[]
  readonly neighbors: readonly PaperNode[]
  readonly cursor?: string
}

export interface PaperHistoryPage {
  readonly view: 'history'
  readonly projectId: string
  readonly workspaceId: string
  readonly revision: number
  readonly events: readonly PaperNodeBase<'event', EventAttributes>[]
  readonly affects: readonly PaperEdge[]
  readonly cursor?: string
}

export interface PaperQuestionCoverage {
  readonly paperId: string
  readonly title: string
  readonly authors: readonly string[]
  readonly venue?: string
  readonly methods: readonly string[]
  readonly contributions: readonly string[]
  readonly limitations: readonly string[]
}

export interface PaperQuestionMapItem {
  readonly questionId: string
  readonly title: string
  readonly summary: string
  readonly stage: 'candidate' | 'covered' | 'gap' | 'selected'
  readonly verificationStatus: 'pending' | 'verified'
  readonly interest: 'unknown' | 'low' | 'medium' | 'high'
  readonly novelty: 'unknown' | 'low' | 'medium' | 'high'
  readonly feasibility: 'unknown' | 'low' | 'medium' | 'high'
  readonly coverage: readonly PaperQuestionCoverage[]
}

export interface PaperProblemMap {
  readonly questions: readonly PaperQuestionMapItem[]
  readonly paperCount: number
  readonly shortlistedPaperCount: number
  readonly searchedProviders: readonly string[]
  readonly unlinkedPaperIds: readonly string[]
}

export type PaperStateResult = PaperProjectOverview | PaperGraphPage | PaperRelatedPage | PaperHistoryPage

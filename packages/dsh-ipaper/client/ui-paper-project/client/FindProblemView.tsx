import type { PaperProblemMap, PaperQuestionMapItem } from '../../../src/paper-project/types.js'

export interface FindProblemViewProps {
  readonly problemMap: PaperProblemMap
  readonly onStart: () => void
}

const GATE_LABELS = {
  interest: 'People care',
  novelty: 'Still open',
  feasibility: 'We can do it',
} as const

function Gate({ question, name }: { readonly question: PaperQuestionMapItem; readonly name: keyof typeof GATE_LABELS }) {
  const value = question[name]
  return <span className="ipaper-question-gate" data-level={value}>{GATE_LABELS[name]} · {value}</span>
}

function EmptyMap({ onStart }: { readonly onStart: () => void }) {
  return <section className="ipaper-question-empty">
    <p className="ipaper-view-kicker">Start with live literature</p>
    <h2>What has been solved, by whom, and how?</h2>
    <p>Ask IPaper to search current work, shortlist about five papers, read their PDFs, and record the questions, authors, methods, limitations, and exact evidence. The boundary map will form here.</p>
    <button type="button" className="ipaper-question-start" onClick={onStart}><span>Start guided workflow</span><code>/find-the-problem</code></button>
    <ol>
      <li><strong>Search</strong><span>arXiv + DBLP + Scholar, with dates and filters</span></li>
      <li><strong>Shortlist</strong><span>Human-select the most relevant papers</span></li>
      <li><strong>Map</strong><span>Connect each question to papers, people, and methods</span></li>
      <li><strong>Verify</strong><span>Check every claimed gap against the original text</span></li>
      <li><strong>Choose</strong><span>Pass interest, novelty, and feasibility</span></li>
    </ol>
  </section>
}

export function FindProblemView({ problemMap, onStart }: FindProblemViewProps) {
  if (problemMap.questions.length === 0) return <EmptyMap onStart={onStart} />
  const candidates = problemMap.questions.filter(question => question.stage === 'gap' || question.stage === 'candidate' || question.stage === 'selected')
  return <>
    <section className="ipaper-question-progress" aria-label="Question discovery progress">
      <article><strong>{problemMap.searchedProviders.length}</strong><span>live sources</span><small>{problemMap.searchedProviders.join(', ') || 'No search provenance'}</small></article>
      <article><strong>{problemMap.paperCount}</strong><span>papers found</span><small>{problemMap.shortlistedPaperCount} shortlisted</small></article>
      <article><strong>{problemMap.questions.length}</strong><span>questions mapped</span><small>{problemMap.unlinkedPaperIds.length} papers still unlinked</small></article>
      <article><strong>{candidates.length}</strong><span>directions open</span><small>{candidates.filter(question => question.verificationStatus === 'verified').length} verified</small></article>
    </section>

    <section className="ipaper-view-card ipaper-boundary-card">
      <div className="ipaper-view-section-head"><div><p className="ipaper-view-kicker">Boundary map</p><h2>Questions × people × methods</h2></div><span>{problemMap.questions.length} questions</span></div>
      <div className="ipaper-question-table-wrap"><table className="ipaper-question-table">
        <thead><tr><th>Question</th><th>Who / paper</th><th>How</th><th>Boundary</th></tr></thead>
        <tbody>{problemMap.questions.map(question => <tr key={question.questionId}>
          <td><strong>{question.title}</strong>{question.summary !== '' && <p>{question.summary}</p>}<span className="ipaper-view-chip">{question.stage}</span></td>
          <td>{question.coverage.length === 0 ? <em>No linked paper</em> : question.coverage.map(item => <div className="ipaper-coverage" key={item.paperId}><strong>{item.title}</strong><span>{item.authors.join(', ') || 'Authors not recorded'}{item.venue === undefined ? '' : ` · ${item.venue}`}</span></div>)}</td>
          <td>{question.coverage.flatMap(item => item.methods).length === 0 ? <em>Method not extracted</em> : <ul>{question.coverage.flatMap(item => item.methods).map((method, index) => <li key={`${question.questionId}-method-${String(index)}`}>{method}</li>)}</ul>}</td>
          <td>{question.coverage.flatMap(item => item.limitations).length === 0 ? <em>Boundary not extracted</em> : <ul>{question.coverage.flatMap(item => item.limitations).map((limit, index) => <li key={`${question.questionId}-limit-${String(index)}`}>{limit}</li>)}</ul>}</td>
        </tr>)}</tbody>
      </table></div>
    </section>

    <section>
      <div className="ipaper-view-section-head"><div><p className="ipaper-view-kicker">Decision desk</p><h2>Where can we do better?</h2></div><button type="button" className="ipaper-question-continue" onClick={onStart}>Continue with /find-the-problem</button></div>
      {candidates.length === 0 ? <p className="ipaper-view-empty-copy">No candidate gaps recorded yet. Compare the mapped boundaries and formulate a narrow question.</p> : <div className="ipaper-candidate-grid">{candidates.map(question => <article key={question.questionId} data-selected={question.stage === 'selected' || undefined}>
        <div><span className="ipaper-view-chip" data-tone={question.verificationStatus === 'verified' ? 'good' : 'attention'}>{question.verificationStatus}</span><span className="ipaper-question-stage">{question.stage}</span></div>
        <h3>{question.title}</h3>
        {question.summary !== '' && <p>{question.summary}</p>}
        <footer><Gate question={question} name="interest" /><Gate question={question} name="novelty" /><Gate question={question} name="feasibility" /></footer>
      </article>)}</div>}
    </section>
  </>
}

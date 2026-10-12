import { useEffect, useState } from 'react'
import { GitCompare, CheckSquare, Square, ChevronDown, ChevronUp } from 'lucide-react'
import { papersApi, compareApi } from '../api/client'
import type { Paper, ComparisonResult } from '../types'

const DIMENSION_LABELS: Record<string, string> = {
  research_problem: 'Research Problem & Objectives',
  methodology: 'Methodology & Approach',
  algorithms_models: 'Algorithms & Models',
  datasets: 'Datasets Used',
  evaluation_metrics: 'Evaluation Metrics',
  results: 'Results & Performance',
  advantages: 'Advantages & Strengths',
  limitations: 'Limitations',
  contributions: 'Key Contributions',
}

export default function ComparePapers() {
  const [papers, setPapers] = useState<Paper[]>([])
  const [selected, setSelected] = useState<string[]>([])
  const [loading, setLoading] = useState(true)
  const [comparing, setComparing] = useState(false)
  const [result, setResult] = useState<ComparisonResult | null>(null)
  const [expandedRow, setExpandedRow] = useState<string | null>(null)

  useEffect(() => {
    papersApi.list().then((res) => {
      setPapers(res.data.papers.filter((p: Paper) => p.processed && !p.processing_error))
    }).finally(() => setLoading(false))
  }, [])

  const toggle = (id: string) => {
    setSelected((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : prev.length < 5 ? [...prev, id] : prev
    )
  }

  const handleCompare = async () => {
    if (selected.length < 2) return
    setComparing(true)
    setResult(null)
    try {
      const res = await compareApi.compare(selected)
      setResult(res.data)
    } catch { }
    finally { setComparing(false) }
  }

  return (
    <div style={{ padding: 40, maxWidth: 1200, margin: '0 auto' }} className="animate-fade-in">
      <div style={{ marginBottom: 40 }}>
        <h1 style={{ fontSize: 28, fontWeight: 800 }}>Compare Research Papers</h1>
        <p style={{ color: 'var(--text-muted)', marginTop: 4 }}>Select 2–5 papers to compare side-by-side across key research dimensions</p>
      </div>

      {/* Paper Selection */}
      <div className="glass-card" style={{ padding: 28, marginBottom: 32 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <h2 style={{ fontSize: 16, fontWeight: 700 }}>Select Papers ({selected.length}/5)</h2>
          <button
            className="btn-primary"
            onClick={handleCompare}
            disabled={selected.length < 2 || comparing}
          >
            {comparing ? <><div className="spinner" style={{ width: 16, height: 16 }} /> Comparing...</> : <><GitCompare size={16} /> Compare Papers</>}
          </button>
        </div>

        {loading ? (
          <div style={{ display: 'grid', gap: 10 }}>
            {[1,2,3].map(i => <div key={i} className="skeleton" style={{ height: 60, borderRadius: 10 }} />)}
          </div>
        ) : papers.length === 0 ? (
          <p style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '40px 0' }}>
            No processed papers available. Upload and process papers first.
          </p>
        ) : (
          <div style={{ display: 'grid', gap: 10 }}>
            {papers.map((paper) => {
              const isSelected = selected.includes(paper.id)
              return (
                <button
                  key={paper.id}
                  onClick={() => toggle(paper.id)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 14, padding: '14px 18px',
                    background: isSelected ? 'rgba(59,130,246,0.1)' : 'rgba(255,255,255,0.02)',
                    border: `1px solid ${isSelected ? 'rgba(59,130,246,0.4)' : 'var(--border-subtle)'}`,
                    borderRadius: 10, cursor: 'pointer', textAlign: 'left', transition: 'all 0.2s',
                    color: 'var(--text-primary)',
                  }}
                >
                  {isSelected ? <CheckSquare size={18} color="#60a5fa" /> : <Square size={18} color="var(--text-muted)" />}
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 500 }}>{paper.title || paper.filename}</div>
                    {paper.authors && <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{paper.authors.slice(0, 2).join(', ')}</div>}
                  </div>
                </button>
              )
            })}
          </div>
        )}
      </div>

      {/* Comparison Result */}
      {comparing && (
        <div style={{ textAlign: 'center', padding: '60px 0' }}>
          <div className="spinner" style={{ width: 36, height: 36, margin: '0 auto 16px' }} />
          <p style={{ color: 'var(--text-muted)' }}>Analyzing and comparing papers...</p>
        </div>
      )}

      {result && !comparing && (
        <div className="animate-fade-in">
          {/* Common Keywords */}
          {result.common_keywords.length > 0 && (
            <div className="glass-card" style={{ padding: 24, marginBottom: 24 }}>
              <h3 style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 14 }}>
                Common Keywords
              </h3>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {result.common_keywords.map((kw) => (
                  <span key={kw} className="keyword-pill">{kw}</span>
                ))}
              </div>
            </div>
          )}

          {/* Comparison Table */}
          <div className="glass-card" style={{ padding: 0, overflow: 'hidden' }}>
            <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--border-subtle)' }}>
              <h2 style={{ fontSize: 18, fontWeight: 700 }}>Comparison Analysis</h2>
            </div>
            <div style={{ overflowX: 'auto' }}>
              <table className="comparison-table">
                <thead>
                  <tr>
                    <th style={{ width: 200 }}>Dimension</th>
                    {result.papers.map((p) => (
                      <th key={p.paper_id} style={{ minWidth: 220 }}>{p.title.slice(0, 60)}{p.title.length > 60 ? '...' : ''}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {result.dimensions.map((dim) => {
                    const entries = result.comparison_table[dim] || []
                    const isExpanded = expandedRow === dim
                    return (
                      <tr key={dim} style={{ cursor: 'pointer' }} onClick={() => setExpandedRow(isExpanded ? null : dim)}>
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <span style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: 13 }}>
                              {DIMENSION_LABELS[dim] || dim}
                            </span>
                            {isExpanded ? <ChevronUp size={13} color="var(--text-muted)" /> : <ChevronDown size={13} color="var(--text-muted)" />}
                          </div>
                        </td>
                        {result.papers.map((p) => {
                          const entry = entries.find((e) => e.paper_id === p.paper_id)
                          return (
                            <td key={p.paper_id} style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.7 }}>
                              {isExpanded
                                ? entry?.content || '—'
                                : (entry?.content || '—').slice(0, 100) + (entry && entry.content.length > 100 ? '...' : '')}
                            </td>
                          )
                        })}
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

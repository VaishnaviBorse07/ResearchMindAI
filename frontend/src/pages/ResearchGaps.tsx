import { useState } from 'react'
import { Lightbulb, AlertTriangle } from 'lucide-react'
import { gapsApi } from '../api/client'
import type { GapsResult } from '../types'

const THEME_LABELS: Record<string, string> = {
  scalability: 'Scalability & Efficiency',
  generalization: 'Generalization & Transfer',
  dataset_diversity: 'Dataset Diversity',
  interpretability: 'Interpretability & Explainability',
  multimodal: 'Multimodal Extensions',
  evaluation: 'Evaluation & Benchmarking',
  real_world: 'Real-World Deployment',
}

export default function ResearchGaps() {
  const [result, setResult] = useState<GapsResult | null>(null)
  const [loading, setLoading] = useState(false)
  const [activeTab, setActiveTab] = useState<'gaps' | 'limitations' | 'future_work' | 'themes'>('gaps')

  const handleAnalyze = async () => {
    setLoading(true)
    setResult(null)
    try {
      const res = await gapsApi.analyze()
      setResult(res.data)
    } catch { }
    finally { setLoading(false) }
  }

  return (
    <div style={{ padding: 40, maxWidth: 1100, margin: '0 auto' }} className="animate-fade-in">
      <div style={{ marginBottom: 40 }}>
        <h1 style={{ fontSize: 28, fontWeight: 800 }}>Research Gap Analysis</h1>
        <p style={{ color: 'var(--text-muted)', marginTop: 4 }}>
          Identify potential research gaps, limitations, and future work directions across all your papers
        </p>
      </div>

      {/* Disclaimer */}
      <div style={{ display: 'flex', gap: 12, padding: '14px 20px', background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.2)', borderRadius: 12, marginBottom: 32 }}>
        <AlertTriangle size={18} color="#fbbf24" style={{ flexShrink: 0 }} />
        <p style={{ fontSize: 13, color: '#fcd34d', lineHeight: 1.7 }}>
          <strong>Important:</strong> This tool identifies candidate research gaps through automated text analysis.
          Results require human validation and should not be cited as established findings.
        </p>
      </div>

      <button className="btn-primary" onClick={handleAnalyze} disabled={loading} style={{ marginBottom: 40, fontSize: 15, padding: '14px 32px' }}>
        {loading ? <><div className="spinner" style={{ width: 18, height: 18 }} /> Analyzing...</> : <><Lightbulb size={18} /> Analyze Research Gaps</>}
      </button>

      {loading && (
        <div style={{ textAlign: 'center', padding: '60px 0' }}>
          <div className="spinner" style={{ width: 36, height: 36, margin: '0 auto 16px' }} />
          <p style={{ color: 'var(--text-muted)' }}>Analyzing limitations, future work, and research gaps across all papers...</p>
        </div>
      )}

      {result && !loading && (
        <div className="animate-fade-in">
          {/* Tabs */}
          <div style={{ display: 'flex', gap: 6, marginBottom: 28, flexWrap: 'wrap' }}>
            {([
              { id: 'gaps', label: `Candidate Gaps (${result.candidate_gaps.length})` },
              { id: 'themes', label: `Themes (${result.recurring_themes.length})` },
              { id: 'limitations', label: `Limitations (${result.limitations.length})` },
              { id: 'future_work', label: `Future Work (${result.future_work.length})` },
            ] as const).map((t) => (
              <button key={t.id} className={`tab-btn ${activeTab === t.id ? 'active' : ''}`} onClick={() => setActiveTab(t.id)}>
                {t.label}
              </button>
            ))}
          </div>

          {activeTab === 'gaps' && (
            <div style={{ display: 'grid', gap: 20 }}>
              {result.candidate_gaps.map((gap, i) => (
                <div key={i} className="glass-card" style={{ padding: 28 }}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: 16, marginBottom: 20 }}>
                    <div style={{ width: 40, height: 40, borderRadius: 12, background: 'rgba(245,158,11,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <Lightbulb size={20} color="#fbbf24" />
                    </div>
                    <div>
                      <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1, color: '#fbbf24', marginBottom: 8 }}>
                        {THEME_LABELS[gap.theme] || gap.theme}
                      </div>
                      <p style={{ fontSize: 16, fontWeight: 600, color: 'var(--text-primary)', lineHeight: 1.5 }}>{gap.gap}</p>
                    </div>
                    <div style={{ marginLeft: 'auto', flexShrink: 0 }}>
                      <span className="badge badge-amber">{gap.evidence_count} evidence{gap.evidence_count > 1 ? 's' : ''}</span>
                    </div>
                  </div>
                  {/* Supporting papers */}
                  <div>
                    <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 10 }}>Supporting Evidence</div>
                    <div style={{ display: 'grid', gap: 10 }}>
                      {gap.supporting_papers.map((sp, j) => (
                        <div key={j} style={{ padding: '12px 16px', background: 'rgba(255,255,255,0.03)', borderRadius: 8, borderLeft: '3px solid rgba(245,158,11,0.4)' }}>
                          <div style={{ fontWeight: 500, fontSize: 13, color: 'var(--text-secondary)', marginBottom: 4 }}>{sp.title}</div>
                          <p style={{ fontSize: 12, color: 'var(--text-muted)', lineHeight: 1.6, fontStyle: 'italic' }}>"{sp.evidence}"</p>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {activeTab === 'themes' && (
            <div style={{ display: 'grid', gap: 16 }}>
              {result.recurring_themes.map((theme, i) => (
                <div key={i} className="glass-card" style={{ padding: 24 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                    <div>
                      <h3 style={{ fontWeight: 700, fontSize: 16 }}>{THEME_LABELS[theme.theme] || theme.theme}</h3>
                      <div style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 4 }}>Appears in {theme.occurrences} paper{theme.occurrences > 1 ? 's' : ''}</div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: 28, fontWeight: 800, color: '#a78bfa' }}>{theme.occurrences}</div>
                      <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>occurrences</div>
                    </div>
                  </div>
                  <div className="progress-bar">
                    <div className="progress-fill" style={{ width: `${Math.min(theme.occurrences * 20, 100)}%`, background: 'linear-gradient(135deg, #8b5cf6, #a78bfa)' }} />
                  </div>
                </div>
              ))}
            </div>
          )}

          {(activeTab === 'limitations' || activeTab === 'future_work') && (
            <div style={{ display: 'grid', gap: 12 }}>
              {(activeTab === 'limitations' ? result.limitations : result.future_work).map((item, i) => (
                <div key={i} className="glass-card" style={{ padding: 20 }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: activeTab === 'limitations' ? '#fca5a5' : '#6ee7b7', textTransform: 'uppercase', marginBottom: 8 }}>
                    {item.title}
                  </div>
                  <p style={{ fontSize: 14, color: 'var(--text-secondary)', lineHeight: 1.7 }}>{item.text}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

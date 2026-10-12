import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  ArrowLeft, FileText, Brain, Tag, User2, Download,
  ChevronDown, ChevronUp, AlertCircle, CheckCircle, RefreshCw, Loader
} from 'lucide-react'
import { papersApi, reportsApi } from '../api/client'
import type { Paper } from '../types'
import toast from 'react-hot-toast'

const ENTITY_COLORS: Record<string, [string, string]> = {
  PERSON: ['rgba(59,130,246,0.15)', '#93c5fd'],
  ORG: ['rgba(139,92,246,0.15)', '#c4b5fd'],
  GPE: ['rgba(16,185,129,0.15)', '#6ee7b7'],
  DATE: ['rgba(245,158,11,0.15)', '#fcd34d'],
  RESEARCH_ENTITY: ['rgba(6,182,212,0.15)', '#67e8f9'],
  PRODUCT: ['rgba(239,68,68,0.15)', '#fca5a5'],
  EVENT: ['rgba(245,158,11,0.15)', '#fcd34d'],
}

const SECTION_ORDER = ['abstract', 'introduction', 'related_work', 'methodology', 'results', 'discussion', 'conclusion']

export default function PaperDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [paper, setPaper] = useState<Paper | null>(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'overview' | 'summary' | 'keywords' | 'entities' | 'sections'>('overview')
  const [expandedSection, setExpandedSection] = useState<string | null>(null)
  const [exporting, setExporting] = useState(false)
  const [running, setRunning] = useState<string | null>(null)

  const fetchPaper = async () => {
    if (!id) return
    try {
      const res = await papersApi.get(id)
      setPaper(res.data)
    } catch { navigate('/dashboard') }
    finally { setLoading(false) }
  }

  useEffect(() => {
    fetchPaper()
    // Poll if not processed
    const interval = setInterval(() => {
      if (paper && !paper.processed) fetchPaper()
    }, 4000)
    return () => clearInterval(interval)
  }, [id, paper?.processed])

  const runAnalysis = async (type: string) => {
    if (!id) return
    setRunning(type)
    try {
      if (type === 'summarize') await papersApi.summarize(id)
      if (type === 'keywords') await papersApi.extractKeywords(id)
      if (type === 'entities') await papersApi.extractEntities(id)
      toast.success('Analysis complete')
      await fetchPaper()
    } catch { } finally { setRunning(null) }
  }

  const handleExport = async (format: 'pdf' | 'docx') => {
    if (!id) return
    setExporting(true)
    try {
      const res = await reportsApi.export(id, format)
      const blob = new Blob([res.data], { type: res.headers['content-type'] as string })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `report_${id.slice(0, 8)}.${format}`
      a.click()
      URL.revokeObjectURL(url)
      toast.success(`Report downloaded as ${format.toUpperCase()}`)
    } catch { } finally { setExporting(false) }
  }

  if (loading) return (
    <div style={{ padding: 40, textAlign: 'center' }}>
      <div className="spinner" style={{ width: 32, height: 32, margin: '100px auto' }} />
    </div>
  )

  if (!paper) return null

  const tabs = [
    { id: 'overview', label: 'Overview' },
    { id: 'summary', label: 'Summary' },
    { id: 'keywords', label: 'Keywords' },
    { id: 'entities', label: 'Entities' },
    { id: 'sections', label: 'Sections' },
  ] as const

  return (
    <div style={{ padding: 40, maxWidth: 1100, margin: '0 auto' }} className="animate-fade-in">
      {/* Back */}
      <button className="btn-secondary" style={{ marginBottom: 24 }} onClick={() => navigate('/dashboard')}>
        <ArrowLeft size={15} /> Back to Dashboard
      </button>

      {/* Header */}
      <div className="glass-card" style={{ padding: 32, marginBottom: 28 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 20, flexWrap: 'wrap' }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', gap: 10, marginBottom: 12, flexWrap: 'wrap' }}>
              {paper.processing_error
                ? <span className="badge badge-red"><AlertCircle size={11} /> Error</span>
                : paper.processed
                ? <span className="badge badge-green"><CheckCircle size={11} /> Processed</span>
                : <span className="badge badge-amber"><Loader size={11} /> Processing</span>}
              {paper.page_count && <span className="badge badge-blue">{paper.page_count} pages</span>}
              {paper.has_embeddings && <span className="badge badge-cyan">Searchable</span>}
            </div>
            <h1 style={{ fontSize: 22, fontWeight: 800, lineHeight: 1.3, marginBottom: 10 }}>
              {paper.title || paper.filename}
            </h1>
            {paper.authors && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--text-muted)', fontSize: 14 }}>
                <User2 size={14} />
                <span>{paper.authors.join(', ')}</span>
              </div>
            )}
            {paper.processing_error && (
              <div style={{ marginTop: 12, padding: '10px 14px', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 8, fontSize: 13, color: '#fca5a5' }}>
                <strong>Processing error:</strong> {paper.processing_error}
              </div>
            )}
          </div>

          {/* Actions */}
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', flexShrink: 0 }}>
            {paper.processed && (
              <>
                <button className="btn-secondary" onClick={() => handleExport('pdf')} disabled={exporting} style={{ fontSize: 13 }}>
                  <Download size={14} /> PDF
                </button>
                <button className="btn-secondary" onClick={() => handleExport('docx')} disabled={exporting} style={{ fontSize: 13 }}>
                  <Download size={14} /> DOCX
                </button>
              </>
            )}
          </div>
        </div>

        {/* Abstract */}
        {paper.abstract && (
          <div style={{ marginTop: 24, padding: '16px 20px', background: 'rgba(255,255,255,0.03)', borderRadius: 10, borderLeft: '3px solid var(--accent-primary)' }}>
            <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1, color: 'var(--text-muted)', marginBottom: 8 }}>Abstract</div>
            <p style={{ fontSize: 14, color: 'var(--text-secondary)', lineHeight: 1.8 }}>{paper.abstract}</p>
          </div>
        )}
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 28, flexWrap: 'wrap' }}>
        {tabs.map((t) => (
          <button key={t.id} className={`tab-btn ${activeTab === t.id ? 'active' : ''}`}
            onClick={() => setActiveTab(t.id)}>
            {t.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      {activeTab === 'overview' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 20 }}>
          {[
            { label: 'Keywords', value: paper.keywords?.length ?? 0, icon: Tag, action: 'keywords', hasData: !!paper.keywords },
            { label: 'Entities', value: paper.entities?.length ?? 0, icon: Brain, action: 'entities', hasData: !!paper.entities },
            { label: 'Sections', value: Object.keys(paper.sections || {}).length, icon: FileText, action: null, hasData: !!paper.sections },
            { label: 'Summary', value: paper.summary ? 'Ready' : 'Not generated', icon: Brain, action: 'summarize', hasData: !!paper.summary },
          ].map((item) => (
            <div key={item.label} className="stat-card">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>{item.label}</div>
                <item.icon size={18} color="var(--accent-primary)" />
              </div>
              <div style={{ fontSize: 28, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 12 }}>{item.value}</div>
              {item.action && paper.processed && (
                <button className="btn-secondary" style={{ fontSize: 12, width: '100%', justifyContent: 'center' }}
                  onClick={() => runAnalysis(item.action!)} disabled={running === item.action}>
                  {running === item.action ? <><div className="spinner" style={{ width: 12, height: 12 }} /> Running...</> : <><RefreshCw size={12} /> {item.hasData ? 'Refresh' : 'Generate'}</>}
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {activeTab === 'summary' && (
        <div>
          {!paper.summary ? (
            <div className="glass-card" style={{ padding: 48, textAlign: 'center' }}>
              <Brain size={40} style={{ margin: '0 auto 16px', display: 'block', color: 'var(--text-muted)' }} />
              <p style={{ color: 'var(--text-muted)', marginBottom: 20 }}>No summary generated yet</p>
              {paper.processed && (
                <button className="btn-primary" onClick={() => runAnalysis('summarize')} disabled={running === 'summarize'}>
                  {running === 'summarize' ? <><div className="spinner" style={{ width: 16, height: 16 }} /> Summarizing...</> : <><Brain size={15} /> Generate Summary</>}
                </button>
              )}
            </div>
          ) : (
            <div style={{ display: 'grid', gap: 20 }}>
              {paper.summary.brief && (
                <div className="glass-card" style={{ padding: 28 }}>
                  <h3 style={{ fontSize: 14, fontWeight: 700, color: '#60a5fa', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 14 }}>Brief Summary</h3>
                  <p style={{ fontSize: 15, lineHeight: 1.8, color: 'var(--text-secondary)' }}>{paper.summary.brief}</p>
                </div>
              )}
              {paper.summary.detailed && (
                <div className="glass-card" style={{ padding: 28 }}>
                  <h3 style={{ fontSize: 14, fontWeight: 700, color: '#a78bfa', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 14 }}>Detailed Summary</h3>
                  <p style={{ fontSize: 14, lineHeight: 1.9, color: 'var(--text-secondary)' }}>{paper.summary.detailed}</p>
                </div>
              )}
              {paper.summary.key_findings && (
                <div className="glass-card" style={{ padding: 28 }}>
                  <h3 style={{ fontSize: 14, fontWeight: 700, color: '#34d399', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 14 }}>Key Findings</h3>
                  <p style={{ fontSize: 14, lineHeight: 1.9, color: 'var(--text-secondary)' }}>{paper.summary.key_findings}</p>
                </div>
              )}
              {paper.summary.section_summaries && Object.entries(paper.summary.section_summaries).map(([sec, text]) => text ? (
                <div key={sec} className="glass-card" style={{ padding: 24 }}>
                  <h3 style={{ fontSize: 13, fontWeight: 700, color: '#fcd34d', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 12 }}>
                    {sec.replace('_', ' ')}
                  </h3>
                  <p style={{ fontSize: 14, lineHeight: 1.8, color: 'var(--text-secondary)' }}>{text}</p>
                </div>
              ) : null)}
            </div>
          )}
        </div>
      )}

      {activeTab === 'keywords' && (
        <div>
          {!paper.keywords ? (
            <div className="glass-card" style={{ padding: 48, textAlign: 'center' }}>
              <Tag size={40} style={{ margin: '0 auto 16px', display: 'block', color: 'var(--text-muted)' }} />
              <p style={{ color: 'var(--text-muted)', marginBottom: 20 }}>No keywords extracted yet</p>
              {paper.processed && (
                <button className="btn-primary" onClick={() => runAnalysis('keywords')} disabled={running === 'keywords'}>
                  {running === 'keywords' ? 'Extracting...' : 'Extract Keywords'}
                </button>
              )}
            </div>
          ) : (
            <div className="glass-card" style={{ padding: 32 }}>
              <h2 style={{ fontSize: 16, fontWeight: 700, marginBottom: 24 }}>Extracted Keywords & Keyphrases</h2>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, marginBottom: 32 }}>
                {paper.keywords.map((kw, i) => (
                  <div key={i} className="keyword-pill" title={`Score: ${kw.score.toFixed(3)} | Source: ${kw.source}`}>
                    {kw.keyword}
                    <span style={{ marginLeft: 6, fontSize: 10, opacity: 0.6 }}>{(kw.score * 100).toFixed(0)}%</span>
                  </div>
                ))}
              </div>
              {/* Score bars for top 10 */}
              <h3 style={{ fontSize: 14, fontWeight: 600, marginBottom: 16, color: 'var(--text-muted)' }}>Top 10 by Relevance Score</h3>
              <div style={{ display: 'grid', gap: 10 }}>
                {paper.keywords.slice(0, 10).map((kw, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div style={{ width: 140, fontSize: 13, color: 'var(--text-secondary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flexShrink: 0 }}>{kw.keyword}</div>
                    <div className="score-bar" style={{ flex: 1 }}>
                      <div className="score-fill" style={{ width: `${Math.min(kw.score * 100, 100)}%` }} />
                    </div>
                    <div style={{ width: 48, textAlign: 'right', fontSize: 12, color: 'var(--text-muted)' }}>{kw.score.toFixed(3)}</div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {activeTab === 'entities' && (
        <div>
          {!paper.entities ? (
            <div className="glass-card" style={{ padding: 48, textAlign: 'center' }}>
              <p style={{ color: 'var(--text-muted)', marginBottom: 20 }}>No entities extracted yet</p>
              {paper.processed && (
                <button className="btn-primary" onClick={() => runAnalysis('entities')} disabled={running === 'entities'}>
                  Extract Entities
                </button>
              )}
            </div>
          ) : (
            <div className="glass-card" style={{ padding: 32 }}>
              <h2 style={{ fontSize: 16, fontWeight: 700, marginBottom: 24 }}>Named Entities ({paper.entities.length})</h2>
              {/* Group by label */}
              {(() => {
                const grouped: Record<string, typeof paper.entities> = {}
                paper.entities!.forEach((e) => {
                  if (!grouped[e.label]) grouped[e.label] = []
                  grouped[e.label]!.push(e)
                })
                return Object.entries(grouped).map(([label, ents]) => {
                  const [bg, color] = ENTITY_COLORS[label] || ['rgba(100,116,139,0.15)', '#94a3b8']
                  return (
                    <div key={label} style={{ marginBottom: 24 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
                        <span style={{ display: 'inline-block', padding: '3px 10px', background: bg, color, borderRadius: 6, fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5 }}>{label}</span>
                        <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{ents!.length} found</span>
                      </div>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                        {ents!.map((e, i) => (
                          <span key={i} className="entity-tag" style={{ background: bg, color }}>{e.text}</span>
                        ))}
                      </div>
                    </div>
                  )
                })
              })()}
            </div>
          )}
        </div>
      )}

      {activeTab === 'sections' && (
        <div style={{ display: 'grid', gap: 12 }}>
          {!paper.sections || Object.keys(paper.sections).length === 0 ? (
            <div className="glass-card" style={{ padding: 48, textAlign: 'center' }}>
              <p style={{ color: 'var(--text-muted)' }}>No sections detected in this paper</p>
            </div>
          ) : (
            [...SECTION_ORDER, ...Object.keys(paper.sections).filter((s) => !SECTION_ORDER.includes(s))].map((sec) => {
              const text = paper.sections?.[sec]
              if (!text) return null
              const isExpanded = expandedSection === sec
              return (
                <div key={sec} className="glass-card" style={{ padding: 0, overflow: 'hidden' }}>
                  <button
                    style={{ width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '18px 24px', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-primary)' }}
                    onClick={() => setExpandedSection(isExpanded ? null : sec)}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <span style={{ fontWeight: 600, fontSize: 15, textTransform: 'capitalize' }}>{sec.replace('_', ' ')}</span>
                      <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{text.split(' ').length} words</span>
                    </div>
                    {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                  </button>
                  {isExpanded && (
                    <div style={{ padding: '0 24px 24px', fontSize: 14, lineHeight: 1.9, color: 'var(--text-secondary)', borderTop: '1px solid var(--border-subtle)' }}>
                      <div style={{ paddingTop: 16 }}>{text.slice(0, 3000)}{text.length > 3000 ? '...' : ''}</div>
                    </div>
                  )}
                </div>
              )
            })
          )}
        </div>
      )}
    </div>
  )
}

import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { FileText, Upload, Brain, Clock, CheckCircle, AlertCircle, Loader, Trash2, ExternalLink, BookOpen, BarChart2 } from 'lucide-react'
import { papersApi } from '../api/client'
import type { Paper } from '../types'
import toast from 'react-hot-toast'

function formatSize(bytes: number | null) {
  if (!bytes) return '—'
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}
function timeAgo(dateStr: string | null) {
  if (!dateStr) return ''
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  return `${Math.floor(hrs / 24)}d ago`
}

export default function Dashboard() {
  const [papers, setPapers] = useState<Paper[]>([])
  const [loading, setLoading] = useState(true)
  const navigate = useNavigate()

  const fetchPapers = async () => {
    try {
      const res = await papersApi.list()
      setPapers(res.data.papers)
    } catch { /* handled by interceptor */ }
    finally { setLoading(false) }
  }

  useEffect(() => {
    fetchPapers()
    const interval = setInterval(() => {
      const unprocessed = papers.some((p) => !p.processed)
      if (unprocessed) fetchPapers()
    }, 5000)
    return () => clearInterval(interval)
  }, [papers.length])

  const handleDelete = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation()
    if (!confirm('Delete this paper and all its analysis data?')) return
    await papersApi.delete(id)
    toast.success('Paper deleted')
    setPapers((prev) => prev.filter((p) => p.id !== id))
  }

  const processed = papers.filter((p) => p.processed && !p.processing_error)
  const processing = papers.filter((p) => !p.processed)
  const errored = papers.filter((p) => p.processed && p.processing_error)

  const stats = [
    { label: 'Total Papers', value: papers.length, icon: FileText, color: '#3b82f6' },
    { label: 'Processed', value: processed.length, icon: CheckCircle, color: '#10b981' },
    { label: 'Processing', value: processing.length, icon: Loader, color: '#f59e0b' },
    { label: 'Errors', value: errored.length, icon: AlertCircle, color: '#ef4444' },
  ]

  return (
    <div style={{ padding: '40px', maxWidth: 1200, margin: '0 auto' }} className="animate-fade-in">
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 40 }}>
        <div>
          <h1 style={{ fontSize: 28, fontWeight: 800 }}>Research Dashboard</h1>
          <p style={{ color: 'var(--text-muted)', marginTop: 4 }}>Manage and analyze your research papers</p>
        </div>
        <button className="btn-primary" onClick={() => navigate('/upload')}>
          <Upload size={16} /> Upload Papers
        </button>
      </div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 20, marginBottom: 40 }}>
        {stats.map((s) => (
          <div key={s.label} className="stat-card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <div style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 8 }}>{s.label}</div>
                <div style={{ fontSize: 36, fontWeight: 800, color: s.color }}>{s.value}</div>
              </div>
              <div style={{ width: 44, height: 44, borderRadius: 12, background: `${s.color}1a`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <s.icon size={20} color={s.color} />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Quick Actions */}
      {papers.length > 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, marginBottom: 40 }}>
          {[
            { label: 'Semantic Search', desc: 'Find passages across papers', icon: Brain, path: '/search', color: '#3b82f6' },
            { label: 'Ask Questions', desc: 'RAG-powered Q&A with citations', icon: BookOpen, path: '/qa', color: '#8b5cf6' },
            { label: 'Topic Analysis', desc: 'Discover themes and clusters', icon: BarChart2, path: '/topics', color: '#06b6d4' },
          ].map((a) => (
            <button key={a.path} onClick={() => navigate(a.path)} style={{
              background: 'var(--bg-card)', border: '1px solid var(--border-subtle)', borderRadius: 12,
              padding: '20px 24px', textAlign: 'left', cursor: 'pointer', transition: 'all 0.2s',
              display: 'flex', alignItems: 'center', gap: 16,
            }}
              onMouseEnter={(e) => { e.currentTarget.style.borderColor = a.color; e.currentTarget.style.background = 'var(--bg-card-hover)' }}
              onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'var(--border-subtle)'; e.currentTarget.style.background = 'var(--bg-card)' }}
            >
              <div style={{ width: 44, height: 44, borderRadius: 10, background: `${a.color}1a`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <a.icon size={20} color={a.color} />
              </div>
              <div>
                <div style={{ fontWeight: 600, fontSize: 14, color: 'var(--text-primary)' }}>{a.label}</div>
                <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>{a.desc}</div>
              </div>
            </button>
          ))}
        </div>
      )}

      {/* Papers List */}
      <div>
        <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 20 }}>Uploaded Papers</h2>

        {loading ? (
          <div style={{ display: 'grid', gap: 12 }}>
            {[1, 2, 3].map((i) => (
              <div key={i} className="skeleton" style={{ height: 90, borderRadius: 12 }} />
            ))}
          </div>
        ) : papers.length === 0 ? (
          <div className="glass-card" style={{ padding: '80px 40px', textAlign: 'center' }}>
            <FileText size={48} style={{ margin: '0 auto 20px', display: 'block', color: 'var(--text-muted)', opacity: 0.5 }} />
            <h3 style={{ fontSize: 18, fontWeight: 600, marginBottom: 12 }}>No papers yet</h3>
            <p style={{ color: 'var(--text-muted)', marginBottom: 24 }}>Upload your first research paper to get started</p>
            <button className="btn-primary" onClick={() => navigate('/upload')}>
              <Upload size={16} /> Upload Paper
            </button>
          </div>
        ) : (
          <div style={{ display: 'grid', gap: 12 }}>
            {papers.map((paper) => (
              <div
                key={paper.id}
                className="stat-card"
                onClick={() => navigate(`/papers/${paper.id}`)}
                style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 20 }}
                onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'var(--border-accent)' }}
                onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'var(--border-subtle)' }}
              >
                {/* Icon */}
                <div style={{ width: 48, height: 48, borderRadius: 12, background: 'rgba(59,130,246,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <FileText size={22} color="#60a5fa" />
                </div>

                {/* Info */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
                    <h3 style={{ fontSize: 15, fontWeight: 600, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {paper.title || paper.filename}
                    </h3>
                    {paper.processing_error ? (
                      <span className="badge badge-red">Error</span>
                    ) : paper.processed ? (
                      <span className="badge badge-green">Ready</span>
                    ) : (
                      <span className="badge badge-amber">Processing</span>
                    )}
                  </div>
                  <div style={{ display: 'flex', gap: 20, fontSize: 12, color: 'var(--text-muted)' }}>
                    {paper.authors && <span>{paper.authors.slice(0, 2).join(', ')}</span>}
                    {paper.page_count && <span>{paper.page_count} pages</span>}
                    <span>{formatSize(paper.file_size)}</span>
                    <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><Clock size={11} />{timeAgo(paper.upload_date)}</span>
                  </div>
                </div>

                {/* Actions */}
                <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
                  {!paper.processed && (
                    <div className="spinner" />
                  )}
                  <button className="btn-secondary" style={{ padding: '6px 14px', fontSize: 12 }}
                    onClick={(e) => { e.stopPropagation(); navigate(`/papers/${paper.id}`) }}>
                    <ExternalLink size={13} /> View
                  </button>
                  <button className="btn-danger" onClick={(e) => handleDelete(e, paper.id)}>
                    <Trash2 size={13} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

import { useState } from 'react'
import { BarChart2 } from 'lucide-react'
import { topicsApi } from '../api/client'
import type { TopicsResult } from '../types'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts'

const COLORS = ['#3b82f6', '#8b5cf6', '#06b6d4', '#10b981', '#f59e0b', '#ef4444', '#ec4899']

export default function TopicsPage() {
  const [result, setResult] = useState<TopicsResult | null>(null)
  const [loading, setLoading] = useState(false)
  const [numTopics, setNumTopics] = useState(5)

  const handleAnalyze = async () => {
    setLoading(true)
    setResult(null)
    try {
      const res = await topicsApi.analyze(undefined, numTopics)
      setResult(res.data)
    } catch { }
    finally { setLoading(false) }
  }

  const topicColors = COLORS.slice(0, numTopics)

  return (
    <div style={{ padding: 40, maxWidth: 1200, margin: '0 auto' }} className="animate-fade-in">
      <div style={{ marginBottom: 40 }}>
        <h1 style={{ fontSize: 28, fontWeight: 800 }}>Topic Modeling & Visualization</h1>
        <p style={{ color: 'var(--text-muted)', marginTop: 4 }}>Discover hidden themes across your research papers using LDA or BERTopic</p>
      </div>

      {/* Controls */}
      <div className="glass-card" style={{ padding: 28, marginBottom: 32, display: 'flex', alignItems: 'center', gap: 20, flexWrap: 'wrap' }}>
        <div>
          <label style={{ fontSize: 13, color: 'var(--text-muted)', display: 'block', marginBottom: 8 }}>Number of Topics</label>
          <div style={{ display: 'flex', gap: 8 }}>
            {[3, 5, 7, 10].map((n) => (
              <button key={n}
                className={`tab-btn ${numTopics === n ? 'active' : ''}`}
                onClick={() => setNumTopics(n)}
              >{n}</button>
            ))}
          </div>
        </div>
        <button className="btn-primary" onClick={handleAnalyze} disabled={loading} style={{ marginLeft: 'auto', padding: '12px 28px' }}>
          {loading ? <><div className="spinner" style={{ width: 16, height: 16 }} /> Modeling...</> : <><BarChart2 size={16} /> Run Topic Modeling</>}
        </button>
      </div>

      {loading && (
        <div style={{ textAlign: 'center', padding: '60px 0' }}>
          <div className="spinner" style={{ width: 36, height: 36, margin: '0 auto 16px' }} />
          <p style={{ color: 'var(--text-muted)' }}>Running topic modeling across all papers...</p>
        </div>
      )}

      {result && !loading && (
        <div className="animate-fade-in">
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 28 }}>
            <span className="badge badge-purple" style={{ fontSize: 13, padding: '6px 14px' }}>
              {result.method.toUpperCase()}
            </span>
            <span style={{ fontSize: 14, color: 'var(--text-muted)' }}>
              {result.topics.length} topics discovered from {result.paper_count} papers
            </span>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24, marginBottom: 32 }}>
            {/* Topics */}
            <div style={{ display: 'grid', gap: 16 }}>
              {result.topics.map((topic, i) => (
                <div key={topic.topic_id} className="glass-card" style={{ padding: 24 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
                    <div style={{ width: 12, height: 12, borderRadius: 3, background: topicColors[i] || '#64748b', flexShrink: 0 }} />
                    <span style={{ fontWeight: 700, fontSize: 15 }}>Topic {topic.topic_id + 1}</span>
                    {topic.doc_count && <span className="badge badge-blue" style={{ fontSize: 11 }}>{topic.doc_count} docs</span>}
                  </div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                    {topic.keywords.slice(0, 8).map((kw, j) => (
                      <span key={j} style={{
                        padding: '4px 10px', borderRadius: 100, fontSize: 12,
                        background: `${topicColors[i] || '#64748b'}20`,
                        color: topicColors[i] || '#94a3b8',
                        border: `1px solid ${topicColors[i] || '#64748b'}40`,
                        fontWeight: 500,
                      }}>
                        {kw.word}
                        <span style={{ opacity: 0.5, fontSize: 10, marginLeft: 4 }}>{kw.weight.toFixed(3)}</span>
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            {/* Keyword Frequency Chart */}
            <div className="glass-card" style={{ padding: 24 }}>
              <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 20 }}>Term Frequency Distribution</h3>
              {result.keyword_frequency.length > 0 ? (
                <ResponsiveContainer width="100%" height={320}>
                  <BarChart
                    data={result.keyword_frequency.slice(0, 20)}
                    layout="vertical"
                    margin={{ left: 0, right: 16 }}
                  >
                    <XAxis type="number" tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false} />
                    <YAxis dataKey="word" type="category" tick={{ fill: '#94a3b8', fontSize: 11 }} width={100} axisLine={false} tickLine={false} />
                    <Tooltip
                      contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border-subtle)', borderRadius: 8, fontSize: 13 }}
                      cursor={{ fill: 'rgba(255,255,255,0.03)' }}
                    />
                    <Bar dataKey="count" radius={[0, 4, 4, 0]}>
                      {result.keyword_frequency.slice(0, 20).map((_, i) => (
                        <Cell key={i} fill={COLORS[i % COLORS.length]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <p style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '40px 0' }}>No keyword data available</p>
              )}
            </div>
          </div>

          {/* Papers */}
          <div className="glass-card" style={{ padding: 24 }}>
            <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 16 }}>Papers Analyzed</h3>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
              {result.papers.map((p) => (
                <span key={p.paper_id} style={{
                  padding: '6px 14px', background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border-subtle)',
                  borderRadius: 100, fontSize: 13, color: 'var(--text-secondary)',
                }}>
                  {p.title.slice(0, 50)}{p.title.length > 50 ? '...' : ''}
                </span>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

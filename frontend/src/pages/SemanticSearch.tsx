import { useState } from 'react'
import { Search, FileText } from 'lucide-react'
import { searchApi } from '../api/client'
import type { SearchResult } from '../types'

export default function SemanticSearch() {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<SearchResult[]>([])
  const [loading, setLoading] = useState(false)
  const [searched, setSearched] = useState(false)

  const handleSearch = async () => {
    if (!query.trim()) return
    setLoading(true)
    setSearched(true)
    try {
      const res = await searchApi.semantic(query)
      setResults(res.data.results)
    } catch { setResults([]) }
    finally { setLoading(false) }
  }

  const handleKey = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleSearch()
  }

  return (
    <div style={{ padding: 40, maxWidth: 900, margin: '0 auto' }} className="animate-fade-in">
      <div style={{ marginBottom: 40 }}>
        <h1 style={{ fontSize: 28, fontWeight: 800 }}>Semantic Search</h1>
        <p style={{ color: 'var(--text-muted)', marginTop: 4 }}>Find relevant passages across all papers using natural-language queries</p>
      </div>

      {/* Search Box */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 12 }}>
        <div style={{ position: 'relative', flex: 1 }}>
          <Search size={18} style={{ position: 'absolute', left: 16, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
          <input
            className="input-field"
            style={{ paddingLeft: 48 }}
            placeholder="e.g., What transformer architectures are used for summarization?"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKey}
          />
        </div>
        <button className="btn-primary" onClick={handleSearch} disabled={loading || !query.trim()} style={{ padding: '12px 28px' }}>
          {loading ? <div className="spinner" style={{ width: 16, height: 16 }} /> : <Search size={16} />}
          Search
        </button>
      </div>
      <p style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 32 }}>
        Uses dense vector embeddings (Sentence Transformers + FAISS) — not keyword matching
      </p>

      {/* Results */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '60px 0' }}>
          <div className="spinner" style={{ width: 32, height: 32, margin: '0 auto 16px' }} />
          <p style={{ color: 'var(--text-muted)' }}>Searching across all papers...</p>
        </div>
      ) : searched && results.length === 0 ? (
        <div className="glass-card" style={{ padding: '60px 40px', textAlign: 'center' }}>
          <Search size={40} style={{ margin: '0 auto 16px', display: 'block', color: 'var(--text-muted)', opacity: 0.5 }} />
          <p style={{ color: 'var(--text-muted)', marginBottom: 8 }}>No relevant passages found</p>
          <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>Make sure papers are uploaded and processed with semantic indexing</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gap: 16 }}>
          {results.map((r, i) => (
            <div key={i} className="glass-card" style={{ padding: 24 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 14, gap: 16 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{ width: 32, height: 32, borderRadius: 8, background: 'rgba(59,130,246,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <FileText size={15} color="#60a5fa" />
                  </div>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: 14, color: 'var(--text-primary)' }}>{r.title}</div>
                    {r.page_num && <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Page {r.page_num}</div>}
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Relevance</div>
                    <div style={{ fontWeight: 700, color: '#60a5fa', fontSize: 15 }}>{(r.score * 100).toFixed(1)}%</div>
                  </div>
                  <div style={{ width: 6, height: 40, background: 'rgba(59,130,246,0.2)', borderRadius: 3, overflow: 'hidden' }}>
                    <div style={{ width: '100%', height: `${r.score * 100}%`, background: 'var(--gradient-accent)', borderRadius: 3, marginTop: `${(1 - r.score) * 100}%` }} />
                  </div>
                </div>
              </div>
              <p style={{ fontSize: 14, lineHeight: 1.8, color: 'var(--text-secondary)', borderLeft: '3px solid rgba(59,130,246,0.3)', paddingLeft: 16 }}>
                ...{r.excerpt}...
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

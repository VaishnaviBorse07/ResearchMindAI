import { useNavigate } from 'react-router-dom'
import { Brain, Upload, Search, MessageSquare, BarChart2, GitCompare, Lightbulb, BookOpen, ArrowRight, Sparkles, Zap, Shield } from 'lucide-react'

const features = [
  { icon: Upload, title: 'Smart PDF Upload', desc: 'Upload research papers with automatic text extraction, section detection, and metadata parsing.', color: 'blue' },
  { icon: Brain, title: 'AI Summarization', desc: 'Generate concise and detailed summaries using BART transformer models with section-wise breakdown.', color: 'purple' },
  { icon: Search, title: 'Semantic Search', desc: 'Find relevant passages across all your papers using dense vector embeddings, not just keywords.', color: 'cyan' },
  { icon: MessageSquare, title: 'RAG Q&A', desc: 'Ask questions and get grounded answers with accurate citations from your document collection.', color: 'green' },
  { icon: GitCompare, title: 'Paper Comparison', desc: 'Compare multiple papers side-by-side across methodology, results, datasets, and contributions.', color: 'amber' },
  { icon: Lightbulb, title: 'Research Gaps', desc: 'Automatically identify underexplored areas and potential future directions from your papers.', color: 'red' },
  { icon: BarChart2, title: 'Topic Modeling', desc: 'Discover hidden themes with LDA/BERTopic and visualize keyword distributions interactively.', color: 'purple' },
  { icon: BookOpen, title: 'Research Workspace', desc: 'Save papers, bookmark passages, maintain analysis history, and export reports as PDF/DOCX.', color: 'cyan' },
]

const stats = [
  { label: 'NLP Models', value: '8+' },
  { label: 'AI Techniques', value: '12+' },
  { label: 'Modules', value: '9' },
  { label: 'Export Formats', value: '2' },
]

const colorMap: Record<string, string> = {
  blue: 'rgba(59,130,246,0.15)',
  purple: 'rgba(139,92,246,0.15)',
  cyan: 'rgba(6,182,212,0.15)',
  green: 'rgba(16,185,129,0.15)',
  amber: 'rgba(245,158,11,0.15)',
  red: 'rgba(239,68,68,0.15)',
}
const iconColorMap: Record<string, string> = {
  blue: '#60a5fa',
  purple: '#a78bfa',
  cyan: '#22d3ee',
  green: '#34d399',
  amber: '#fbbf24',
  red: '#f87171',
}

export default function LandingPage() {
  const navigate = useNavigate()

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-primary)' }}>
      {/* Hero */}
      <section className="hero-gradient" style={{ padding: '80px 40px 100px', textAlign: 'center', position: 'relative', overflow: 'hidden' }}>
        {/* Floating orbs */}
        <div style={{ position: 'absolute', top: '20%', left: '10%', width: 300, height: 300, background: 'radial-gradient(circle, rgba(59,130,246,0.15) 0%, transparent 70%)', borderRadius: '50%', filter: 'blur(40px)', pointerEvents: 'none' }} />
        <div style={{ position: 'absolute', bottom: '10%', right: '10%', width: 250, height: 250, background: 'radial-gradient(circle, rgba(139,92,246,0.15) 0%, transparent 70%)', borderRadius: '50%', filter: 'blur(40px)', pointerEvents: 'none' }} />

        <div style={{ position: 'relative', zIndex: 1, maxWidth: 800, margin: '0 auto' }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '6px 16px', background: 'rgba(59,130,246,0.15)', border: '1px solid rgba(59,130,246,0.3)', borderRadius: 100, marginBottom: 32 }}>
            <Sparkles size={14} color="#60a5fa" />
            <span style={{ fontSize: 13, color: '#93c5fd', fontWeight: 500 }}>AI-Powered Research Assistant</span>
          </div>

          <h1 style={{ fontSize: 'clamp(2.5rem, 5vw, 4rem)', fontWeight: 900, lineHeight: 1.1, marginBottom: 24 }}>
            <span className="gradient-text">ResearchMind</span>{' '}
            <span style={{ color: 'var(--text-primary)' }}>AI</span>
          </h1>
          <p style={{ fontSize: 22, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 16 }}>
            AI Research Paper Intelligence System
          </p>
          <p style={{ fontSize: 16, color: 'var(--text-muted)', maxWidth: 620, margin: '0 auto 48px', lineHeight: 1.8 }}>
            Transform how you analyze scientific literature. Upload PDFs, extract insights, ask questions, compare papers,
            discover research gaps — all powered by cutting-edge NLP and Transformer models.
          </p>

          <div style={{ display: 'flex', gap: 16, justifyContent: 'center', flexWrap: 'wrap' }}>
            <button className="btn-primary" style={{ padding: '14px 32px', fontSize: 16 }} onClick={() => navigate('/dashboard')}>
              <Zap size={18} /> Get Started
            </button>
            <button className="btn-secondary" style={{ padding: '14px 32px', fontSize: 16 }} onClick={() => navigate('/upload')}>
              <Upload size={18} /> Upload Paper
            </button>
          </div>
        </div>
      </section>

      {/* Stats */}
      <section style={{ padding: '48px 40px', background: 'var(--bg-secondary)', borderTop: '1px solid var(--border-subtle)', borderBottom: '1px solid var(--border-subtle)' }}>
        <div style={{ maxWidth: 960, margin: '0 auto', display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 32, textAlign: 'center' }}>
          {stats.map((s) => (
            <div key={s.label}>
              <div className="gradient-text" style={{ fontSize: 42, fontWeight: 800, lineHeight: 1 }}>{s.value}</div>
              <div style={{ fontSize: 14, color: 'var(--text-muted)', marginTop: 8 }}>{s.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Features Grid */}
      <section style={{ padding: '80px 40px' }}>
        <div style={{ maxWidth: 1200, margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: 64 }}>
            <h2 style={{ fontSize: 36, fontWeight: 800, marginBottom: 16 }}>
              Everything you need for <span className="gradient-text">paper analysis</span>
            </h2>
            <p style={{ color: 'var(--text-muted)', fontSize: 16, maxWidth: 500, margin: '0 auto' }}>
              A complete NLP toolkit combining traditional and transformer-based approaches for research intelligence.
            </p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 24 }}>
            {features.map((f, i) => (
              <div key={i} className="glass-card" style={{ padding: 28, animationDelay: `${i * 50}ms` }}>
                <div style={{
                  width: 48, height: 48, borderRadius: 12,
                  background: colorMap[f.color] || colorMap.blue,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  marginBottom: 16,
                }}>
                  <f.icon size={22} color={iconColorMap[f.color] || '#60a5fa'} />
                </div>
                <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 10, color: 'var(--text-primary)' }}>{f.title}</h3>
                <p style={{ fontSize: 14, color: 'var(--text-muted)', lineHeight: 1.7 }}>{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Tech Stack */}
      <section style={{ padding: '60px 40px', background: 'var(--bg-secondary)' }}>
        <div style={{ maxWidth: 960, margin: '0 auto', textAlign: 'center' }}>
          <h2 style={{ fontSize: 28, fontWeight: 700, marginBottom: 40 }}>Built with <span className="gradient-text">state-of-the-art</span> technologies</h2>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, justifyContent: 'center' }}>
            {['BART / T5', 'Sentence Transformers', 'FAISS', 'spaCy', 'KeyBERT', 'BERTopic / LDA', 'FastAPI', 'React + Vite', 'TF-IDF', 'RAG Pipeline', 'PyMuPDF', 'OpenAI GPT'].map((tech) => (
              <span key={tech} className="badge badge-blue" style={{ fontSize: 13, padding: '8px 16px' }}>{tech}</span>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section style={{ padding: '80px 40px', textAlign: 'center' }}>
        <div className="glass-card animate-pulse-glow" style={{ maxWidth: 600, margin: '0 auto', padding: '60px 40px' }}>
          <Shield size={40} style={{ margin: '0 auto 24px', display: 'block', color: '#60a5fa' }} />
          <h2 style={{ fontSize: 28, fontWeight: 700, marginBottom: 16 }}>Ready to analyze your research?</h2>
          <p style={{ color: 'var(--text-muted)', marginBottom: 32, fontSize: 15 }}>
            Upload your first paper and experience AI-powered research intelligence in seconds.
          </p>
          <button className="btn-primary" style={{ padding: '14px 36px', fontSize: 16 }} onClick={() => navigate('/upload')}>
            <Upload size={18} /> Upload Your First Paper <ArrowRight size={16} />
          </button>
        </div>
      </section>

      {/* Footer */}
      <footer style={{ padding: '32px 40px', borderTop: '1px solid var(--border-subtle)', textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>
        <p>ResearchMind AI — AI Research Paper Intelligence System • Built for B.Tech NLP Project</p>
      </footer>
    </div>
  )
}

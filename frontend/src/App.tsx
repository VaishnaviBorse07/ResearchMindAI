import { Routes, Route, useNavigate, useLocation } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import {
  Brain, Home, Upload, Search, MessageSquare, GitCompare,
  BarChart2, ExternalLink
} from 'lucide-react'
import LandingPage from './pages/LandingPage'
import Dashboard from './pages/Dashboard'
import UploadPage from './pages/UploadPage'
import PaperDetail from './pages/PaperDetail'
import SemanticSearch from './pages/SemanticSearch'
import QAPage from './pages/QAPage'
import ComparePapers from './pages/ComparePapers'
import TopicsPage from './pages/TopicsPage'

const navItems = [
  { icon: Home, label: 'Dashboard', path: '/dashboard' },
  { icon: Upload, label: 'Upload Papers', path: '/upload' },
  { icon: Brain, label: 'Summarization', path: '/dashboard' },
  { icon: Search, label: 'Semantic Search', path: '/search' },
  { icon: MessageSquare, label: 'Ask Questions', path: '/qa' },
  { icon: GitCompare, label: 'Compare Papers', path: '/compare' },
  { icon: BarChart2, label: 'Topic Modeling', path: '/topics' },
]

function Sidebar() {
  const navigate = useNavigate()
  const location = useLocation()

  const isActive = (path: string) => location.pathname === path

  return (
    <nav className="sidebar">
      {/* Logo */}
      <div style={{ padding: '24px 20px 20px', borderBottom: '1px solid var(--border-subtle)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer' }} onClick={() => navigate('/')}>
          <div style={{ width: 36, height: 36, borderRadius: 10, background: 'var(--gradient-accent)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Brain size={20} color="white" />
          </div>
          <div>
            <div style={{ fontSize: 14, fontWeight: 800, background: 'var(--gradient-accent)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
              ResearchMind
            </div>
            <div style={{ fontSize: 10, color: 'var(--text-muted)', letterSpacing: 0.5, textTransform: 'uppercase' }}>AI System</div>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <div style={{ flex: 1, padding: '12px 0', overflowY: 'auto' }}>
        <div style={{ padding: '8px 20px 6px', fontSize: 10, color: 'var(--text-muted)', fontWeight: 700, letterSpacing: 1, textTransform: 'uppercase' }}>
          Navigation
        </div>
        {navItems.map((item) => (
          <button
            key={item.path + item.label}
            className={`sidebar-nav-item ${isActive(item.path) ? 'active' : ''}`}
            onClick={() => navigate(item.path)}
          >
            <item.icon size={17} />
            {item.label}
          </button>
        ))}
      </div>

      {/* Footer */}
      <div style={{ padding: '16px 20px', borderTop: '1px solid var(--border-subtle)' }}>
        <a
          href="/api/docs"
          target="_blank"
          rel="noopener noreferrer"
          style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, color: 'var(--text-muted)', textDecoration: 'none', padding: '8px 0' }}
        >
          <ExternalLink size={13} />
          API Documentation
        </a>
        <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 8, opacity: 0.6 }}>
          ResearchMind AI v1.0.0<br />
          B.Tech NLP Project
        </div>
      </div>
    </nav>
  )
}

function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ display: 'flex' }}>
      <Sidebar />
      <main className="main-content">{children}</main>
    </div>
  )
}

export default function App() {
  return (
    <>
      <Toaster
        position="top-right"
        toastOptions={{
          style: {
            background: 'var(--bg-card)',
            color: 'var(--text-primary)',
            border: '1px solid var(--border-subtle)',
            fontSize: '14px',
          },
          success: { iconTheme: { primary: '#10b981', secondary: 'white' } },
          error: { iconTheme: { primary: '#ef4444', secondary: 'white' } },
        }}
      />
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/*" element={
          <AppLayout>
            <Routes>
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/upload" element={<UploadPage />} />
              <Route path="/papers/:id" element={<PaperDetail />} />
              <Route path="/search" element={<SemanticSearch />} />
              <Route path="/qa" element={<QAPage />} />
              <Route path="/compare" element={<ComparePapers />} />
              <Route path="/topics" element={<TopicsPage />} />
            </Routes>
          </AppLayout>
        } />
      </Routes>
    </>
  )
}

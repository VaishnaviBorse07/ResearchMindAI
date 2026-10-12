import { useState, useRef, useEffect } from 'react'
import { Send, Bot, User, FileText, Info } from 'lucide-react'
import { qaApi } from '../api/client'
import type { QAResponse } from '../types'

interface Message {
  role: 'user' | 'assistant'
  content: string
  sources?: QAResponse['sources']
  chunks?: QAResponse['retrieved_chunks']
}

export default function QAPage() {
  const [messages, setMessages] = useState<Message[]>([
    {
      role: 'assistant',
      content: 'Hello! I\'m your AI research assistant. Ask me anything about your uploaded papers, and I\'ll provide grounded answers with citations from the source documents.',
    },
  ])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const handleAsk = async () => {
    if (!input.trim() || loading) return
    const question = input.trim()
    setInput('')
    setMessages((prev) => [...prev, { role: 'user', content: question }])
    setLoading(true)

    try {
      const res = await qaApi.ask(question)
      const { answer, sources, retrieved_chunks } = res.data as QAResponse
      setMessages((prev) => [...prev, {
        role: 'assistant',
        content: answer,
        sources,
        chunks: retrieved_chunks,
      }])
    } catch {
      setMessages((prev) => [...prev, {
        role: 'assistant',
        content: 'Sorry, I encountered an error while processing your question. Please try again.',
      }])
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 0px)', padding: '0' }}>
      {/* Header */}
      <div style={{ padding: '28px 40px 20px', borderBottom: '1px solid var(--border-subtle)', background: 'var(--bg-secondary)' }}>
        <h1 style={{ fontSize: 24, fontWeight: 800 }}>Research Q&A Assistant</h1>
        <p style={{ color: 'var(--text-muted)', fontSize: 14, marginTop: 4 }}>
          Ask questions about your papers — all answers are grounded in your documents with citations
        </p>
      </div>

      {/* Info Banner */}
      <div style={{ padding: '12px 40px', background: 'rgba(59,130,246,0.05)', borderBottom: '1px solid rgba(59,130,246,0.1)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: '#93c5fd' }}>
          <Info size={14} />
          <span>Using RAG: questions are answered using Retrieval-Augmented Generation from your uploaded papers. Answers include source citations.</span>
        </div>
      </div>

      {/* Messages */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '32px 40px', display: 'flex', flexDirection: 'column', gap: 28 }}>
        {messages.map((msg, i) => (
          <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: msg.role === 'user' ? 'flex-end' : 'flex-start', gap: 12 }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, maxWidth: '85%', flexDirection: msg.role === 'user' ? 'row-reverse' : 'row' }}>
              {/* Avatar */}
              <div style={{
                width: 36, height: 36, borderRadius: 12, flexShrink: 0,
                background: msg.role === 'assistant' ? 'rgba(59,130,246,0.2)' : 'var(--gradient-accent)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                {msg.role === 'assistant' ? <Bot size={18} color="#60a5fa" /> : <User size={18} color="white" />}
              </div>

              {/* Bubble */}
              <div>
                <div className={msg.role === 'user' ? 'chat-bubble-user' : 'chat-bubble-ai'}>
                  {msg.content}
                </div>

                {/* Sources */}
                {msg.sources && msg.sources.length > 0 && (
                  <div style={{ marginTop: 16, display: 'grid', gap: 8 }}>
                    <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1, color: 'var(--text-muted)', marginBottom: 4 }}>
                      📚 Sources ({msg.sources.length})
                    </div>
                    {msg.sources.map((src) => (
                      <div key={src.source_num} style={{
                        padding: '12px 16px',
                        background: 'rgba(59,130,246,0.06)',
                        border: '1px solid rgba(59,130,246,0.2)',
                        borderRadius: 10,
                        fontSize: 13,
                      }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                          <span style={{ fontWeight: 700, color: '#60a5fa' }}>[{src.source_num}]</span>
                          <FileText size={13} color="var(--text-muted)" />
                          <span style={{ fontWeight: 500, color: 'var(--text-secondary)' }}>{src.title}</span>
                          {src.page && <span className="badge badge-blue" style={{ fontSize: 10 }}>p.{src.page}</span>}
                        </div>
                        <p style={{ fontSize: 12, color: 'var(--text-muted)', lineHeight: 1.6, margin: 0, fontStyle: 'italic' }}>
                          "{src.excerpt.slice(0, 200)}..."
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}

        {/* Loading indicator */}
        {loading && (
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
            <div style={{ width: 36, height: 36, borderRadius: 12, background: 'rgba(59,130,246,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Bot size={18} color="#60a5fa" />
            </div>
            <div className="chat-bubble-ai" style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div className="spinner" style={{ width: 16, height: 16 }} />
              <span style={{ color: 'var(--text-muted)' }}>Searching papers and generating answer...</span>
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div style={{ padding: '20px 40px', borderTop: '1px solid var(--border-subtle)', background: 'var(--bg-secondary)' }}>
        <div style={{ display: 'flex', gap: 12 }}>
          <input
            className="input-field"
            placeholder="Ask a question about your research papers..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleAsk() } }}
            disabled={loading}
            style={{ flex: 1 }}
          />
          <button className="btn-primary" onClick={handleAsk} disabled={loading || !input.trim()} style={{ padding: '12px 20px' }}>
            {loading ? <div className="spinner" style={{ width: 16, height: 16 }} /> : <Send size={16} />}
          </button>
        </div>
        <p style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 10 }}>
          Press Enter to send • Answers are generated from your uploaded papers only • Never fabricates citations
        </p>
      </div>
    </div>
  )
}

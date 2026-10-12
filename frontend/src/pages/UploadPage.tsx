import { useCallback, useState } from 'react'
import { useDropzone } from 'react-dropzone'
import { useNavigate } from 'react-router-dom'
import { Upload, FileText, X, CheckCircle, AlertCircle, Cloud, Info } from 'lucide-react'
import { papersApi } from '../api/client'
import toast from 'react-hot-toast'

interface UploadedFile {
  file: File
  status: 'pending' | 'uploading' | 'success' | 'error'
  progress: number
  error?: string
  paperId?: string
}

export default function UploadPage() {
  const [files, setFiles] = useState<UploadedFile[]>([])
  const [uploading, setUploading] = useState(false)
  const navigate = useNavigate()

  const onDrop = useCallback((accepted: File[], rejected: any[]) => {
    const newFiles: UploadedFile[] = accepted.map((f) => ({
      file: f, status: 'pending', progress: 0,
    }))
    setFiles((prev) => [...prev, ...newFiles])
    rejected.forEach((r) => {
      toast.error(`${r.file.name}: ${r.errors[0]?.message || 'Invalid file'}`)
    })
  }, [])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'application/pdf': ['.pdf'] },
    maxSize: 50 * 1024 * 1024,
    multiple: true,
  })

  const removeFile = (idx: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== idx))
  }

  const handleUpload = async () => {
    const pending = files.filter((f) => f.status === 'pending')
    if (!pending.length) return

    setUploading(true)
    setFiles((prev) => prev.map((f) => f.status === 'pending' ? { ...f, status: 'uploading' } : f))

    try {
      const res = await papersApi.upload(
        pending.map((f) => f.file),
        (progress) => {
          setFiles((prev) =>
            prev.map((f) => f.status === 'uploading' ? { ...f, progress } : f)
          )
        }
      )

      const { uploaded, errors } = res.data

      setFiles((prev) => {
        const updated = [...prev]
        pending.forEach((pf) => {
          const idx = updated.findIndex((f) => f.file === pf.file)
          const uploadResult = uploaded.find((u: any) => u.filename === pf.file.name)
          const errorResult = errors.find((e: any) => e.filename === pf.file.name)

          if (uploadResult) {
            updated[idx] = { ...updated[idx], status: 'success', progress: 100, paperId: uploadResult.paper_id }
          } else if (errorResult) {
            updated[idx] = { ...updated[idx], status: 'error', error: errorResult.error }
          }
        })
        return updated
      })

      if (uploaded.length > 0) {
        toast.success(`${uploaded.length} paper(s) uploaded. Processing in background...`)
      }
      if (errors.length > 0) {
        toast.error(`${errors.length} file(s) failed to upload`)
      }
    } catch (e) {
      setFiles((prev) => prev.map((f) => f.status === 'uploading' ? { ...f, status: 'error', error: 'Upload failed' } : f))
    } finally {
      setUploading(false)
    }
  }

  const pendingCount = files.filter((f) => f.status === 'pending').length
  const successCount = files.filter((f) => f.status === 'success').length

  return (
    <div style={{ padding: '40px', maxWidth: 900, margin: '0 auto' }} className="animate-fade-in">
      <div style={{ marginBottom: 40 }}>
        <h1 style={{ fontSize: 28, fontWeight: 800 }}>Upload Research Papers</h1>
        <p style={{ color: 'var(--text-muted)', marginTop: 4 }}>Upload PDF files to analyze with AI-powered NLP tools</p>
      </div>

      {/* Info Banner */}
      <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start', padding: '16px 20px', background: 'rgba(59,130,246,0.08)', border: '1px solid rgba(59,130,246,0.2)', borderRadius: 12, marginBottom: 32 }}>
        <Info size={18} color="#60a5fa" style={{ flexShrink: 0, marginTop: 2 }} />
        <div style={{ fontSize: 14, color: 'var(--text-secondary)', lineHeight: 1.7 }}>
          <strong style={{ color: 'var(--text-primary)' }}>What happens after upload:</strong> Papers are automatically processed in the background. 
          We extract text, detect sections, generate summaries, extract keywords &amp; entities, and build semantic search indexes.
          Processing may take 1-5 minutes depending on paper length and available GPU.
        </div>
      </div>

      {/* Drop Zone */}
      <div {...getRootProps()} className={`drop-zone ${isDragActive ? 'active' : ''}`} style={{ marginBottom: 32 }}>
        <input {...getInputProps()} />
        <div className="animate-float" style={{ display: 'inline-block', marginBottom: 20 }}>
          <Cloud size={56} color={isDragActive ? '#3b82f6' : '#64748b'} />
        </div>
        <h3 style={{ fontSize: 18, fontWeight: 700, marginBottom: 10, color: isDragActive ? 'var(--accent-primary)' : 'var(--text-primary)' }}>
          {isDragActive ? 'Drop your papers here...' : 'Drag & Drop PDF files'}
        </h3>
        <p style={{ color: 'var(--text-muted)', marginBottom: 20 }}>or click to browse your files</p>
        <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
          <span className="badge badge-blue">PDF only</span>
          <span className="badge badge-blue">Max 50MB per file</span>
          <span className="badge badge-blue">Multiple files supported</span>
        </div>
      </div>

      {/* File List */}
      {files.length > 0 && (
        <div style={{ marginBottom: 32 }}>
          <h2 style={{ fontSize: 16, fontWeight: 600, marginBottom: 16 }}>
            Files ({files.length})
          </h2>
          <div style={{ display: 'grid', gap: 10 }}>
            {files.map((f, i) => (
              <div key={i} style={{
                display: 'flex', alignItems: 'center', gap: 16,
                padding: '14px 20px',
                background: 'var(--bg-card)',
                border: '1px solid var(--border-subtle)',
                borderRadius: 10,
              }}>
                {/* Icon */}
                <div style={{ width: 36, height: 36, borderRadius: 8, background: 'rgba(59,130,246,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <FileText size={18} color="#60a5fa" />
                </div>

                {/* File info */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
                    <span style={{ fontSize: 14, fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {f.file.name}
                    </span>
                    {f.status === 'success' && <span className="badge badge-green">Uploaded</span>}
                    {f.status === 'error' && <span className="badge badge-red">Failed</span>}
                    {f.status === 'uploading' && <span className="badge badge-amber">Uploading</span>}
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                    {(f.file.size / (1024 * 1024)).toFixed(2)} MB
                    {f.error && <span style={{ color: '#f87171', marginLeft: 12 }}>{f.error}</span>}
                    {f.status === 'success' && f.paperId && (
                      <button
                        onClick={() => navigate(`/papers/${f.paperId}`)}
                        style={{ marginLeft: 12, background: 'none', border: 'none', color: '#60a5fa', cursor: 'pointer', fontSize: 12 }}
                      >
                        View analysis →
                      </button>
                    )}
                  </div>
                  {f.status === 'uploading' && (
                    <div className="progress-bar" style={{ marginTop: 8 }}>
                      <div className="progress-fill" style={{ width: `${f.progress}%` }} />
                    </div>
                  )}
                </div>

                {/* Status / Remove */}
                <div style={{ flexShrink: 0 }}>
                  {f.status === 'pending' && (
                    <button onClick={() => removeFile(i)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: 4 }}>
                      <X size={16} />
                    </button>
                  )}
                  {f.status === 'uploading' && <div className="spinner" />}
                  {f.status === 'success' && <CheckCircle size={20} color="#10b981" />}
                  {f.status === 'error' && <AlertCircle size={20} color="#ef4444" />}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Actions */}
      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
        {pendingCount > 0 && (
          <button className="btn-primary" onClick={handleUpload} disabled={uploading} style={{ fontSize: 15, padding: '12px 28px' }}>
            {uploading ? <><div className="spinner" style={{ width: 16, height: 16 }} /> Uploading...</> : <><Upload size={16} /> Upload {pendingCount} File{pendingCount > 1 ? 's' : ''}</>}
          </button>
        )}
        {successCount > 0 && (
          <button className="btn-secondary" onClick={() => navigate('/dashboard')}>
            View Dashboard →
          </button>
        )}
        {files.length > 0 && !uploading && (
          <button className="btn-secondary" onClick={() => setFiles([])}>
            <X size={15} /> Clear All
          </button>
        )}
      </div>
    </div>
  )
}

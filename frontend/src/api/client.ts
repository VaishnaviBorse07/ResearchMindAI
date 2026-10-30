import axios from 'axios'
import toast from 'react-hot-toast'

const api = axios.create({
  baseURL: '/api',
  timeout: 120000,
})

api.interceptors.response.use(
  (res) => res,
  (error) => {
    const message =
      error.response?.data?.detail ||
      error.response?.data?.message ||
      error.message ||
      'An unexpected error occurred'
    if (error.response?.status !== 202) {
      toast.error(message)
    }
    return Promise.reject(error)
  }
)

// ─── Papers API ──────────────────────────────────────────────────────────────
export const papersApi = {
  upload: (files: File[], onProgress?: (pct: number) => void) => {
    const formData = new FormData()
    files.forEach((f) => formData.append('files', f))
    return api.post('/papers/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
      onUploadProgress: (e) => {
        if (onProgress && e.total) {
          onProgress(Math.round((e.loaded * 100) / e.total))
        }
      },
    })
  },

  list: (skip = 0, limit = 50) =>
    api.get('/papers', { params: { skip, limit } }),

  get: (id: string) => api.get(`/papers/${id}`),

  delete: (id: string) => api.delete(`/papers/${id}`),

  summarize: (id: string) => api.post(`/papers/${id}/summarize`),

  extractKeywords: (id: string) => api.post(`/papers/${id}/extract-keywords`),

  extractEntities: (id: string) => api.post(`/papers/${id}/extract-entities`),

  addBookmark: (id: string, data: { passage: string; note?: string; page_number?: number }) =>
    api.post(`/papers/${id}/bookmarks`, data),

  getBookmarks: (id: string) => api.get(`/papers/${id}/bookmarks`),
}

// ─── Search API ───────────────────────────────────────────────────────────────
export const searchApi = {
  semantic: (query: string, paperIds?: string[], topK = 10) =>
    api.post('/search/semantic', { query, paper_ids: paperIds, top_k: topK }),
}

// ─── QA API ───────────────────────────────────────────────────────────────────
export const qaApi = {
  ask: (question: string, paperIds?: string[]) =>
    api.post('/qa/ask', { question, paper_ids: paperIds }),
}

// ─── Compare API ──────────────────────────────────────────────────────────────
export const compareApi = {
  compare: (paperIds: string[]) =>
    api.post('/papers/compare', { paper_ids: paperIds }),
}

// ─── Topics API ───────────────────────────────────────────────────────────────
export const topicsApi = {
  analyze: (paperIds?: string[], numTopics = 5) =>
    api.post('/topics/analyze', { paper_ids: paperIds, num_topics: numTopics }),
}

// ─── Reports API ──────────────────────────────────────────────────────────────
export const reportsApi = {
  export: (paperId: string, format: 'pdf' | 'docx') =>
    api.post('/reports/export', { paper_id: paperId, format }, { responseType: 'blob' }),
}

export default api

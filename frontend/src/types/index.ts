// Shared TypeScript types

export interface Paper {
  id: string
  title: string | null
  authors: string[] | null
  abstract: string | null
  filename: string
  file_size: number | null
  page_count: number | null
  upload_date: string | null
  processed: boolean
  processing_error: string | null
  sections: Record<string, string> | null
  summary: PaperSummary | null
  keywords: Keyword[] | null
  entities: Entity[] | null
  topics: Topic[] | null
  has_embeddings: boolean
}

export interface PaperSummary {
  brief: string
  detailed: string
  section_summaries: Record<string, string>
  key_findings: string
}

export interface Keyword {
  keyword: string
  score: number
  source?: string
}

export interface Entity {
  text: string
  label: string
  description: string
  source: string
}

export interface Topic {
  topic_id: number
  keywords: Array<{ word: string; weight: number }>
  label: string
  doc_count?: number
}

export interface Bookmark {
  id: string
  paper_id: string
  passage: string
  note: string | null
  page_number: number | null
  created_at: string
}

export interface SearchResult {
  paper_id: string
  title: string
  excerpt: string
  score: number
  page_num: number | null
  chunk_id: number | null
}

export interface QASource {
  source_num: number
  paper_id: string
  title: string
  page: number | null
  excerpt: string
  score: number
}

export interface QAResponse {
  answer: string
  sources: QASource[]
  retrieved_chunks: Array<{
    chunk_id: number | null
    paper_id: string
    text: string
    score: number
    page_num: number | null
  }>
}

export interface ComparisonResult {
  paper_count: number
  papers: Array<{ paper_id: string; title: string }>
  comparison_table: Record<string, Array<{
    paper_id: string
    title: string
    content: string
  }>>
  common_keywords: string[]
  dimensions: string[]
}

export interface ResearchGap {
  gap: string
  theme: string
  evidence_count: number
  supporting_papers: Array<{
    paper_id: string
    title: string
    evidence: string
  }>
}

export interface GapsResult {
  limitations: Array<{ paper_id: string; title: string; text: string; type: string }>
  future_work: Array<{ paper_id: string; title: string; text: string; type: string }>
  recurring_themes: Array<{
    theme: string
    occurrences: number
    papers: Array<{ paper_id: string; title: string; evidence: string }>
  }>
  candidate_gaps: ResearchGap[]
  disclaimer: string
}

export interface TopicsResult {
  method: string
  topics: Topic[]
  keyword_frequency: Array<{ word: string; count: number }>
  paper_count: number
  papers: Array<{ paper_id: string; title: string }>
}

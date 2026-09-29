// ============================================================
// SHAP Explanation
// ============================================================

export interface ShapWord {
  word: string;
  shap: number;       // absolute value
  raw_shap: number;   // signed value (+FAKE / -REAL)
  direction: "FAKE" | "REAL";
}

// ============================================================
// Fact Check
// ============================================================

export interface FactCheckItem {
  claim: string;
  publisher: string;
  rating: string;
  interpretation: "CONTRADICTED" | "SUPPORTED" | "MIXED" | "UNKNOWN";
  title: string;
  url: string;
  review_date: string;
  similarity: number;
}

export type VerificationStatus =
  | "CONTRADICTED"
  | "VERIFIED"
  | "INSUFFICIENT EVIDENCE";

export interface RedditThread {
  source: string;
  subreddit: string;
  title: string;
  snippet: string;
  url: string;
  score: number;
  num_comments: number;
  debunk_flag: boolean;
  created_utc: number;
}

export interface NewsConsensusItem {
  source: string;
  title: string;
  url: string;
  debunk_flag: boolean;
}

export interface RhetoricalTechnique {
  id: string;
  label: string;
  description: string;
  color: string;
  matched_words: string[];
  intensity: "High" | "Medium";
}

export interface RhetoricAnalysis {
  detected_techniques: RhetoricalTechnique[];
  manipulation_score: number;
  risk_level: "Severe" | "Moderate" | "Low";
  count: number;
}

export interface TemporalAudit {
  temporal_mismatch_detected: boolean;
  historical_references: number[];
  audit_note: string;
}

export interface ResearchDossier {
  research_verdict: "DEBUNKED" | "DISPUTED" | "CORROBORATED" | "UNVERIFIED" | "MIXED CONTEXT";
  final_truth_status?: "REAL" | "FAKE" | "DISPUTED" | "UNVERIFIED" | "MIXED";
  summary: string;
  confidence_level: "High" | "Medium" | "Low";
  evidence_sources_count: number;
  reddit_threads_count: number;
  fact_checks_count: number;
  news_consensus_count?: number;
}

// ============================================================
// Prediction API  —  POST /predict
// ============================================================

export interface PredictionResponse {
  success: boolean;
  prediction: "REAL" | "FAKE" | "UNKNOWN";
  final_truth_status?: "REAL" | "FAKE" | "DISPUTED" | "UNVERIFIED" | "MIXED";
  confidence: number;
  shap_words: ShapWord[];
  shap_available: boolean;
  verification_status: VerificationStatus;
  verification_message: string;
  direct_fact_checks: FactCheckItem[];
  related_fact_checks: FactCheckItem[];
  direct_fact_check_count: number;
  related_fact_check_count: number;
  reddit_threads?: RedditThread[];
  news_consensus?: NewsConsensusItem[];
  research_dossier?: ResearchDossier;
  rhetoric_analysis?: RhetoricAnalysis;
  temporal_audit?: TemporalAudit;
  disclaimer: string;
  error?: string;
}

// ============================================================
// News Article
// ============================================================

export interface NewsArticle {
  title: string;
  description: string;
  content: string;
  source: string;
  author: string;
  url: string;
  image: string;
  publishedAt: string;
}

export type NewsCategory =
  | "general"
  | "business"
  | "entertainment"
  | "health"
  | "science"
  | "sports"
  | "technology";

// ============================================================
// Live News API  —  GET /live-news
// ============================================================

export interface LiveNewsResponse {
  success: boolean;
  source: string;
  category: NewsCategory;
  page: number;
  pageSize: number;
  totalResults: number;
  articles: NewsArticle[];
  error?: string;
}

// ============================================================
// Search News API  —  GET /search-news
// ============================================================

export interface SearchNewsResponse {
  success: boolean;
  query: string;
  page: number;
  pageSize: number;
  totalResults: number;
  articles: NewsArticle[];
  error?: string;
}

// ============================================================
// Health API  —  GET /health
// ============================================================

export interface HealthResponse {
  status: string;
  model_loaded: boolean;
  vectorizer_loaded: boolean;
  shap_ready: boolean;
  shap_available: boolean;
  news_api_configured: boolean;
  factcheck_api_configured: boolean;
}

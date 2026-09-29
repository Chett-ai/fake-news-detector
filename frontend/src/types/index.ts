// ============================================================
// VERIFAI — Types & Interface Declarations
// ============================================================

export type EpistemicAssessment =
  | "CORROBORATED"
  | "CONTRADICTED"
  | "DISPUTED"
  | "INSUFFICIENT_EVIDENCE";

export interface RankedSource {
  title: string;
  source: string;
  url: string;
  snippet: string;
  tier_label: string;
  tier_weight: number;
  badge_color: string;
  match_score_pct: number;
}

export interface EvidenceCounts {
  official_sources: number;
  factcheck_hits: number;
  press_coverage: number;
  community_threads: number;
}

export interface RedditSentimentThread {
  source: string;
  subreddit: string;
  title: string;
  snippet: string;
  url: string;
  upvotes: number;
  debunk_flag: boolean;
}

export interface CommunitySentiment {
  thread_count: number;
  threads: RedditSentimentThread[];
}

export interface LinguisticStyleSignal {
  prediction_class: "REAL" | "FAKE";
  confidence_pct: number;
  shap_words: ShapWord[];
  note: string;
}

export interface ShapWord {
  word: string;
  shap: number;
  raw_shap: number;
  direction: "REAL" | "FAKE";
}

export interface DirectFactCheck {
  claim_text: string;
  claimant: string;
  publisher: string;
  url: string;
  rating: string;
  date: string;
  interpretation: "CONTRADICTED" | "CORROBORATED" | "NEUTRAL";
}

export interface RhetoricTechnique {
  id: string;
  label: string;
  intensity: "High" | "Medium" | "Low";
  matched_words: string[];
  description: string;
  color: string;
}

export interface RhetoricAnalysis {
  risk_level: "Severe" | "Moderate" | "Low";
  manipulation_score: number;
  detected_techniques: RhetoricTechnique[];
}

export interface TemporalAudit {
  temporal_mismatch_detected: boolean;
  audit_note?: string;
}

export interface PredictionResponse {
  success: boolean;
  error?: string;
  assessment: EpistemicAssessment;
  assessment_label: string;
  confidence_state: "high-evidence" | "medium-evidence" | "low-evidence";
  reasoning: string;
  ranked_sources: RankedSource[];
  evidence_counts: EvidenceCounts;
  community_sentiment: CommunitySentiment;
  linguistic_style_signal: LinguisticStyleSignal;
  shap_words: ShapWord[];
  shap_available: boolean;
  verification_status: string;
  verification_message: string;
  direct_fact_checks: DirectFactCheck[];
  related_fact_checks: DirectFactCheck[];
  rhetoric_analysis?: RhetoricAnalysis;
  temporal_audit?: TemporalAudit;
  disclaimer: string;
}

export type NewsCategory =
  | "general"
  | "business"
  | "technology"
  | "science"
  | "health"
  | "sports"
  | "entertainment";

export interface NewsArticle {
  title: string;
  description: string | null;
  url: string;
  image: string | null;
  source: string;
  publishedAt: string;
  category: NewsCategory;
}

export interface LiveNewsResponse {
  success: boolean;
  articles: NewsArticle[];
  category: NewsCategory;
  count: number;
  page: number;
  totalResults: number;
  error?: string;
}

export interface SearchNewsResponse {
  success: boolean;
  query: string;
  articles: NewsArticle[];
  count: number;
  error?: string;
}

export interface HealthResponse {
  status: string;
  model_ready: boolean;
}

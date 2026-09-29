"use client";

import { useState } from "react";
import Navbar from "@/components/Navbar/Navbar";
import ArticleInput from "@/components/ArticleInput/ArticleInput";
import PredictionCard from "@/components/PredictionCard/PredictionCard";
import ShapExplainer from "@/components/ShapExplainer/ShapExplainer";
import FactCheckSection from "@/components/FactCheckSection/FactCheckSection";
import ResearchDossierView from "@/components/ResearchDossierView/ResearchDossierView";
import RhetoricHeatmap from "@/components/RhetoricHeatmap/RhetoricHeatmap";
import LiveNewsSection from "@/components/LiveNewsSection/LiveNewsSection";
import { useAnalyze } from "@/hooks/useAnalyze";
import { useLiveNews } from "@/hooks/useLiveNews";
import type { NewsArticle, NewsCategory } from "@/types";
import styles from "./page.module.css";

const CATEGORIES: { id: NewsCategory; label: string }[] = [
  { id: "general", label: "🌐 General" },
  { id: "business", label: "💼 Business" },
  { id: "technology", label: "💻 Tech" },
  { id: "science", label: "🔬 Science" },
  { id: "health", label: "🏥 Health" },
  { id: "sports", label: "⚽ Sports" },
  { id: "entertainment", label: "🎬 Entertainment" },
];

export default function Home() {
  const { data, loading, error, analyze, reset } = useAnalyze();
  const {
    articles,
    category,
    loading: newsLoading,
    error: newsError,
    changeCategory,
    search,
  } = useLiveNews();

  const [inputVal, setInputVal] = useState<string>("");

  const handleSelectArticle = (article: NewsArticle) => {
    const fullText = `${article.title}\n\n${article.description || ""}`;
    setInputVal(fullText);
    analyze(fullText);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleClear = () => {
    setInputVal("");
    reset();
  };

  return (
    <div className={styles.wrapper}>
      <Navbar />

      <main className={styles.main}>
        <div className={styles.hero}>
          <div className={styles.badge}>Next-Gen AI Truth Verification</div>
          <h1 className={styles.title}>
            Analyze News with <span className={styles.gradient}>Explainable AI</span>
          </h1>
          <p className={styles.subtitle}>
            Detect disinformation patterns using Machine Learning, explain predictions with SHAP,
            and cross-reference verified claims with Google Fact Check in real-time.
          </p>
        </div>

        <ArticleInput
          value={inputVal}
          onChange={setInputVal}
          onAnalyze={analyze}
          onClear={handleClear}
          loading={loading}
        />

        {error && <div className={styles.errorBox}>⚠️ {error}</div>}

        {data && (
          <div className={styles.resultsArea}>
            {data.research_dossier && (
              <ResearchDossierView
                dossier={data.research_dossier}
                redditThreads={data.reddit_threads}
                newsConsensus={data.news_consensus}
              />
            )}
            <RhetoricHeatmap
              rhetoric={data.rhetoric_analysis}
              temporal={data.temporal_audit}
            />
            <PredictionCard data={data} />
            <ShapExplainer
              shapWords={data.shap_words}
              available={data.shap_available}
            />
            <FactCheckSection
              directChecks={data.direct_fact_checks}
              relatedChecks={data.related_fact_checks}
              status={data.verification_status}
              message={data.verification_message}
            />
          </div>
        )}

        <LiveNewsSection
          articles={articles}
          categories={CATEGORIES}
          activeCategory={category}
          onSelectCategory={changeCategory}
          onSearch={search}
          onSelectArticle={handleSelectArticle}
          loading={newsLoading}
          error={newsError}
        />
      </main>

      <footer className={styles.footer}>
        <p>TruthLens &bull; Explainable Fake News Detection Platform</p>
      </footer>
    </div>
  );
}

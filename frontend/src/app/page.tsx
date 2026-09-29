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

const AI_CATEGORIES: { id: NewsCategory; label: string }[] = [
  { id: "technology", label: "🤖 AI Models & Tech" },
  { id: "business", label: "📈 Industry & Startups" },
  { id: "science", label: "🔬 AI Research & Papers" },
  { id: "general", label: "🌐 AI Policy & Ethics" },
];

export default function Home() {
  const { data, loading, step, error, analyze, reset } = useAnalyze();
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
        {/* Hero Section */}
        <div className={styles.hero}>
          <div className={styles.badge}>◈ TRANSPARENCY-FIRST EVIDENCE LEDGER</div>
          <h1 className={styles.title}>
            Investigate Worldwide <span className={styles.gradient}>AI Claims &amp; Developments</span>
          </h1>
          <p className={styles.subtitle}>
            Find, rank, and evaluate multi-source evidence across official company blogs, arXiv, institutional fact-checkers, and tech press.
          </p>
        </div>

        {/* Dynamic Input Component */}
        <ArticleInput
          value={inputVal}
          onChange={setInputVal}
          onAnalyze={analyze}
          onClear={handleClear}
          loading={loading}
          step={step}
        />

        {error && <div className={styles.errorBox}>⚠️ {error}</div>}

        {/* Results Area */}
        {data && (
          <div className={`${styles.resultsArea} animateIn`}>
            {/* 1. Primary Evidence Ledger */}
            <PredictionCard data={data} />
            
            {/* 2. Isolated Community Sentiment (Non-Evidentiary) */}
            <ResearchDossierView
              communitySentiment={data.community_sentiment}
            />
            
            {/* 3. Rhetoric Heatmap */}
            <RhetoricHeatmap
              rhetoric={data.rhetoric_analysis}
              temporal={data.temporal_audit}
            />

            {/* 4. Secondary Linguistic Style Signal (SHAP) */}
            <ShapExplainer
              shapWords={data.shap_words}
              available={data.shap_available}
            />

            {/* 5. Direct Institutional Fact Checks */}
            <FactCheckSection
              directChecks={data.direct_fact_checks}
              relatedChecks={data.related_fact_checks}
              status={data.verification_status}
              message={data.verification_message}
            />
          </div>
        )}

        {/* Live News Section */}
        <LiveNewsSection
          articles={articles}
          categories={AI_CATEGORIES}
          activeCategory={category}
          onSelectCategory={changeCategory}
          onSearch={search}
          onSelectArticle={handleSelectArticle}
          loading={newsLoading}
          error={newsError}
        />
      </main>

      <footer className={styles.footer}>
        <p>VERIFAI &bull; Transparency-First AI Evidence &amp; Verification Ledger Engine</p>
      </footer>
    </div>
  );
}

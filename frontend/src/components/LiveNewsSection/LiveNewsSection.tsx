"use client";

import styles from "./LiveNewsSection.module.css";
import type { NewsArticle, NewsCategory } from "@/types";

interface Props {
  articles: NewsArticle[];
  categories: { id: NewsCategory; label: string }[];
  activeCategory: NewsCategory;
  onSelectCategory: (cat: NewsCategory) => void;
  onSearch: (q: string) => void;
  onSelectArticle: (article: NewsArticle) => void;
  loading: boolean;
  error?: string | null;
}

export default function LiveNewsSection({
  articles,
  categories,
  activeCategory,
  onSelectCategory,
  onSearch,
  onSelectArticle,
  loading,
  error,
}: Props) {
  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div>
          <h2 className={styles.title}>📰 Live News Feed</h2>
          <p className={styles.subtitle}>Select any trending article to verify instantly</p>
        </div>
        <div className={styles.searchWrapper}>
          <input
            type="text"
            placeholder="Search breaking topics (e.g. AI, Climate, NASA)..."
            className={styles.searchInput}
            onChange={(e) => {
              const val = e.target.value;
              if (val.trim().length >= 3) {
                onSearch(val.trim());
              }
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                const target = e.target as HTMLInputElement;
                if (target.value.trim()) {
                  onSearch(target.value.trim());
                }
              }
            }}
          />
        </div>
      </div>

      <div className={styles.tabs}>
        {categories.map((cat) => (
          <button
            key={cat.id}
            className={`${styles.tab} ${activeCategory === cat.id ? styles.activeTab : ""}`}
            onClick={() => onSelectCategory(cat.id)}
          >
            {cat.label}
          </button>
        ))}
      </div>

      {error && <div className={styles.empty}>⚠️ {error}</div>}

      {loading ? (
        <div className={styles.loading}>Fetching live headlines...</div>
      ) : articles.length === 0 ? (
        <div className={styles.empty}>No articles found. Try another search query or category.</div>
      ) : (
        <div className={styles.grid}>
          {articles.map((item, idx) => (
            <div key={idx} className={styles.card} onClick={() => onSelectArticle(item)}>
              {item.image && (
                <div
                  className={styles.image}
                  style={{ backgroundImage: `url(${item.image})` }}
                />
              )}
              <div className={styles.content}>
                <span className={styles.source}>{item.source}</span>
                <h4 className={styles.cardTitle}>{item.title}</h4>
                <p className={styles.cardSnippet}>{item.description}</p>
                <div className={styles.cardFooter}>
                  <button className={styles.verifyBtn}>Analyze this text →</button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

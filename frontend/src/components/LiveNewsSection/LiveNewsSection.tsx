"use client";

import { useState, useEffect, useRef } from "react";
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

// Skeleton array for loading placeholders
const SKELETON_COUNT = 6;

function SkeletonCard() {
  return (
    <div className={styles.skeletonCard}>
      <div className={styles.skeletonImage} />
      <div className={styles.skeletonContent}>
        <div className={styles.skeletonPill} />
        <div className={styles.skeletonLine} style={{ width: "90%" }} />
        <div className={styles.skeletonLine} style={{ width: "70%" }} />
        <div className={styles.skeletonLine} style={{ width: "55%", height: "10px" }} />
      </div>
    </div>
  );
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
  const [searchVal, setSearchVal] = useState("");
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Debounced search — waits 500ms after user stops typing
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (searchVal.trim().length >= 3) {
      debounceRef.current = setTimeout(() => {
        onSearch(searchVal.trim());
      }, 500);
    }
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [searchVal, onSearch]);

  const handleSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && searchVal.trim()) {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      onSearch(searchVal.trim());
    }
  };

  return (
    <div className={styles.container}>
      {/* Header */}
      <div className={styles.header}>
        <div className={styles.headerLeft}>
          <span className={styles.sectionTag}>• LIVE AI NEWS FEED</span>
          <h2 className={styles.title}>Latest AI Developments</h2>
          <p className={styles.subtitle}>
            Click any headline to instantly verify it
          </p>
        </div>
        <div className={styles.searchWrapper}>
          <span className={styles.searchIcon}>⌕</span>
          <input
            type="text"
            value={searchVal}
            placeholder="Search AI news… (e.g. GPT, Gemini, AGI)"
            className={styles.searchInput}
            onChange={(e) => setSearchVal(e.target.value)}
            onKeyDown={handleSearchKeyDown}
          />
          {searchVal && (
            <button
              className={styles.clearSearch}
              onClick={() => {
                setSearchVal("");
                onSelectCategory(activeCategory); // reload category
              }}
            >
              ✕
            </button>
          )}
        </div>
      </div>

      {/* Category tabs */}
      <div className={styles.tabs}>
        {categories.map((cat) => (
          <button
            key={cat.id}
            className={`${styles.tab} ${activeCategory === cat.id ? styles.activeTab : ""}`}
            onClick={() => {
              setSearchVal("");
              onSelectCategory(cat.id);
            }}
          >
            {cat.label}
          </button>
        ))}
      </div>

      {/* Error */}
      {error && (
        <div className={styles.errorBanner}>
          ⚠ {error}
        </div>
      )}

      {/* Skeleton loaders */}
      {loading && (
        <div className={styles.grid}>
          {Array.from({ length: SKELETON_COUNT }).map((_, i) => (
            <SkeletonCard key={i} />
          ))}
        </div>
      )}

      {/* Empty state */}
      {!loading && !error && articles.length === 0 && (
        <div className={styles.empty}>
          <div className={styles.emptyIcon}>🔍</div>
          <p>No AI news articles found. Try a different search query or category.</p>
        </div>
      )}

      {/* Articles grid */}
      {!loading && articles.length > 0 && (
        <div className={styles.grid}>
          {articles.map((item, idx) => (
            <article
              key={idx}
              className={styles.card}
              onClick={() => onSelectArticle(item)}
              style={{ animationDelay: `${idx * 40}ms` }}
            >
              {item.image ? (
                <div
                  className={styles.cardImage}
                  style={{ backgroundImage: `url(${item.image})` }}
                />
              ) : (
                <div className={styles.cardImageFallback}>
                  <span>◈ AI</span>
                </div>
              )}
              <div className={styles.cardBody}>
                <span className={styles.cardSource}>{item.source}</span>
                <h3 className={styles.cardTitle}>{item.title}</h3>
                {item.description && (
                  <p className={styles.cardSnippet}>{item.description}</p>
                )}
                <div className={styles.cardFooter}>
                  {item.publishedAt && (
                    <span className={styles.cardDate}>
                      {new Date(item.publishedAt).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                      })}
                    </span>
                  )}
                  <button className={styles.verifyBtn}>
                    Verify this →
                  </button>
                </div>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}

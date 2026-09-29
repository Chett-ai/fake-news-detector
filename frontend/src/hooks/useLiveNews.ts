"use client";

import { useState, useEffect, useCallback } from "react";
import { fetchLiveNews, searchNews } from "@/lib/api";
import type { NewsArticle, NewsCategory } from "@/types";

export function useLiveNews() {
  const [articles, setArticles] = useState<NewsArticle[]>([]);
  const [category, setCategory] = useState<NewsCategory>("general");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  const load = useCallback(async (cat: NewsCategory) => {
    setLoading(true);
    setError(null);
    setSearchQuery("");

    try {
      const res = await fetchLiveNews(cat);
      setArticles(res.articles);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load news");
    } finally {
      setLoading(false);
    }
  }, []);

  const search = useCallback(async (q: string) => {
    if (!q.trim()) return;
    setLoading(true);
    setError(null);
    setSearchQuery(q);

    try {
      const res = await searchNews(q);
      setArticles(res.articles);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Search failed");
    } finally {
      setLoading(false);
    }
  }, []);

  const changeCategory = useCallback(
    (cat: NewsCategory) => {
      setCategory(cat);
      load(cat);
    },
    [load]
  );

  // Load on mount
  useEffect(() => {
    load("general");
  }, [load]);

  return {
    articles,
    category,
    loading,
    error,
    searchQuery,
    changeCategory,
    search,
    reload: () => load(category),
  };
}

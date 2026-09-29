// ============================================================
// API client — all calls go to the Flask backend via
// Next.js rewrites (see next.config.ts → /api/* → Flask :5000)
// ============================================================

import type {
  PredictionResponse,
  LiveNewsResponse,
  SearchNewsResponse,
  HealthResponse,
  NewsCategory,
} from "@/types";

const BASE = "/api";

// ============================================================
// POST /predict
// ============================================================

export async function analyzePrediction(
  text: string
): Promise<PredictionResponse> {
  const res = await fetch(`${BASE}/predict`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text }),
  });

  const data: PredictionResponse = await res.json();

  if (!res.ok || !data.success) {
    throw new Error(data.error ?? "Prediction failed.");
  }

  return data;
}

// ============================================================
// GET /live-news
// ============================================================

export async function fetchLiveNews(
  category: NewsCategory = "general",
  page = 1,
  pageSize = 20
): Promise<LiveNewsResponse> {
  const params = new URLSearchParams({
    category,
    page: String(page),
    pageSize: String(pageSize),
  });

  const res = await fetch(`${BASE}/live-news?${params}`);
  const data: LiveNewsResponse = await res.json();

  if (!res.ok || !data.success) {
    throw new Error(data.error ?? "Could not load live news.");
  }

  return data;
}

// ============================================================
// GET /search-news
// ============================================================

export async function searchNews(
  query: string,
  page = 1,
  pageSize = 20
): Promise<SearchNewsResponse> {
  const params = new URLSearchParams({
    q: query,
    page: String(page),
    pageSize: String(pageSize),
  });

  const res = await fetch(`${BASE}/search-news?${params}`);
  const contentType = res.headers.get("content-type") || "";

  if (!contentType.includes("application/json")) {
    const text = await res.text();
    throw new Error(
      res.status === 404
        ? "Search endpoint not found. Ensure Flask backend is running on port 5000."
        : `Server returned non-JSON response (${res.status}): ${text.slice(0, 100)}`
    );
  }

  const data: SearchNewsResponse = await res.json();

  if (!res.ok || !data.success) {
    throw new Error(data.error ?? "News search failed.");
  }

  return data;
}

// ============================================================
// GET /health
// ============================================================

export async function fetchHealth(): Promise<HealthResponse> {
  const res = await fetch(`${BASE}/health`);
  return res.json();
}

// ============================================================
// POST /verify-context
// ============================================================

export async function verifyContext(text: string) {
  const res = await fetch(`${BASE}/verify-context`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text }),
  });
  const data = await res.json();
  if (!res.ok || !data.success) {
    throw new Error(data.error ?? "Context verification failed.");
  }
  return data;
}

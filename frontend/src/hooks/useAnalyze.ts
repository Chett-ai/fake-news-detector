"use client";

import { useState, useCallback } from "react";
import { analyzePrediction } from "@/lib/api";
import type { PredictionResponse } from "@/types";

export type AnalysisStep =
  | "idle"
  | "reading"
  | "searching_news"
  | "checking_facts"
  | "reddit_scan"
  | "building_verdict"
  | "done"
  | "error";

export const STEP_LABELS: Record<AnalysisStep, string> = {
  idle:            "",
  reading:         "Reading the claim…",
  searching_news:  "Searching global AI news sources…",
  checking_facts:  "Querying fact-check databases…",
  reddit_scan:     "Scanning community discussions…",
  building_verdict:"Building verdict from evidence…",
  done:            "Analysis complete.",
  error:           "Analysis failed.",
};

const STEP_SEQUENCE: AnalysisStep[] = [
  "reading",
  "searching_news",
  "checking_facts",
  "reddit_scan",
  "building_verdict",
];

interface UseAnalyzeState {
  data: PredictionResponse | null;
  loading: boolean;
  step: AnalysisStep;
  error: string | null;
}

export function useAnalyze() {
  const [state, setState] = useState<UseAnalyzeState>({
    data: null,
    loading: false,
    step: "idle",
    error: null,
  });

  const analyze = useCallback(async (text: string) => {
    setState({ data: null, loading: true, step: "reading", error: null });

    // Animate through fake progress steps while the real request runs
    let stepIndex = 0;
    const stepInterval = setInterval(() => {
      stepIndex++;
      if (stepIndex < STEP_SEQUENCE.length) {
        setState((prev) => ({ ...prev, step: STEP_SEQUENCE[stepIndex] }));
      } else {
        clearInterval(stepInterval);
      }
    }, 900);

    try {
      const result = await analyzePrediction(text);
      clearInterval(stepInterval);
      setState({ data: result, loading: false, step: "done", error: null });
    } catch (err) {
      clearInterval(stepInterval);
      setState({
        data: null,
        loading: false,
        step: "error",
        error: err instanceof Error ? err.message : "Unknown error",
      });
    }
  }, []);

  const reset = useCallback(() => {
    setState({ data: null, loading: false, step: "idle", error: null });
  }, []);

  return { ...state, analyze, reset };
}

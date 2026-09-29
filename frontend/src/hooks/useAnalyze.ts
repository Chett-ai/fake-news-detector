"use client";

import { useState, useCallback } from "react";
import { analyzePrediction } from "@/lib/api";
import type { PredictionResponse } from "@/types";

interface UseAnalyzeState {
  data: PredictionResponse | null;
  loading: boolean;
  error: string | null;
}

export function useAnalyze() {
  const [state, setState] = useState<UseAnalyzeState>({
    data: null,
    loading: false,
    error: null,
  });

  const analyze = useCallback(async (text: string) => {
    setState({ data: null, loading: true, error: null });

    try {
      const result = await analyzePrediction(text);
      setState({ data: result, loading: false, error: null });
    } catch (err) {
      setState({
        data: null,
        loading: false,
        error: err instanceof Error ? err.message : "Unknown error",
      });
    }
  }, []);

  const reset = useCallback(() => {
    setState({ data: null, loading: false, error: null });
  }, []);

  return { ...state, analyze, reset };
}

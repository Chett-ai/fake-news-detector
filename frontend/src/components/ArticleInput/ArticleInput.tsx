"use client";

import { useRef, useState, useEffect } from "react";
import styles from "./ArticleInput.module.css";
import type { AnalysisStep } from "@/hooks/useAnalyze";
import { STEP_LABELS } from "@/hooks/useAnalyze";

interface Props {
  value?: string;
  onChange?: (val: string) => void;
  onAnalyze: (text: string) => void;
  onClear: () => void;
  loading: boolean;
  step?: AnalysisStep;
}

const STEP_ORDER: AnalysisStep[] = [
  "reading",
  "searching_news",
  "checking_facts",
  "reddit_scan",
  "building_verdict",
];

// Placeholder examples rotating for the AI domain
const PLACEHOLDERS = [
  "Paste an AI news article or claim to verify…",
  "e.g. OpenAI GPT-5 achieves AGI benchmarks…",
  "e.g. Google DeepMind shuts down Gemini project…",
  "e.g. New study shows LLMs are sentient…",
];

export default function ArticleInput({
  value,
  onChange,
  onAnalyze,
  onClear,
  loading,
  step = "idle",
}: Props) {
  const [internalText, setInternalText] = useState("");
  const [placeholderIdx, setPlaceholderIdx] = useState(0);
  const text = value !== undefined ? value : internalText;
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Set random placeholder index ONLY after client hydration completes
  useEffect(() => {
    setPlaceholderIdx(Math.floor(Math.random() * PLACEHOLDERS.length));
  }, []);

  const handleChange = (val: string) => {
    onChange ? onChange(val) : setInternalText(val);
  };

  const handleAnalyze = () => {
    if (!text.trim() || loading) return;
    onAnalyze(text.trim());
  };

  const handleClear = () => {
    handleChange("");
    textareaRef.current?.focus();
    onClear();
  };

  const currentStepIdx = STEP_ORDER.indexOf(step);
  const progressPct = loading
    ? Math.round(((currentStepIdx + 1) / STEP_ORDER.length) * 100)
    : step === "done"
    ? 100
    : 0;

  return (
    <section className={styles.section} id="analyze">
      {/* Label row */}
      <div className={styles.label}>
        <span>ARTICLE / CLAIM</span>
        <span className={styles.charCount}>{text.length} chars</span>
      </div>

      {/* Textarea */}
      <textarea
        ref={textareaRef}
        className={styles.textarea}
        value={text}
        onChange={(e) => handleChange(e.target.value)}
        onKeyDown={(e) => { if (e.ctrlKey && e.key === "Enter") handleAnalyze(); }}
        placeholder={PLACEHOLDERS[placeholderIdx]}
        spellCheck={false}
        disabled={loading}
        rows={6}
      />

      {/* Analysis progress — shown while loading */}
      {loading && (
        <div className={styles.progressBlock}>
          {/* Step label */}
          <div className={styles.stepRow}>
            <span className={styles.stepDot} />
            <span className={styles.stepLabel}>{STEP_LABELS[step]}</span>
          </div>

          {/* Steps pipeline */}
          <div className={styles.pipeline}>
            {STEP_ORDER.map((s, idx) => {
              const done = idx < currentStepIdx;
              const active = idx === currentStepIdx;
              return (
                <div
                  key={s}
                  className={`${styles.pipeStep} ${done ? styles.pipeStepDone : ""} ${active ? styles.pipeStepActive : ""}`}
                >
                  <div className={styles.pipeIcon}>
                    {done ? "✓" : active ? <span className={styles.miniSpinner} /> : "·"}
                  </div>
                  <span className={styles.pipeName}>
                    {STEP_LABELS[s].replace("…", "")}
                  </span>
                </div>
              );
            })}
          </div>

          {/* Progress bar */}
          <div className={styles.progressBar}>
            <div
              className={styles.progressFill}
              style={{ width: `${progressPct}%` }}
            />
          </div>
        </div>
      )}

      {/* Hint row (only when not loading) */}
      {!loading && (
        <div className={styles.hint}>
          Tip: Press <kbd className={styles.kbd}>Ctrl</kbd> +{" "}
          <kbd className={styles.kbd}>Enter</kbd> to analyze
        </div>
      )}

      {/* Action buttons */}
      <div className={styles.actions}>
        <button
          className={styles.analyzeBtn}
          onClick={handleAnalyze}
          disabled={loading || !text.trim()}
        >
          {loading ? (
            <>
              <span className={styles.spinner} />
              Analyzing…
            </>
          ) : (
            <>◈ Verify AI Claim →</>
          )}
        </button>

        <button
          className={styles.clearBtn}
          onClick={handleClear}
          disabled={loading}
        >
          Clear
        </button>
      </div>
    </section>
  );
}

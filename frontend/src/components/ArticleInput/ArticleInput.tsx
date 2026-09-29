"use client";

import { useRef, useState } from "react";
import styles from "./ArticleInput.module.css";

interface Props {
  value?: string;
  onChange?: (val: string) => void;
  onAnalyze: (text: string) => void;
  onClear: () => void;
  loading: boolean;
}

export default function ArticleInput({
  value,
  onChange,
  onAnalyze,
  onClear,
  loading,
}: Props) {
  const [internalText, setInternalText] = useState("");
  const text = value !== undefined ? value : internalText;
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleTextChange = (newVal: string) => {
    if (onChange) {
      onChange(newVal);
    } else {
      setInternalText(newVal);
    }
  };

  const handleAnalyze = () => {
    if (!text.trim()) return;
    onAnalyze(text.trim());
  };

  const handleClear = () => {
    handleTextChange("");
    textareaRef.current?.focus();
    onClear();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.ctrlKey && e.key === "Enter") handleAnalyze();
  };

  return (
    <section className={styles.section}>
      <div className={styles.label}>
        <span>ARTICLE CONTENT</span>
        <span className={styles.charCount}>{text.length} characters</span>
      </div>

      <textarea
        ref={textareaRef}
        className={styles.textarea}
        value={text}
        onChange={(e) => handleTextChange(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="Paste the full news article or claim here…"
        spellCheck={false}
        disabled={loading}
      />

      <div className={styles.hint}>
        Tip: Press <kbd className={styles.kbd}>Ctrl</kbd> +{" "}
        <kbd className={styles.kbd}>Enter</kbd> to analyze
      </div>

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
            <>
              <span>✦</span>
              Analyze News
              <span>→</span>
            </>
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

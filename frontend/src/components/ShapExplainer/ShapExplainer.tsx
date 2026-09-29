"use client";

import styles from "./ShapExplainer.module.css";
import type { ShapWord } from "@/types";

interface Props {
  shapWords: ShapWord[];
  available: boolean;
}

export default function ShapExplainer({ shapWords, available }: Props) {
  if (!available || !shapWords || shapWords.length === 0) {
    return null;
  }

  const maxImpact = Math.max(...shapWords.map((w: ShapWord) => w.shap), 0.001);

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div>
          <span className={styles.tag}>SECONDARY LINGUISTIC PATTERN ANALYSIS</span>
          <h3 className={styles.title}>SHAP Word Importance (Stylistic Feature Attribution)</h3>
          <p className={styles.subtitle}>
            Notice: This breakdown shows tokens associated with sensationalized vs standard headline style. It measures <strong>formatting pattern</strong>, NOT factual truth.
          </p>
        </div>
        <div className={styles.legend}>
          <span className={styles.legendItem}>
            <span className={`${styles.dot} ${styles.fakeDot}`} />
            Sensational Pattern
          </span>
          <span className={styles.legendItem}>
            <span className={`${styles.dot} ${styles.realDot}`} />
            Standard Pattern
          </span>
        </div>
      </div>

      <div className={styles.chart}>
        {shapWords.map((item: ShapWord, idx: number) => {
          const isFake = item.direction === "FAKE";
          const barWidth = Math.min(100, Math.round((item.shap / maxImpact) * 100));

          return (
            <div key={`${item.word}-${idx}`} className={styles.row}>
              <span className={styles.wordLabel} title={item.word}>
                {item.word}
              </span>
              <div className={styles.track}>
                <div
                  className={`${styles.bar} ${isFake ? styles.barFake : styles.barReal}`}
                  style={{ width: `${barWidth}%` }}
                />
              </div>
              <span className={styles.score}>
                {item.raw_shap > 0 ? "+" : ""}
                {item.raw_shap.toFixed(3)}
              </span>
            </div>
          );
        })}
      </div>

      <div className={styles.tokenSection}>
        <div className={styles.tokenHeading}>Lexical Feature Attribution Signals</div>
        <div className={styles.tokens}>
          {shapWords.map((item: ShapWord, idx: number) => (
            <span
              key={idx}
              className={`${styles.token} ${
                item.direction === "FAKE" ? styles.tokenFake : styles.tokenReal
              }`}
              title={`Impact: ${item.raw_shap.toFixed(4)} (${item.direction})`}
            >
              {item.word} ({item.direction === "FAKE" ? "Sensational" : "Standard"})
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

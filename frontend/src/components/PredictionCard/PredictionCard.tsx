"use client";

import { useEffect, useRef } from "react";
import styles from "./PredictionCard.module.css";
import type { PredictionResponse } from "@/types";

interface Props {
  data: PredictionResponse;
}

export default function PredictionCard({ data }: Props) {
  const { prediction, confidence, final_truth_status, research_dossier } = data;
  const fillRef = useRef<HTMLDivElement>(null);

  // Real world truth status takes priority over offline ML
  const truthStatus = final_truth_status || (research_dossier?.research_verdict === "CORROBORATED" ? "REAL" : prediction);

  const isReal = truthStatus === "REAL";
  const isFake = truthStatus === "FAKE";
  const isDisputed = truthStatus === "DISPUTED" || truthStatus === "MIXED";

  // Animate bar after mount
  useEffect(() => {
    const timer = setTimeout(() => {
      if (fillRef.current) {
        fillRef.current.style.width = `${Math.min(confidence, 100)}%`;
      }
    }, 80);
    return () => clearTimeout(timer);
  }, [confidence]);

  const icon = isReal ? "✓" : isFake ? "✕" : isDisputed ? "⚠" : "?";
  const iconClass = isReal
    ? styles.iconReal
    : isFake
    ? styles.iconFake
    : isDisputed
    ? styles.iconDisputed
    : styles.iconUnknown;

  const predClass = isReal
    ? styles.labelReal
    : isFake
    ? styles.labelFake
    : isDisputed
    ? styles.labelDisputed
    : "";

  const barClass = isReal ? styles.barReal : isFake ? styles.barFake : styles.barUnknown;

  const displayVerdict = isReal
    ? "REAL NEWS"
    : isFake
    ? "FAKE / DEBUNKED"
    : isDisputed
    ? "DISPUTED / CONFLICTING"
    : "UNVERIFIED CLAIM";

  return (
    <section className={styles.card}>
      <div className={styles.header}>
        <span className={styles.sectionLabel}>REAL-WORLD VERIFICATION STATUS</span>
        <span className={styles.live}>
          <span className={styles.statusDot} />
          LIVE VERIFIED
        </span>
      </div>

      {/* Verdict row */}
      <div className={styles.resultRow}>
        <div className={`${styles.icon} ${iconClass}`}>{icon}</div>

        <div className={styles.predictionArea}>
          <div className={styles.predLabel}>EVIDENCE-BACKED VERDICT</div>
          <div className={`${styles.prediction} ${predClass}`}>
            {displayVerdict}
          </div>
          {research_dossier?.summary && (
            <div className={styles.verdictSubtext}>
              {research_dossier.summary}
            </div>
          )}
        </div>

        <div className={styles.confidenceArea}>
          <div className={styles.confLabel}>CONFIDENCE</div>
          <div className={styles.confValue}>{research_dossier?.confidence_level || "Active"}</div>
          <div className={styles.mlBadge}>ML Signal: {prediction} ({confidence.toFixed(1)}%)</div>
        </div>
      </div>

      {/* Confidence bar */}
      <div className={styles.barTrack}>
        <div
          ref={fillRef}
          className={`${styles.barFill} ${barClass}`}
          style={{ width: "0%" }}
        />
      </div>

      <p className={styles.disclaimer}>
        ✓ Verified by cross-referencing real-time coverage from accredited news publishers and institutional fact-check registries.
      </p>
    </section>
  );
}

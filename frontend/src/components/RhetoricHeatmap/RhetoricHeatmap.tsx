"use client";

import styles from "./RhetoricHeatmap.module.css";
import type { RhetoricAnalysis, TemporalAudit } from "@/types";

interface Props {
  rhetoric?: RhetoricAnalysis;
  temporal?: TemporalAudit;
}

export default function RhetoricHeatmap({ rhetoric, temporal }: Props) {
  if (!rhetoric && !temporal) return null;

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div className={styles.titleGroup}>
          <span className={styles.tag}>COGNITIVE & TEMPORAL AUDITING</span>
          <h3 className={styles.title}>Propaganda & Rhetorical Heatmap</h3>
        </div>
        {rhetoric && (
          <div
            className={`${styles.riskBadge} ${
              rhetoric.risk_level === "Severe"
                ? styles.riskSevere
                : rhetoric.risk_level === "Moderate"
                ? styles.riskModerate
                : styles.riskLow
            }`}
          >
            {rhetoric.risk_level} Manipulation Risk ({rhetoric.manipulation_score}/100)
          </div>
        )}
      </div>

      {temporal && temporal.temporal_mismatch_detected && (
        <div className={styles.temporalAlert}>
          <div className={styles.temporalIcon}>⏳</div>
          <div className={styles.temporalContent}>
            <div className={styles.temporalTitle}>Temporal Discrepancy Flag (Out-of-Context Recirculation)</div>
            <p className={styles.temporalNote}>{temporal.audit_note}</p>
          </div>
        </div>
      )}

      {rhetoric && rhetoric.detected_techniques && rhetoric.detected_techniques.length > 0 ? (
        <div className={styles.grid}>
          {rhetoric.detected_techniques.map((tech) => (
            <div
              key={tech.id}
              className={styles.card}
              style={{ borderLeftColor: tech.color }}
            >
              <div className={styles.cardTop}>
                <span className={styles.cardLabel} style={{ color: tech.color }}>
                  {tech.label}
                </span>
                <span className={styles.cardIntensity}>{tech.intensity} Intensity</span>
              </div>
              <p className={styles.cardDesc}>{tech.description}</p>
              <div className={styles.chips}>
                {tech.matched_words.map((w, idx) => (
                  <span
                    key={idx}
                    className={styles.chip}
                    style={{ backgroundColor: `${tech.color}18`, color: tech.color }}
                  >
                    "{w}"
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className={styles.cleanState}>
          ✨ No overt manipulative rhetoric or propaganda framing detected. Language maintains informational tone.
        </div>
      )}
    </div>
  );
}

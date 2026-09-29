"use client";

import { useState } from "react";
import styles from "./PredictionCard.module.css";
import type { PredictionResponse } from "@/types";

interface Props {
  data: PredictionResponse;
}

export default function PredictionCard({ data }: Props) {
  const [showLegacy, setShowLegacy] = useState(false);

  const {
    assessment,
    assessment_label,
    confidence_state,
    reasoning,
    ranked_sources,
    evidence_counts,
    linguistic_style_signal,
    disclaimer,
  } = data;

  const assessmentStyles: Record<string, { color: string; bg: string; border: string; icon: string }> = {
    CORROBORATED: {
      color: "#15803D",
      bg: "#F0FDF4",
      border: "#BBF7D0",
      icon: "✓",
    },
    CONTRADICTED: {
      color: "#B91C1C",
      bg: "#FEF2F2",
      border: "#FECACA",
      icon: "✕",
    },
    DISPUTED: {
      color: "#C2410C",
      bg: "#FFF7ED",
      border: "#FFEDD5",
      icon: "⚡",
    },
    INSUFFICIENT_EVIDENCE: {
      color: "#475569",
      bg: "#F8FAFC",
      border: "#E2E8F0",
      icon: "🔍",
    },
  };

  const style = assessmentStyles[assessment] || assessmentStyles["INSUFFICIENT_EVIDENCE"];

  return (
    <div className={styles.card}>
      {/* Comparison Toggle Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px", background: "#F1F5F9", padding: "8px 12px", borderRadius: "6px" }}>
        <span style={{ fontSize: "11px", fontWeight: 700, color: "#475569" }}>VERIFICATION PARADIGM VIEW</span>
        <button
          onClick={() => setShowLegacy(!showLegacy)}
          style={{
            background: showLegacy ? "#B91C1C" : "#7C3AED",
            color: "#FFFFFF",
            border: "none",
            borderRadius: "4px",
            padding: "4px 8px",
            fontSize: "10px",
            fontWeight: 700,
            cursor: "pointer",
          }}
        >
          {showLegacy ? " Switch to VERIFAI Ledger" : " Compare Legacy Binary Verdict (TruthLens)"}
        </button>
      </div>

      {showLegacy ? (
        <div style={{ background: "#FEF2F2", border: "2px solid #FECACA", borderRadius: "8px", padding: "20px", textAlign: "center", marginBottom: "16px" }}>
          <span style={{ fontSize: "10px", fontWeight: 800, color: "#991B1B", letterSpacing: "1px" }}>TRUTHLENS LEGACY BINARY OUTPUT</span>
          <h2 style={{ fontSize: "28px", fontWeight: 900, color: linguistic_style_signal?.prediction_class === "REAL" ? "#15803D" : "#B91C1C", margin: "8px 0" }}>
            {linguistic_style_signal?.prediction_class === "REAL" ? "REAL NEWS (84%)" : "FAKE NEWS (78%)"}
          </h2>
          <p style={{ fontSize: "12px", color: "#7F1D1D", background: "#FEE2E2", padding: "8px 12px", borderRadius: "6px", margin: "0 auto", maxWidth: "480px" }}>
            ⚠️ <strong>Hiding Uncertainty:</strong> This legacy binary classifier forces a single verdict on the claim and hides source credibility tiers, fact-check registries, and confidence gaps from the user.
          </p>
        </div>
      ) : null}

      {/* Epistemic Assessment Header */}
      <div
        className={styles.assessmentBanner}
        style={{
          backgroundColor: style.bg,
          borderColor: style.border,
        }}
      >
        <div className={styles.assessmentHeader}>
          <span className={styles.assessmentIcon} style={{ color: style.color }}>
            {style.icon}
          </span>
          <div>
            <span className={styles.assessmentBadge} style={{ color: style.color }}>
              EPISTEMIC ASSESSMENT &bull; {confidence_state.toUpperCase()}
            </span>
            <h2 className={styles.assessmentTitle} style={{ color: style.color }}>
              {assessment_label}
            </h2>
          </div>
        </div>

        <p className={styles.reasoning}>{reasoning}</p>

        {/* Evidence Tally Breakdown */}
        {evidence_counts && (
          <div className={styles.tallyGrid}>
            <div className={styles.tallyBox}>
              <span className={styles.tallyNum}>{evidence_counts.official_sources}</span>
              <span className={styles.tallyLabel}>Official Sources</span>
            </div>
            <div className={styles.tallyBox}>
              <span className={styles.tallyNum}>{evidence_counts.press_coverage}</span>
              <span className={styles.tallyLabel}>Tech Press Matches</span>
            </div>
            <div className={styles.tallyBox}>
              <span className={styles.tallyNum}>{evidence_counts.factcheck_hits}</span>
              <span className={styles.tallyLabel}>Fact-Check Records</span>
            </div>
            <div className={styles.tallyBox}>
              <span className={styles.tallyNum}>{evidence_counts.community_threads}</span>
              <span className={styles.tallyLabel}>Community Threads</span>
            </div>
          </div>
        )}
      </div>

      {/* Tiered Evidence Ledger */}
      <div className={styles.section}>
        <div className={styles.sectionHeader}>
          <h3 className={styles.sectionTitle}>Evaluated Evidence Ledger</h3>
          <span className={styles.sectionSubtitle}>
            Sources ranked by trust tier & entity match percentage
          </span>
        </div>

        {ranked_sources && ranked_sources.length > 0 ? (
          <div className={styles.sourceList}>
            {ranked_sources.map((item, idx) => (
              <div key={idx} className={styles.sourceCard}>
                <div className={styles.sourceTop}>
                  <span
                    className={styles.tierBadge}
                    style={{ backgroundColor: item.badge_color }}
                  >
                    {item.tier_label}
                  </span>
                  <span className={styles.matchScore}>
                    {item.match_score_pct}% Match
                  </span>
                </div>
                <h4 className={styles.sourceTitle}>
                  <a href={item.url} target="_blank" rel="noopener noreferrer">
                    {item.title} ↗
                  </a>
                </h4>
                <p className={styles.sourceSnippet}>{item.snippet}</p>
                <span className={styles.sourceName}>Publisher: {item.source}</span>
              </div>
            ))}
          </div>
        ) : (
          <div className={styles.noEvidenceState}>
            ℹ No matching articles found in official AI channels or major tech press outlets.
          </div>
        )}
      </div>

      {/* Secondary Scoped ML Stylometric Pattern Signal */}
      {linguistic_style_signal && (
        <div className={styles.styleSignalBox}>
          <div className={styles.styleHeader}>
            <span className={styles.styleTag}>SECONDARY LINGUISTIC SIGNAL</span>
            <span className={styles.styleMeta}>Stylometric Pattern Classifier</span>
          </div>
          <p className={styles.styleNote}>{linguistic_style_signal.note}</p>
          <div className={styles.styleBarRow}>
            <span className={styles.styleLabel}>
              Stylistic Framing Signal: <strong>{linguistic_style_signal.prediction_class}</strong>
            </span>
            <span className={styles.stylePct}>
              {linguistic_style_signal.confidence_pct}% Pattern Confidence
            </span>
          </div>
        </div>
      )}

      {/* Disclaimer */}
      <div className={styles.disclaimer}>{disclaimer}</div>
    </div>
  );
}

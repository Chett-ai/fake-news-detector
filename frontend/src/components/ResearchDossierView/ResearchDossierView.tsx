"use client";

import styles from "./ResearchDossierView.module.css";
import type { ResearchDossier, RedditThread, NewsConsensusItem } from "@/types";

interface Props {
  dossier: ResearchDossier;
  redditThreads?: RedditThread[];
  newsConsensus?: NewsConsensusItem[];
}

export default function ResearchDossierView({
  dossier,
  redditThreads = [],
  newsConsensus = [],
}: Props) {
  const getBadgeClass = (verdict: string) => {
    switch (verdict) {
      case "DEBUNKED":
        return styles.verdictDebunked;
      case "DISPUTED":
        return styles.verdictDisputed;
      case "CORROBORATED":
        return styles.verdictCorroborated;
      default:
        return styles.verdictNeutral;
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div>
          <span className={styles.tag}>ACADEMIC EVIDENCE SYNTHESIS</span>
          <h2 className={styles.title}>Multi-Source Context Dossier</h2>
        </div>
        <div className={`${styles.verdictBadge} ${getBadgeClass(dossier.research_verdict)}`}>
          {dossier.research_verdict}
        </div>
      </div>

      <p className={styles.summaryText}>{dossier.summary}</p>

      <div className={styles.statsGrid}>
        <div className={styles.statCard}>
          <div className={styles.statNumber}>{dossier.confidence_level}</div>
          <div className={styles.statLabel}>Confidence Level</div>
        </div>
        <div className={styles.statCard}>
          <div className={styles.statNumber}>{dossier.fact_checks_count}</div>
          <div className={styles.statLabel}>Institutional Checks</div>
        </div>
        <div className={styles.statCard}>
          <div className={styles.statNumber}>
            {dossier.news_consensus_count || newsConsensus.length}
          </div>
          <div className={styles.statLabel}>News Outlets Corroborating</div>
        </div>
      </div>

      {newsConsensus && newsConsensus.length > 0 && (
        <div className={styles.redditSection}>
          <h4 className={styles.subHeading}>🌐 Live Web News Consensus</h4>
          <div className={styles.threadList}>
            {newsConsensus.map((item, idx) => (
              <a
                key={idx}
                href={item.url}
                target="_blank"
                rel="noopener noreferrer"
                className={styles.threadCard}
              >
                <div className={styles.threadTop}>
                  <span className={styles.sourceTag}>{item.source}</span>
                  {item.debunk_flag && (
                    <span className={styles.debunkBadge}>⚠️ Debunk / Fact Check</span>
                  )}
                </div>
                <div className={styles.threadTitle}>{item.title}</div>
              </a>
            ))}
          </div>
        </div>
      )}

      {redditThreads && redditThreads.length > 0 && (
        <div className={styles.redditSection}>
          <h4 className={styles.subHeading}>💬 Public Reddit Community Threads</h4>
          <div className={styles.threadList}>
            {redditThreads.map((thread, idx) => (
              <a
                key={idx}
                href={thread.url}
                target="_blank"
                rel="noopener noreferrer"
                className={styles.threadCard}
              >
                <div className={styles.threadTop}>
                  <span className={styles.subreddit}>{thread.subreddit}</span>
                  {thread.debunk_flag && (
                    <span className={styles.debunkBadge}>⚠️ Community Debunk Flag</span>
                  )}
                  <span className={styles.score}>▲ {thread.score} upvotes</span>
                </div>
                <div className={styles.threadTitle}>{thread.title}</div>
                {thread.snippet && (
                  <p className={styles.threadSnippet}>"{thread.snippet}"</p>
                )}
              </a>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

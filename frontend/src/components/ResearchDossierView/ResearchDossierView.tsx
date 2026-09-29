"use client";

import styles from "./ResearchDossierView.module.css";
import type { CommunitySentiment } from "@/types";

interface Props {
  communitySentiment?: CommunitySentiment;
}

export default function ResearchDossierView({ communitySentiment }: Props) {
  if (!communitySentiment || !communitySentiment.threads || communitySentiment.threads.length === 0) {
    return null;
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div className={styles.titleGroup}>
          <span className={styles.tag}>COMMUNITY DISCUSSIONS</span>
          <h3 className={styles.title}>Public Sentiment &amp; Forum Context</h3>
          <p className={styles.subtitle}>
            ⚠️ <strong>Non-Evidentiary Note:</strong> Forum threads show public discussion volume and sentiment. They do not constitute factual verification.
          </p>
        </div>
        <span className={styles.countBadge}>
          {communitySentiment.thread_count} Reddit Threads
        </span>
      </div>

      <div className={styles.threadList}>
        {communitySentiment.threads.map((thread, idx) => (
          <div key={idx} className={styles.threadCard}>
            <div className={styles.threadTop}>
              <span className={styles.subBadge}>{thread.subreddit}</span>
              <span className={styles.upvotes}>▲ {thread.upvotes} Upvotes</span>
            </div>
            <h4 className={styles.threadTitle}>
              <a href={thread.url} target="_blank" rel="noopener noreferrer">
                {thread.title} ↗
              </a>
            </h4>
            {thread.snippet && (
              <p className={styles.threadSnippet}>{thread.snippet}</p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

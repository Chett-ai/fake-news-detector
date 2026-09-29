import styles from "./FactCheckSection.module.css";
import type { DirectFactCheck } from "@/types";

interface Props {
  directChecks: DirectFactCheck[];
  relatedChecks: DirectFactCheck[];
  status?: string;
  message?: string;
}

export default function FactCheckSection({
  directChecks,
  relatedChecks,
  status,
  message,
}: Props) {
  const allChecks = [...(directChecks || []), ...(relatedChecks || [])];

  if (allChecks.length === 0 && !message) {
    return null;
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h3 className={styles.heading}>🔍 Institutional Fact-Checking Registry</h3>
        {status && (
          <span
            className={`${styles.statusBadge} ${
              status === "CONTRADICTED"
                ? styles.statusContradicted
                : status === "CORROBORATED"
                ? styles.statusCorroborated
                : styles.statusUnverified
            }`}
          >
            {status}
          </span>
        )}
      </div>

      {message && <p className={styles.message}>{message}</p>}

      {allChecks.length > 0 && (
        <div className={styles.grid}>
          {allChecks.map((item, idx) => (
            <div key={idx} className={styles.card}>
              <div className={styles.cardHeader}>
                <span className={styles.publisher}>{item.publisher}</span>
                <span
                  className={`${styles.ratingBadge} ${
                    item.interpretation === "CONTRADICTED"
                      ? styles.ratingFake
                      : styles.ratingReal
                  }`}
                >
                  {item.rating}
                </span>
              </div>
              <p className={styles.claim}>"{item.claim_text}"</p>
              {item.claimant && (
                <span className={styles.claimant}>Claimant: {item.claimant}</span>
              )}
              {item.url && (
                <a
                  href={item.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={styles.link}
                >
                  Read full debunk ↗
                </a>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

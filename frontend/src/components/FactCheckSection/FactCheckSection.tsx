import styles from "./FactCheckSection.module.css";
import type { FactCheckItem, VerificationStatus } from "@/types";

interface Props {
  directChecks: FactCheckItem[];
  relatedChecks: FactCheckItem[];
  status?: VerificationStatus;
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
        <h3 className={styles.heading}>🔍 Fact-Checking Verification</h3>
        {status && (
          <span
            className={`${styles.statusBadge} ${
              status === "CONTRADICTED"
                ? styles.statusContradicted
                : status === "VERIFIED"
                ? styles.statusVerified
                : styles.statusNeutral
            }`}
          >
            {status}
          </span>
        )}
      </div>

      {message && <p className={styles.message}>{message}</p>}

      {allChecks.length > 0 && (
        <div className={styles.list}>
          {allChecks.map((claim, idx) => (
            <div key={idx} className={styles.item}>
              <div className={styles.claimHeader}>
                <span className={styles.claimant}>
                  {claim.publisher || "Fact Check Publisher"}
                </span>
                {claim.rating && (
                  <span className={styles.ratingBadge}>{claim.rating}</span>
                )}
              </div>
              <p className={styles.claimText}>"{claim.claim}"</p>
              {claim.url && (
                <a
                  href={claim.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={styles.link}
                >
                  Read full review on {claim.publisher || "source"} →
                </a>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

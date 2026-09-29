"use client";

import styles from "./Navbar.module.css";

export default function Navbar() {
  return (
    <header className={styles.header}>
      <nav className={styles.nav}>
        {/* Left */}
        <div className={styles.left}>
          <button className={styles.menuBtn} aria-label="All topics">
            <span className={styles.menuLine} />
            <span className={styles.menuLine} />
            <span className={styles.menuLine} />
          </button>
          <span className={styles.topicsLabel}>AI News</span>
        </div>

        {/* Center brand */}
        <div className={styles.brand}>
          <span className={styles.brandIcon}>◈</span>
          <span className={styles.brandName}>VERIFAI</span>
        </div>

        {/* Right */}
        <div className={styles.right}>
          <span className={styles.domainTag}>AI News Verification</span>
          <a href="#analyze" className={styles.ctaBtn}>
            Verify a Claim
          </a>
        </div>
      </nav>

      {/* Breadcrumb */}
      <div className={styles.breadcrumb}>
        <span>Home</span>
        <span className={styles.sep}>•</span>
        <span>AI Developments</span>
        <span className={styles.sep}>•</span>
        <span className={styles.active}>Real-Time Fact Check</span>
      </div>
    </header>
  );
}

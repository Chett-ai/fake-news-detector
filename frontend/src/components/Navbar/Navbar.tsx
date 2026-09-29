import styles from "./Navbar.module.css";

export default function Navbar() {
  return (
    <nav className={styles.nav}>
      <div className={styles.inner}>
        <div className={styles.brand}>
          <span className={styles.logo}>🔍</span>
          <span className={styles.name}>TruthLens</span>
          <span className={styles.tagline}>AI News Analysis</span>
        </div>

        <div className={styles.badges}>
          <span className={styles.badge}>
            <span className={styles.dot} />
            LIVE
          </span>
          <span className={styles.badgeNeutral}>AI-Powered</span>
        </div>
      </div>
    </nav>
  );
}

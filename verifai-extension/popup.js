/**
 * VerifAI Chrome Extension — Popup Controller (popup.js)
 * Handles manual input verification and renders recent checks from chrome.storage.local.
 */

document.addEventListener("DOMContentLoaded", () => {
  const claimInput = document.getElementById("claim-input");
  const verifyBtn = document.getElementById("verify-btn");
  const resultContainer = document.getElementById("result-container");
  const recentList = document.getElementById("recent-list");
  const clearCacheBtn = document.getElementById("clear-cache-btn");

  // Clear Cache Button Handler
  if (clearCacheBtn) {
    clearCacheBtn.addEventListener("click", () => {
      chrome.runtime.sendMessage({ action: "CLEAR_CACHE" }, () => {
        resultContainer.innerHTML = "";
        loadRecentChecks();
      });
    });
  }

  // Load Recent Checks
  loadRecentChecks();

  verifyBtn.addEventListener("click", () => {
    const claim = claimInput.value.trim();
    if (!claim) return;

    verifyBtn.disabled = true;
    verifyBtn.textContent = "Analyzing Evidence…";
    resultContainer.innerHTML = `
      <div style="text-align: center; padding: 12px; color: #64748B; font-size: 12px;">
        Evaluating evidence across official & press sources…
      </div>
    `;

    chrome.runtime.sendMessage(
      { action: "VERIFY_CLAIM", claim },
      (res) => {
        verifyBtn.disabled = false;
        verifyBtn.textContent = "◈ Verify Evidence Ledger";

        if (res && res.success) {
          renderPopupResult(res.data);
          loadRecentChecks();
        } else {
          resultContainer.innerHTML = `
            <div style="color: #B91C1C; padding: 10px; font-size: 11px; background: #FEE2E2; border-radius: 6px;">
              ⚠ Verification Error: ${res?.error || "Could not connect to backend."}
            </div>
          `;
        }
      }
    );
  });

  let currentPopupData = null;
  let isPopupLegacyView = false;

  function renderPopupResult(data) {
    currentPopupData = data;
    const assessment = data.assessment || "INSUFFICIENT_EVIDENCE";
    const sources = data.sources || [];
    const styleSignal = data.style_signal;

    const legacyLabel = styleSignal?.prediction_class === "REAL" || assessment === "CORROBORATED" ? "TRUE (84%)" : "FAKE (78%)";
    const legacyBg = styleSignal?.prediction_class === "REAL" || assessment === "CORROBORATED" ? "#DCFCE7" : "#FEE2E2";
    const legacyColor = styleSignal?.prediction_class === "REAL" || assessment === "CORROBORATED" ? "#15803D" : "#B91C1C";

    resultContainer.innerHTML = `
      <div style="background: #FFFFFF; border: 1px solid #E2E8F0; border-radius: 8px; padding: 12px; margin-top: 10px; display: flex; flex-direction: column; gap: 8px;">
        <div style="display: flex; justify-content: space-between; align-items: center;">
          <span class="badge-sm badge-${assessment}">${assessment.replace("_", " ")}</span>
          <button id="popup-toggle-legacy" style="background: #3B82F6; color: white; border: none; padding: 2px 6px; font-size: 9px; font-weight: 700; border-radius: 4px; cursor: pointer;">
            ${isPopupLegacyView ? "✦ VERIFAI Ledger" : "⚡ Legacy View"}
          </button>
        </div>

        ${
          isPopupLegacyView
            ? `
          <div style="background: ${legacyBg}; border: 1px solid ${legacyColor}; border-radius: 6px; padding: 10px; text-align: center;">
            <div style="font-size: 8px; font-weight: 800; color: ${legacyColor};">TRUTHLENS LEGACY VERDICT</div>
            <div style="font-size: 16px; font-weight: 900; color: ${legacyColor}; margin: 2px 0;">${legacyLabel}</div>
            <div style="font-size: 9px; color: #475569;">⚠️ Naive binary output hiding source trust & evidence tiers.</div>
          </div>
        `
            : `
          <div style="font-size: 11px; color: #334155; line-height: 1.4;">${data.reasoning || ""}</div>
          ${
            sources.length > 0
              ? `
            <div style="font-size: 10px; font-weight: 700; color: #64748B; margin-top: 4px;">TOP EVIDENCE SOURCES</div>
            ${sources
              .slice(0, 2)
              .map(
                (s) => `
              <div style="font-size: 11px;">
                <a href="${s.url}" target="_blank" rel="noopener" style="color: #1E2B78; font-weight: 600;">${s.title} ↗</a>
                <span style="font-size: 9px; color: #7C3AED; font-weight: 700;"> (${Math.round(s.match_score * 100)}% match)</span>
              </div>
            `
              )
              .join("")}
          `
              : ""
          }
        `
        }
      </div>
    `;

    document.getElementById("popup-toggle-legacy")?.addEventListener("click", () => {
      isPopupLegacyView = !isPopupLegacyView;
      renderPopupResult(currentPopupData);
    });
  }

  function loadRecentChecks() {
    chrome.storage.local.get(["recent_checks"], (res) => {
      const recent = res.recent_checks || [];
      if (recent.length === 0) {
        recentList.innerHTML = `<div style="font-size: 11px; color: #94A3B8;">No recent checks found.</div>`;
        return;
      }

      recentList.innerHTML = recent
        .map(
          (item) => `
        <div class="recent-item" data-claim="${encodeURIComponent(item.claim)}">
          <span class="recent-text" title="${item.claim}">${item.claim}</span>
          <span class="badge-sm badge-${item.assessment}">${item.assessment.slice(0, 4)}</span>
        </div>
      `
        )
        .join("");

      // Allow clicking recent check to re-verify
      document.querySelectorAll(".recent-item").forEach((el) => {
        el.addEventListener("click", () => {
          const claim = decodeURIComponent(el.getAttribute("data-claim"));
          claimInput.value = claim;
          verifyBtn.click();
        });
      });
    });
  }
});

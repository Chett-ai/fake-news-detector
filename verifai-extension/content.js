/**
 * VerifAI Chrome Extension — Content Script (content.js)
 * Listens for background messages to inject/render a floating evidence card near user selection.
 */

let cardInstance = null;

// Esc Key Listener to dismiss card
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape" && cardInstance) {
    dismissCard();
  }
});

// Click outside listener
document.addEventListener("mousedown", (e) => {
  if (cardInstance && !cardInstance.contains(e.target)) {
    dismissCard();
  }
});

function dismissCard() {
  if (cardInstance) {
    cardInstance.remove();
    cardInstance = null;
  }
}

// Get bounding rectangle of user selection to position card near text
function getSelectionPosition() {
  const sel = window.getSelection();
  if (sel && sel.rangeCount > 0) {
    const range = sel.getRangeAt(0);
    const rect = range.getBoundingClientRect();
    return {
      top: rect.bottom + window.scrollY + 8,
      left: Math.max(10, rect.left + window.scrollX - 40),
    };
  }
  return { top: window.scrollY + 100, left: window.scrollX + 100 };
}

// Create or reset container card
function getOrCreateCard() {
  if (!cardInstance) {
    cardInstance = document.createElement("div");
    cardInstance.id = "verifai-floating-card-root";
    document.body.appendChild(cardInstance);
  }
  const pos = getSelectionPosition();
  cardInstance.style.top = `${pos.top}px`;
  cardInstance.style.left = `${pos.left}px`;
  return cardInstance;
}

// Render Loading Skeleton State
function renderLoading(claim) {
  const card = getOrCreateCard();
  card.innerHTML = `
    <div class="verifai-card-header">
      <div class="verifai-brand">◈ VERIFAI LEDGER</div>
      <button class="verifai-close-btn" aria-label="Close" id="verifai-close">✕</button>
    </div>
    <div class="verifai-card-body">
      <div class="verifai-loading-box">
        <div class="verifai-spinner"></div>
        <span>Evaluating evidence for claim…</span>
      </div>
    </div>
  `;
  document.getElementById("verifai-close")?.addEventListener("click", dismissCard);
}

// Render Result Evidence Card
function renderResult(data) {
  const card = getOrCreateCard();
  let isLegacyView = false;

  function updateCardHTML() {
    const assessment = data.assessment || "INSUFFICIENT_EVIDENCE";
    const confidence = data.confidence || "low-evidence";
    const sources = data.sources || [];
    const communityThreads = data.community_threads || [];
    const styleSignal = data.style_signal;

    const legacyLabel = styleSignal?.prediction_class === "REAL" || assessment === "CORROBORATED" ? "TRUE (84%)" : "FAKE (78%)";
    const legacyBg = styleSignal?.prediction_class === "REAL" || assessment === "CORROBORATED" ? "#DCFCE7" : "#FEE2E2";
    const legacyColor = styleSignal?.prediction_class === "REAL" || assessment === "CORROBORATED" ? "#15803D" : "#B91C1C";

    card.innerHTML = `
      <div class="verifai-card-header">
        <div class="verifai-brand">◈ VERIFAI LEDGER</div>
        <div style="display: flex; gap: 8px; align-items: center;">
          <button class="verifai-toggle-btn" id="verifai-toggle-view" style="font-size: 10px; padding: 2px 6px; background: #3B82F6; color: white; border: none; border-radius: 4px; cursor: pointer; font-weight: 600;">
            ${isLegacyView ? "✦ VERIFAI Ledger" : "⚡ Legacy View"}
          </button>
          <button class="verifai-close-btn" aria-label="Close" id="verifai-close">✕</button>
        </div>
      </div>
      <div class="verifai-card-body">
        ${
          isLegacyView
            ? `
          <div style="background: ${legacyBg}; border: 1px solid ${legacyColor}; border-radius: 6px; padding: 12px; text-align: center;">
            <div style="font-size: 9px; font-weight: 800; color: ${legacyColor}; letter-spacing: 0.5px;">TRUTHLENS LEGACY BINARY VERDICT</div>
            <div style="font-size: 20px; font-weight: 900; color: ${legacyColor}; margin: 4px 0;">${legacyLabel}</div>
            <div style="font-size: 10px; color: #475569; margin-top: 4px;">⚠️ Hides multi-source evidence, fact-check registries, and source trust tiers.</div>
          </div>
        `
            : `
          <!-- Assessment Badge -->
          <div>
            <span class="verifai-badge verifai-badge-${assessment}">
              ${assessment.replace("_", " ")} • ${confidence.toUpperCase()}
            </span>
          </div>
          
          <p class="verifai-reasoning">${data.reasoning || ""}</p>

          <!-- Tiered Evidence Sources -->
          ${
            sources.length > 0
              ? `
            <div>
              <div class="verifai-sources-title">Evaluated Sources</div>
              <div style="display: flex; flex-direction: column; gap: 6px;">
                ${sources
                  .map(
                    (s) => `
                  <div class="verifai-source-item">
                    <div class="verifai-source-top">
                      <span class="verifai-tier-chip verifai-chip-${s.tier}">${s.tier_label}</span>
                      <span class="verifai-match-pct">${Math.round(s.match_score * 100)}% Match</span>
                    </div>
                    <a href="${s.url}" target="_blank" rel="noopener" class="verifai-source-link">${s.title} ↗</a>
                  </div>
                `
                  )
                  .join("")}
              </div>
            </div>
          `
              : `<div style="font-size: 11px; color: #64748B;">No official or press articles corroborated this claim.</div>`
          }

          <!-- Isolated Community Discussions Accordion -->
          ${
            communityThreads.length > 0
              ? `
            <div class="verifai-community-accordion">
              <button class="verifai-accordion-toggle" id="verifai-acc-toggle">
                <span>💬 Public Discussions (${communityThreads.length})</span>
                <span id="verifai-acc-arrow">▼</span>
              </button>
              <div class="verifai-accordion-content" id="verifai-acc-body" style="display: none;">
                <div style="font-size: 10px; color: #C2410C; font-weight: 600;">⚠️ Non-Evidentiary Note: Forum discussions reflect volume, not factual truth.</div>
                ${communityThreads
                  .slice(0, 3)
                  .map(
                    (t) => `
                  <div>
                    <a href="${t.url}" target="_blank" rel="noopener" style="color: #1E2B78; font-weight: 600;">${t.title}</a>
                    <div style="font-size: 10px; color: #64748B;">${t.subreddit || "Reddit"} • ${t.upvotes || 0} upvotes</div>
                  </div>
                `
                  )
                  .join("")}
              </div>
            </div>
          `
              : ""
          }

          <!-- Stylometric Secondary Signal -->
          ${
            styleSignal
              ? `
            <div class="verifai-style-box">
              <div class="verifai-style-title">Secondary Linguistic Signal</div>
              <div>Framing Signal: <strong>${styleSignal.prediction_class}</strong> (${styleSignal.confidence_pct}% pattern confidence)</div>
              <div class="verifai-style-disclaimer">${styleSignal.disclaimer}</div>
            </div>
          `
              : ""
          }
        `
        }
      </div>
    `;

    document.getElementById("verifai-close")?.addEventListener("click", dismissCard);
    
    document.getElementById("verifai-toggle-view")?.addEventListener("click", () => {
      isLegacyView = !isLegacyView;
      updateCardHTML();
    });

    // Accordion Toggle Logic
    const accToggle = document.getElementById("verifai-acc-toggle");
    const accBody = document.getElementById("verifai-acc-body");
    const accArrow = document.getElementById("verifai-acc-arrow");

    accToggle?.addEventListener("click", () => {
      const isHidden = accBody.style.display === "none";
      accBody.style.display = isHidden ? "flex" : "none";
      accArrow.textContent = isHidden ? "▲" : "▼";
    });
  }

  updateCardHTML();
}

// Listen for messages from background service worker
chrome.runtime.onMessage.addListener((msg) => {
  if (msg.action === "SHOW_LOADING") {
    renderLoading(msg.claim);
  } else if (msg.action === "SHOW_RESULT") {
    renderResult(msg.data);
  } else if (msg.action === "SHOW_ERROR") {
    const card = getOrCreateCard();
    card.innerHTML = `
      <div class="verifai-card-header">
        <div class="verifai-brand">◈ VERIFAI LEDGER</div>
        <button class="verifai-close-btn" id="verifai-close">✕</button>
      </div>
      <div class="verifai-card-body" style="color: #B91C1C;">
        ⚠ Error: ${msg.error}
      </div>
    `;
    document.getElementById("verifai-close")?.addEventListener("click", dismissCard);
  }
});

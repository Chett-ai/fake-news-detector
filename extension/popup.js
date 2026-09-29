const API_ENDPOINT = "http://127.0.0.1:5000/predict";

document.addEventListener("DOMContentLoaded", () => {
  const claimInput = document.getElementById("claimInput");
  const verifyBtn = document.getElementById("verifyBtn");
  const btnText = document.getElementById("btnText");
  const btnSpinner = document.getElementById("btnSpinner");
  const results = document.getElementById("results");
  const errorBox = document.getElementById("errorBox");

  const verdictBadge = document.getElementById("verdictBadge");
  const confidenceScore = document.getElementById("confidenceScore");
  const verdictSummary = document.getElementById("verdictSummary");
  const temporalAlert = document.getElementById("temporalAlert");
  const riskBadge = document.getElementById("riskBadge");
  const rhetoricChips = document.getElementById("rhetoricChips");
  const shapBars = document.getElementById("shapBars");
  const redditList = document.getElementById("redditList");
  const factCheckList = document.getElementById("factCheckList");

  // Check if text was queued from right-click context menu
  if (chrome.storage && chrome.storage.local) {
    chrome.storage.local.get(["pendingVerification"], (res) => {
      if (res && res.pendingVerification) {
        claimInput.value = res.pendingVerification;
        chrome.storage.local.remove(["pendingVerification"]);
        runVerification(res.pendingVerification);
      }
    });
  }

  verifyBtn.addEventListener("click", () => {
    const text = claimInput.value.trim();
    if (!text) return;
    runVerification(text);
  });

  async function runVerification(text) {
    results.classList.add("hidden");
    errorBox.classList.add("hidden");
    btnText.textContent = "Analyzing Context...";
    btnSpinner.classList.remove("hidden");
    verifyBtn.disabled = true;

    try {
      const response = await fetch(API_ENDPOINT, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text })
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || "Verification failed");
      }

      displayResults(data);
    } catch (err) {
      errorBox.textContent = `⚠️ Error: ${err.message || "Could not reach TruthLens local backend at :5000"}`;
      errorBox.classList.remove("hidden");
    } finally {
      btnText.textContent = "Verify Claim & Gather Context";
      btnSpinner.classList.add("hidden");
      verifyBtn.disabled = false;
    }
  }

  function displayResults(data) {
    results.classList.remove("hidden");

    // Verdict and summary from research dossier
    const dossier = data.research_dossier || {};
    const verdict = dossier.research_verdict || data.prediction || "UNKNOWN";
    verdictBadge.textContent = verdict;
    confidenceScore.textContent = `Confidence: ${data.confidence || 0}%`;
    verdictSummary.textContent = dossier.summary || data.disclaimer || "";

    if (verdict === "DEBUNKED" || verdict === "FAKE") {
      verdictBadge.style.background = "rgba(244, 63, 94, 0.2)";
      verdictBadge.style.color = "#fda4af";
      verdictBadge.style.border = "1px solid rgba(244, 63, 94, 0.4)";
    } else if (verdict === "CORROBORATED" || verdict === "REAL") {
      verdictBadge.style.background = "rgba(16, 185, 129, 0.2)";
      verdictBadge.style.color = "#6ee7b7";
      verdictBadge.style.border = "1px solid rgba(16, 185, 129, 0.4)";
    } else {
      verdictBadge.style.background = "rgba(245, 158, 11, 0.2)";
      verdictBadge.style.color = "#fcd34d";
      verdictBadge.style.border = "1px solid rgba(245, 158, 11, 0.4)";
    // Temporal Anomaly Alert
    const temporal = data.temporal_audit || {};
    if (temporal.temporal_mismatch_detected) {
      temporalAlert.innerHTML = `<strong>⏳ Timeline Alert:</strong> ${temporal.audit_note}`;
      temporalAlert.classList.remove("hidden");
    } else {
      temporalAlert.classList.add("hidden");
    }

    // Cognitive & Rhetorical Manipulation
    const rhetoric = data.rhetoric_analysis || {};
    const risk = rhetoric.risk_level || "Low";
    riskBadge.textContent = `${risk} Risk (${rhetoric.manipulation_score || 0}/100)`;
    if (risk === "Severe") {
      riskBadge.style.color = "#fda4af";
      riskBadge.style.background = "rgba(244, 63, 94, 0.2)";
    } else if (risk === "Moderate") {
      riskBadge.style.color = "#fcd34d";
      riskBadge.style.background = "rgba(245, 158, 11, 0.2)";
    } else {
      riskBadge.style.color = "#6ee7b7";
      riskBadge.style.background = "rgba(16, 185, 129, 0.2)";
    }

    rhetoricChips.innerHTML = "";
    const techniques = rhetoric.detected_techniques || [];
    if (techniques.length === 0) {
      rhetoricChips.innerHTML = `<span style="font-size: 0.72rem; color: #10b981;">No overt emotional manipulation devices detected.</span>`;
    } else {
      techniques.forEach(tech => {
        const chip = document.createElement("span");
        chip.className = "item-flag";
        chip.style.padding = "3px 6px";
        chip.style.borderRadius = "4px";
        chip.style.background = `${tech.color}20`;
        chip.style.color = tech.color;
        chip.style.fontSize = "0.7rem";
        chip.textContent = `${tech.label} (${tech.matched_words.join(", ")})`;
        rhetoricChips.appendChild(chip);
      });
    }

    // SHAP Bars
    shapBars.innerHTML = "";
    const shapWords = (data.shap_words || []).slice(0, 6);
    if (shapWords.length === 0) {
      shapBars.innerHTML = `<span style="font-size: 0.72rem; color: #64748b;">No notable linguistic flags.</span>`;
    } else {
      const maxShap = Math.max(...shapWords.map(w => w.shap), 0.001);
      shapWords.forEach(w => {
        const isFake = w.direction === "FAKE";
        const width = Math.min(100, Math.round((w.shap / maxShap) * 100));
        const row = document.createElement("div");
        row.className = "shap-row";
        row.innerHTML = `
          <span class="shap-word" title="${w.word}">${w.word}</span>
          <div class="shap-track">
            <div class="shap-fill ${isFake ? 'shap-fake' : 'shap-real'}" style="width: ${width}%"></div>
          </div>
          <span style="font-family: monospace; font-size: 0.7rem; color: #94a3b8;">${w.raw_shap > 0 ? '+' : ''}${w.raw_shap.toFixed(2)}</span>
        `;
        shapBars.appendChild(row);
      });
    }

    // Reddit List
    redditList.innerHTML = "";
    const redditThreads = data.reddit_threads || [];
    if (redditThreads.length === 0) {
      redditList.innerHTML = `<span style="font-size: 0.72rem; color: #64748b;">No direct Reddit discussions found.</span>`;
    } else {
      redditThreads.forEach(t => {
        const a = document.createElement("a");
        a.className = "item-card";
        a.href = t.url;
        a.target = "_blank";
        a.innerHTML = `
          <div class="item-meta">
            <span class="item-source">${t.subreddit}</span>
            ${t.debunk_flag ? '<span class="item-flag">⚠️ Debunk Flag</span>' : ''}
            <span>▲ ${t.score}</span>
          </div>
          <div class="item-title">${t.title}</div>
        `;
        redditList.appendChild(a);
      });
    }

    // Fact Check List
    factCheckList.innerHTML = "";
    const factChecks = (data.direct_fact_checks || []).concat(data.related_fact_checks || []);
    if (factChecks.length === 0) {
      factCheckList.innerHTML = `<span style="font-size: 0.72rem; color: #64748b;">No formal fact-check claims registered.</span>`;
    } else {
      factChecks.slice(0, 3).forEach(f => {
        const a = document.createElement("a");
        a.className = "item-card";
        a.href = f.url || "#";
        a.target = "_blank";
        a.innerHTML = `
          <div class="item-meta">
            <span style="color: #38bdf8; font-weight: 600;">${f.publisher || "Publisher"}</span>
            <span style="color: #fcd34d;">${f.rating || ""}</span>
          </div>
          <div class="item-title">"${f.claim}"</div>
        `;
        factCheckList.appendChild(a);
      });
    }
  }
});

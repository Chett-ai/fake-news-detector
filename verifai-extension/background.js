/**
 * VerifAI Chrome Extension — Background Service Worker (background.js)
 * Registers context menu, handles API calls, caches results in chrome.storage.local (24h TTL),
 * and routes messages between content script and backend API.
 */

const CONFIG = {
  API_BASE_URL: "http://127.0.0.1:5000",
  CACHE_TTL_MS: 24 * 60 * 60 * 1000, // 24 hours TTL
};

// 1. Register Context Menu Item on Installation
chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: "verifai-check-selection",
    title: "Verify claim with VerifAI",
    contexts: ["selection"],
  });
  console.log("[VerifAI] Context menu 'Verify claim with VerifAI' registered.");
});

// Normalize claim text for deterministic hashing & cache keying
function normalizeClaim(text) {
  return (text || "").toLowerCase().trim().replace(/\s+/g, " ");
}

// Simple hash generator for storage keying
function hashString(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i);
    hash |= 0;
  }
  return "cache_" + Math.abs(hash);
}

// Fetch prediction from backend with 24-hour chrome.storage.local caching
async function getVerification(claimText, bypassCache = false) {
  const normClaim = normalizeClaim(claimText);
  const cacheKey = hashString(normClaim);

  // Check Local Cache First (unless bypassCache is true)
  if (!bypassCache) {
    const cachedData = await chrome.storage.local.get([cacheKey]);
    if (cachedData[cacheKey]) {
      const entry = cachedData[cacheKey];
      const isFresh = Date.now() - entry.timestamp < CONFIG.CACHE_TTL_MS;
      if (isFresh) {
        console.log("[VerifAI] Cache hit for claim:", normClaim.slice(0, 30));
        return { ...entry.response, from_cache: true };
      }
    }
  }

  // Network Fetch if Cache Miss or Expired
  console.log("[VerifAI] Fetching live backend evidence for:", normClaim.slice(0, 30));
  const res = await fetch(`${CONFIG.API_BASE_URL}/predict`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text: claimText }),
  });

  if (!res.ok) {
    throw new Error(`Server returned HTTP ${res.status}`);
  }

  const data = await res.json();
  if (!data.success) {
    throw new Error(data.error || "Backend verification failed.");
  }

  // Map Backend JSON to Extension Contract Standard
  const extensionResponse = {
    claim: claimText,
    assessment: data.assessment || "INSUFFICIENT_EVIDENCE",
    confidence: data.confidence_state || "low-evidence",
    reasoning: data.reasoning || "No evidence recorded.",
    evidence_summary: {
      official_sources_found: data.evidence_counts?.official_sources || 0,
      factcheck_hits: data.evidence_counts?.factcheck_hits || 0,
      press_coverage: data.evidence_counts?.press_coverage || 0,
      community_discussion_volume: data.community_sentiment?.thread_count > 0 ? "medium" : "none",
    },
    sources: (data.ranked_sources || []).map((s) => ({
      title: s.title,
      url: s.url,
      tier: s.badge_color === "#7C3AED" ? "official" : s.badge_color === "#2563EB" ? "factcheck_org" : "established_press",
      tier_label: s.tier_label,
      match_score: (s.match_score_pct || 0) / 100,
      snippet: s.snippet,
    })),
    community_threads: data.community_sentiment?.threads || [],
    style_signal: {
      prediction_class: data.linguistic_style_signal?.prediction_class || "UNKNOWN",
      confidence_pct: data.linguistic_style_signal?.confidence_pct || 0,
      note: data.linguistic_style_signal?.note || "Style analysis measures formatting pattern, NOT truth.",
      disclaimer: "This is a stylistic signal only, not a truth determination.",
    },
  };

  // Save to Cache & Update Recent Checks (Last 5)
  await chrome.storage.local.set({
    [cacheKey]: {
      timestamp: Date.now(),
      response: extensionResponse,
    },
  });

  // Maintain Recent 5 Checks for Popup Quick-Access
  const storage = await chrome.storage.local.get(["recent_checks"]);
  let recent = storage.recent_checks || [];
  recent = [extensionResponse, ...recent.filter((r) => r.claim !== claimText)].slice(0, 5);
  await chrome.storage.local.set({ recent_checks: recent });

  return extensionResponse;
}

// 2. Handle Context Menu Click
chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  if (info.menuItemId === "verifai-check-selection" && info.selectionText) {
    const claim = info.selectionText.trim();
    if (!claim) return;

    // Send loading state to content script
    chrome.tabs.sendMessage(tab.id, {
      action: "SHOW_LOADING",
      claim: claim,
    });

    try {
      const result = await getVerification(claim);
      chrome.tabs.sendMessage(tab.id, {
        action: "SHOW_RESULT",
        data: result,
      });
    } catch (err) {
      chrome.tabs.sendMessage(tab.id, {
        action: "SHOW_ERROR",
        error: err.message || "Could not verify claim.",
      });
    }
  }
});

// 3. Handle Direct Messages from Popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "VERIFY_CLAIM") {
    getVerification(request.claim, request.bypassCache || false)
      .then((data) => sendResponse({ success: true, data }))
      .catch((err) => sendResponse({ success: false, error: err.message }));
    return true; // Keep channel open for async response
  }
  if (request.action === "CLEAR_CACHE") {
    chrome.storage.local.clear().then(() => {
      sendResponse({ success: true });
    });
    return true;
  }
});

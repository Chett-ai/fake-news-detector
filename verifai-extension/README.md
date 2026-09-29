# ◈ VerifAI Chrome Extension (Manifest V3)

VerifAI is a Chrome browser extension that lets users fact-check global AI news claims right from highlighted text on any webpage without opening new tabs.

---

## 🚀 How to Load Unpacked in Google Chrome

1. Open **Google Chrome** and navigate to `chrome://extensions/`.
2. Enable **Developer mode** using the toggle switch in the top-right corner.
3. Click the **Load unpacked** button in the top-left corner.
4. Select the `verifai-extension` directory from this workspace:
   `d:\NLP\fake-news-detector\verifai-extension`
5. The **VerifAI — AI News & Claim Verification Ledger** extension will now appear in your active extensions list.

---

## ⚙️ Backend API Configuration & Host Permissions

The extension communicates with the Flask backend `/predict` endpoint.

- **Default Endpoint**: `http://127.0.0.1:5000/predict`
- **Config File**: `background.js` → `CONFIG.API_BASE_URL`
- **Permissions**: Defined in `manifest.json` under `host_permissions`. Replace `https://YOUR_API_DOMAIN/*` with your remote staging or production endpoint when deploying.

---

## ⚡ Scalability & Caching TTL

- **Local Storage Cache**: All verified claims are cached in `chrome.storage.local` keyed by a normalized claim hash.
- **Cache TTL**: **24 Hours** (`CACHE_TTL_MS = 24 * 60 * 60 * 1000`).
- **Scalability Impact**: Prevents redundant API calls when multiple users highlight viral or trending AI claims across different web pages.

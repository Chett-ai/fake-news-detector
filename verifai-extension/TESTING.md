# ◈ VerifAI Chrome Extension — Manual Verification Checklist

---

## 🧪 Manual Verification Checklist

### 1. Selection Trigger Flow (Primary)
- [ ] Open any news website (e.g. `techcrunch.com` or `theverge.com`).
- [ ] Highlight a text sentence (e.g. *"OpenAI releases GPT-4o with multimodal capabilities"*).
- [ ] Right-click the selection → Select **"Verify claim with VerifAI"**.
- [ ] **Verify**: Floating card appears immediately near text selection with spinner (`Evaluating evidence for claim…`).
- [ ] **Verify**: Result renders 4-state assessment (`CORROBORATED`), reasoning sentence, and ranked sources.
- [ ] Press `Esc` key or click outside → **Verify**: Floating card dismisses.

---

### 2. Manual Popup Check (Secondary)
- [ ] Click the **VerifAI** extension icon in the Chrome toolbar.
- [ ] Type an AI claim into the text area (e.g. *"Google DeepMind shuts down Gemini project overnight"*).
- [ ] Click **"◈ Verify Evidence Ledger"**.
- [ ] **Verify**: Assessment renders as `CONTRADICTED` or `INSUFFICIENT_EVIDENCE`.
- [ ] **Verify**: The claim is added to the **RECENT CHECKS (LAST 5)** list below the input.

---

### 3. Local Cache Verification (24-Hour TTL)
- [ ] Perform a selection verify on a claim for the first time.
- [ ] Check `background.js` console logs in Chrome Developer Tools (`chrome://extensions` → *service worker* link).
- [ ] Output should show: `[VerifAI] Fetching live backend evidence for: ...`.
- [ ] Perform the exact same check again.
- [ ] **Verify**: Output shows: `[VerifAI] Cache hit for claim: ...` without triggering a new network request to `/predict`.

---

### 4. 4-State Assessment Visual Verification
- [ ] **CORROBORATED**: Green badge (`#DCFCE7`).
- [ ] **CONTRADICTED**: Red badge (`#FEE2E2`).
- [ ] **DISPUTED**: Amber badge (`#FFEDD5`).
- [ ] **INSUFFICIENT_EVIDENCE**: Gray badge (`#F1F5F9`).
- [ ] **Verify**: No binary "TRUE" or "FAKE" verdict label is rendered anywhere in the UI.

---

### 5. Community Accordion Isolation
- [ ] Verify a claim with Reddit discussion threads.
- [ ] **Verify**: Community threads render inside a collapsed accordion labeled `💬 Public Discussions`.
- [ ] **Verify**: Non-evidentiary warning notice is clearly visible (`⚠️ Non-Evidentiary Note: Forum discussions reflect volume, not factual truth`).

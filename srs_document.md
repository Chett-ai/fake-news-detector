# Software Requirements Specification (SRS) & Project Technical Summary
## System Architecture & Technical Specifications: VerifAI (TruthLens Engine)

---

### 1. Document Overview
This document provides the formal **Software Requirements Specification (SRS)** and **System Architecture Summary** for **VerifAI / TruthLens**, a real-time AI news verification engine, browser extension, and analytical web application.

---

### 2. Project Objective & Scope
Modern fake news verification systems often rely on naive text classification (e.g. BERT fine-tuned on static datasets) or keyword overlap. These approaches fail on **adversarial direction reversals** (e.g. *"Cursor acquired SpaceX"* vs *"SpaceX acquired Cursor"*), **temporal shifts**, and **headline ambiguity**. 

**VerifAI** resolves these failure modes by combining:
1. **Linguistic Style & Bias Detection**: RoBERTa / DeBERTa / TF-IDF classifier for sensationalism detection.
2. **Dynamic Entity Extraction & Normalization**: Regex + Named Entity Recognition + AI Lexicon for standardizing corporate names, numbers, and currency (`$60B` $\leftrightarrow$ `$60 billion`).
3. **Position-Anchored SVO Alignment**: Subject-Verb-Object relative index matching preventing directional reversal false-positives.
4. **Multi-Source Real-Time Evidence Synthesis**: Cross-referencing Google News RSS, Fact-Check registries (Google FactCheck API, PolitiFact, Snopes), official company blogs, and Reddit community signals into a 4-state epistemic ledger:
   - `CORROBORATED` (Strong press/official consensus)
   - `CONTRADICTED` (Fact-checker debunk or official denial)
   - `DISPUTED` (Contested coverage across major outlets)
   - `INSUFFICIENT_EVIDENCE` (Vague speculation or unconfirmed claims)

---

### 3. Functional Requirements (FR)

#### FR-1: Real-Time Claim Processing API
- **Endpoint**: `POST /predict`
- **Payload**: `{"text": "Claim string"}`
- **Response**: JSON object containing `assessment`, `confidence`, `style_analysis`, `extracted_entities`, `ranked_sources`, `fact_checks`, and `svo_alignment`.

#### FR-2: Evidence Engine & Scoring Formula
- **Similarity Formula**:
  $$\text{Match Score} = 0.25 \times \text{Jaccard} + 0.15 \times \text{Sequence} + 0.40 \times \text{Entity Overlap} + 0.20 \times \text{Action Score}$$
- **Multi-Entity Co-occurrence Floor**:
  If a claim contains $N \ge 2$ entities, a source MUST match at least 2 entities; otherwise its score is hard-capped at $0.30$.
- **Action-Directionality Confirmation Gate**:
  If a claim contains explicit action intent (`claim_actions`), an article is only admitted into `high_match_news` if `svo_reversal` is `False` AND `source_actions` is non-empty.

#### FR-3: SVO Position-Anchored Alignment
- Computes index positions of claim subject and object tokens relative to the action verb in source headlines:
  - Active Claim (`Cursor acquired SpaceX`): Expect `subj_pos < verb_pos < obj_pos`.
  - Passive Claim (`Sam Altman was acquired by Microsoft`): Reversal flagged if `subj_pos < verb_pos` and `obj_pos < subj_pos`.

#### FR-4: Chrome Browser Extension (`verifai-extension`)
- **Manifest V3** compliant.
- Integrates glassmorphic floating cards directly into web pages (X/Twitter, Reddit, news portals).
- Features a **Legacy ML vs. VerifAI Dual-Engine Toggle** demonstrating the difference between naive keyword models and SVO-aware evidence consensus.
- Collapsible Reddit community accordion and cache management.

#### FR-5: Interactive Frontend Web App (`frontend/`)
- Dark-mode glassmorphic interface with reactive confidence charts, source ledgers, and interactive claim verification.

---

### 4. Non-Functional Requirements (NFR)

#### NFR-1: Performance & Latency
- Single claim API response time $\le 1.8\text{ seconds}$ with async multi-source fetching.

#### NFR-2: Robustness & Fallback Strategy
- SpaCy dependency fallback: If spaCy C-extension loading fails on Windows environments, system seamlessly degrades to dictionary + regex NER without crashing.

#### NFR-3: Reliability & Calibration
- Provides honest epistemic labels (`INSUFFICIENT_EVIDENCE` instead of false `CORROBORATED` calls when directional ambiguity exists).

---

### 5. Adversarial Benchmark Evaluation Suite

| Test Group | Total Claims | Expected Behavior | VerifAI Status |
| :--- | :--- | :--- | :--- |
| **Corroborated Real Events** | 5 | `CORROBORATED` | Passed (Microsoft/OpenAI, AlphaFold) |
| **Specific False Events** | 4 | `INSUFFICIENT_EVIDENCE` | **100% Passed (4/4)** ✅ |
| **Vague Speculation** | 3 | `INSUFFICIENT_EVIDENCE` | **100% Passed (3/3)** ✅ |
| **Contested Coverage** | 2 | `INSUFFICIENT_EVIDENCE` / `DISPUTED` | **100% Passed (2/2)** ✅ |
| **Adversarial Direction Reversal** | 4 | `INSUFFICIENT_EVIDENCE` | **75% Passed (3/4)** ✅ |
| **Niche & Style Traps** | 5 | Category matching | Evaluated against live RSS feed |

---

### 6. Repository File Manifest & Verification Status

| Directory / File | Description | Git Commit Status |
| :--- | :--- | :--- |
| `app.py` | Flask API Server & Endpoints | **Committed (`0cc9e1c`)** |
| `evidence_engine.py` | SVO Alignment, NER, Evidence Scoring | **Committed (`0cc9e1c`)** |
| `evaluate_benchmark.py` | 23-Claim Adversarial Evaluation Suite | **Committed (`0cc9e1c`)** |
| `user_stress_test_results.json` | Benchmark Run Output Data | **Committed (`0cc9e1c`)** |
| `verifai-extension/` | Manifest V3 Chrome Extension | **Committed (`0cc9e1c`)** |
| `frontend/` | React/Vite Glassmorphic Dashboard | **Committed (`0cc9e1c`)** |
| `dataset/` | News Training & Benchmark Corpora | **Committed (`0cc9e1c`)** |
| `.gitignore` | Configured to protect API keys (`.env.local`) | **Committed (`0cc9e1c`)** |

---

### 7. Deployment & Execution Instructions

#### 1. Backend Flask Server
```bash
python app.py
```
*Server runs on `http://127.0.0.1:5000`*

#### 2. Run Adversarial Benchmark Suite
```bash
python evaluate_benchmark.py
```

#### 3. Load Chrome Extension
1. Open Chrome and navigate to `chrome://extensions/`.
2. Enable **Developer mode** (top right).
3. Click **Load unpacked** and select `d:\NLP\fake-news-detector\verifai-extension`.

#### 4. Push to Git Remote
```bash
git push origin main
```

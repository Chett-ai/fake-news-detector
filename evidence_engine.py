"""
VERIFAI — Transparency-First Evidence Ledger & Multi-Source Verification Engine.
Handles real-time news retrieval, source trust tiering, action-verb intent scoring,
and 4-state epistemic synthesis.
"""

import re
import urllib.parse
from difflib import SequenceMatcher
import xml.etree.ElementTree as ET
import urllib.request

# Load spaCy NLP model for entity & verb extraction (with fallback for Windows AppControl DLL blocks)
try:
    import spacy
    nlp = spacy.load("en_core_web_sm")
except BaseException:
    nlp = None

STOPWORDS = {
    "a", "about", "above", "after", "again", "against", "all", "am", "an", "and", "any", "are",
    "as", "at", "be", "because", "been", "before", "being", "below", "between", "both", "but",
    "by", "could", "did", "do", "does", "doing", "down", "during", "each", "few", "for", "from",
    "further", "had", "has", "have", "having", "he", "her", "here", "hers", "herself", "him",
    "himself", "his", "how", "i", "if", "in", "into", "is", "it", "its", "itself", "just", "me",
    "more", "most", "my", "myself", "no", "nor", "not", "now", "of", "off", "on", "once", "only",
    "or", "other", "our", "ours", "ourselves", "out", "over", "own", "same", "she", "should",
    "so", "some", "such", "than", "that", "the", "their", "theirs", "them", "themselves",
    "then", "there", "these", "they", "this", "those", "through", "to", "too", "under", "until",
    "up", "very", "was", "we", "were", "what", "when", "where", "which", "while", "who", "whom",
    "why", "will", "with", "you", "your", "yours", "yourself", "yourselves"
}

# 1. Source Trust Tiers & Domain Hierarchies
SOURCE_TIERS = {
    "official": {
        "label": "Official Source / arXiv",
        "weight": 1.0,
        "domains": ["openai.com", "anthropic.com", "deepmind.google", "googleblog.com", "meta.com", "arxiv.org", "github.com", "sec.gov"],
        "color": "#7C3AED" # Violet
    },
    "factcheck_org": {
        "label": "Fact-Check Organization",
        "weight": 0.85,
        "domains": ["snopes.com", "politifact.com", "factcheck.org", "fullfact.org", "reuters.com/fact-check"],
        "color": "#2563EB" # Blue
    },
    "established_press": {
        "label": "Established Tech Press",
        "weight": 0.60,
        "domains": ["techcrunch.com", "theverge.com", "arstechnica.com", "bloomberg.com", "reuters.com", "wsj.com", "nytimes.com", "wired.com"],
        "color": "#0891B2" # Cyan
    },
    "community": {
        "label": "Community Discussion",
        "weight": 0.15,
        "domains": ["reddit.com", "twitter.com", "x.com"],
        "color": "#EA580C" # Orange
    }
}

# AI Named Entities
AI_ENTITIES = {
    "openai", "deepmind", "anthropic", "google", "meta", "nvidia", "microsoft", "apple", "mistral",
    "gpt-4", "gpt-4o", "gpt-5", "claude", "gemini", "llama", "sora", "midjourney", "stablediffusion",
    "sam altman", "demis hassabis", "dario amodei", "yann lecun", "geoffrey hinton", "ilya sutskever", "agi"
}

def extract_entities(text: str) -> set:
    """Dynamically extract AI entities, Proper Nouns, Company names, and Products from claim text."""
    found = set()
    if not text:
        return found

    lowered = text.lower()
    for ent in AI_ENTITIES:
        if ent in lowered:
            found.add(ent)

    if nlp is not None:
        try:
            doc = nlp(text)
            for ent in doc.ents:
                if ent.label_ in ("ORG", "PERSON", "PRODUCT", "WORK_OF_ART", "GPE", "MONEY"):
                    found.add(ent.text.lower())
        except Exception:
            pass

    # Dynamic Regex Proper Noun Extractor (Matches SpaceX, Cursor, Elon Musk, Baidu, H100, etc.)
    proper_noun_matches = re.findall(r'\b[A-Z][a-zA-Z0-9\'-]+(?:\s+[A-Z][a-zA-Z0-9\'-]+)*\b', text)
    for match in proper_noun_matches:
        cleaned = match.strip().lower()
        if cleaned not in STOPWORDS and len(cleaned) > 2:
            found.add(cleaned)

    # Dynamic financial & token numbers (e.g. $60 billion, 70B, GPT-4o)
    financials = re.findall(r'\$?\d+(?:\.\d+)?\s*(?:billion|million|trillion|b|m|k)?', text, flags=re.IGNORECASE)
    for fin in financials:
        if len(fin) > 1 and fin.lower() not in STOPWORDS:
            norm_fin = fin.lower()
            norm_fin = re.sub(r'(\d+)\s*b\b', r'\1 billion', norm_fin)
            norm_fin = re.sub(r'(\d+)\s*m\b', r'\1 million', norm_fin)
            found.add(norm_fin)

    return found

ACTION_VERB_LEXICON = {
    "acquire", "acquired", "acquires", "acquisition", "buy", "bought", "buys", "purchase", "purchased", "buyout", "takeover",
    "sell", "sold", "sells", "fire", "fired", "fires", "dismissed", "dismiss", "sue", "sued", "sues", "lawsuit", "release", "released", "releases",
    "launch", "launched", "launches", "invest", "invested", "invests", "funding", "raised", "stake", "shut", "shutdown",
    "win", "won", "wins", "resign", "resigned", "resigns", "found", "founded", "merge", "merged", "merger", "partnered", "partnership", "recall", "recalled"
}

def extract_claim_intent(text: str) -> set:
    """Extract key action verbs & predicates from text using curated event lexicon."""
    words = set(re.findall(r'[a-z0-9]{3,}', text.lower()))
    return words.intersection(ACTION_VERB_LEXICON)

def check_directional_svo_alignment(claim: str, source_text: str) -> dict:
    """
    Position-Anchored Subject-Verb-Object (SVO) Alignment Check.
    Anchors subject and object positions relative to action predicate indices in source_text.
    Detects directional reversals regardless of pre-verb headline padding (e.g. 'First Microsoft, now Apple: Sam Altman...').
    """
    action_verbs = [
        "acquired", "acquires", "acquisition", "buyout", "takeover", "bought", "buys", "purchased", "purchase",
        "sold", "sell", "fired", "fires", "sued", "lawsuit", "resigned", "merger", "merged", "founded"
    ]
    claim_low = claim.lower()
    source_low = source_text.lower()

    found_action = None
    for v in action_verbs:
        if v in claim_low:
            found_action = v
            break

    if not found_action:
        return {"reversal_detected": False, "role_conflict": False, "reason": ""}

    claim_parts = claim_low.split(found_action)
    if len(claim_parts) < 2:
        return {"reversal_detected": False, "role_conflict": False, "reason": ""}

    claim_subj_words = set(re.findall(r'[a-z0-9]{3,}', claim_parts[0])) - STOPWORDS
    claim_obj_words = set(re.findall(r'[a-z0-9]{3,}', claim_parts[1])) - STOPWORDS

    if not claim_subj_words or not claim_obj_words:
        return {"reversal_detected": False, "role_conflict": False, "reason": ""}

    # Locate action predicate in source text
    source_verb_pos = -1
    for v in action_verbs:
        pos = source_low.find(v)
        if pos != -1:
            source_verb_pos = pos
            break

    if source_verb_pos == -1:
        return {"reversal_detected": False, "role_conflict": False, "reason": ""}

    # Find earliest occurrence of claim subject and object words in source text
    def find_earliest_pos(token_set, text):
        positions = [text.find(w) for w in token_set if text.find(w) != -1]
        return min(positions) if positions else -1

    subj_pos = find_earliest_pos(claim_subj_words, source_low)
    obj_pos = find_earliest_pos(claim_obj_words, source_low)

    if subj_pos == -1 or obj_pos == -1:
        return {"reversal_detected": False, "role_conflict": False, "reason": ""}

    # Directional Reversal Conditions:
    # 1. Active claim ("Cursor acquired SpaceX"): Expect Subj < Verb < Obj.
    #    Reversal occurs if Source has Obj < Verb < Subj OR Subj > Verb.
    # 2. Passive claim ("Sam Altman was acquired by Microsoft"): Expect Subj (Sam) to be target of action,
    #    but Source has "Sam Altman's acquisition" (Sam < Verb) and Microsoft is left of Sam (Microsoft < Sam < Verb).
    reversal = False
    is_passive_claim = "was acquired" in claim_low or "sold to" in claim_low or "acquired by" in claim_low

    if not is_passive_claim:
        # Active reversal
        if subj_pos > source_verb_pos and obj_pos < source_verb_pos:
            reversal = True
    else:
        # Passive claim: If source shows claim_subj (Sam Altman) immediately attached to verb (e.g. Sam Altman's acquisition)
        # where claim_subj precedes verb, it means claim_subj is actor, reversing passive claim.
        if subj_pos < source_verb_pos and obj_pos < subj_pos:
            reversal = True

    if reversal:
        return {
            "reversal_detected": True,
            "role_conflict": True,
            "reason": f"Position-anchored SVO reversal detected: Subject at {subj_pos}, Object at {obj_pos}, Verb at {source_verb_pos}."
        }

    return {"reversal_detected": False, "role_conflict": False, "reason": ""}

def score_evidence_match(claim: str, source_text: str) -> dict:
    """
    Action-Aware & SVO Directional Similarity Metric.
    Score = 0.25 * Jaccard + 0.15 * Sequence + 0.40 * Entity Overlap + 0.20 * Action Intent Overlap.
    Enforces strict Multi-Entity Co-occurrence Floor & SVO Direction Caps.
    """
    if not claim or not source_text:
        return {"total_score": 0.0, "jaccard": 0.0, "sequence": 0.0, "entity_overlap": 0.0, "action_score": 0.0, "entities_matched": [], "svo_reversal": False}

    claim_words = set(re.findall(r'[a-z0-9]{3,}', claim.lower())) - STOPWORDS
    source_words = set(re.findall(r'[a-z0-9]{3,}', source_text.lower())) - STOPWORDS

    if not claim_words or not source_words:
        return {"total_score": 0.0, "jaccard": 0.0, "sequence": 0.0, "entity_overlap": 0.0, "action_score": 0.0, "entities_matched": [], "svo_reversal": False}

    # 1. Jaccard & Sequence
    intersection = claim_words.intersection(source_words)
    jaccard = len(intersection) / len(claim_words.union(source_words))
    sequence = SequenceMatcher(None, claim.lower(), source_text.lower()).ratio()

    # 2. Entity Overlap & Co-occurrence Floor
    claim_entities = extract_entities(claim)
    source_entities = extract_entities(source_text)

    if len(claim_entities) >= 2:
        shared_entities = claim_entities.intersection(source_entities)
        entity_overlap = len(shared_entities) / len(claim_entities)
        # Strict Co-occurrence Floor: If claim has 2+ entities, source MUST co-occur all of them (or >= 75%)
        # If source only mentions 1 of 2 entities, cap match score at 0.30 to prevent false corroboration
        multi_entity_cap = 0.30 if len(shared_entities) < len(claim_entities) else 1.0
    elif claim_entities:
        shared_entities = claim_entities.intersection(source_entities)
        entity_overlap = len(shared_entities) / len(claim_entities)
        multi_entity_cap = 1.0
    else:
        shared_entities = set()
        entity_overlap = jaccard
        multi_entity_cap = 1.0

    # 3. Action Verb / Intent Overlap
    claim_actions = extract_claim_intent(claim)
    source_actions = extract_claim_intent(source_text)

    if claim_actions:
        shared_actions = claim_actions.intersection(source_actions)
        action_score = len(shared_actions) / len(claim_actions)
    else:
        action_score = 0.5

    # 4. SVO Directional Alignment Check
    svo_check = check_directional_svo_alignment(claim, source_text)
    svo_cap = 0.25 if svo_check["reversal_detected"] else 1.0

    # Multi-factor score with Action Intent & SVO penalization
    total_score = round((0.25 * jaccard) + (0.15 * sequence) + (0.40 * entity_overlap) + (0.20 * action_score), 3)

    # Apply strict caps
    if claim_actions and action_score == 0.0:
        total_score = min(total_score, 0.35)

    total_score = min(total_score, multi_entity_cap, svo_cap)

    return {
        "total_score": total_score,
        "jaccard": round(jaccard, 3),
        "sequence": round(sequence, 3),
        "entity_overlap": round(entity_overlap, 3),
        "action_score": round(action_score, 3),
        "entities_matched": list(shared_entities),
        "svo_reversal": svo_check["reversal_detected"],
        "svo_reason": svo_check["reason"]
    }

def get_source_tier(url: str) -> dict:
    """Classifies a URL into a source trust tier."""
    domain = urllib.parse.urlparse(url).netloc.lower()
    for tier_key, tier_info in SOURCE_TIERS.items():
        for d in tier_info["domains"]:
            if d in domain:
                return {"tier": tier_key, "label": tier_info["label"], "weight": tier_info["weight"], "color": tier_info["color"]}
    
    return {"tier": "general_media", "label": "General Media Outlet", "weight": 0.40, "color": "#64748B"}

def fetch_live_evidence_news(claim: str = "", limit: int = 5, raw_claim: str = "", **kwargs) -> list:
    """Fetches real-time news articles from Google News RSS using entity-enhanced query."""
    claim_text = claim or raw_claim
    entities = extract_entities(claim_text)
    query_str = " ".join(entities) if entities else claim_text
    encoded = urllib.parse.quote(query_str)
    rss_url = f"https://news.google.com/rss/search?q={encoded}&hl=en-US&gl=US&ceid=US:en"
    
    articles = []
    try:
        req = urllib.request.Request(rss_url, headers={'User-Agent': 'Mozilla/5.0'})
        with urllib.request.urlopen(req, timeout=5) as resp:
            xml_data = resp.read()
            root = ET.fromstring(xml_data)
            items = root.findall(".//item")[:limit]
            
            for it in items:
                title = it.find("title").text if it.find("title") is not None else ""
                title = title.replace("&nbsp;", " ").replace("&amp;", "&").strip()
                link = it.find("link").text if it.find("link") is not None else ""
                
                tier_info = get_source_tier(link)
                match_info = score_evidence_match(claim_text, title)
                
                articles.append({
                    "title": title,
                    "url": link,
                    "source": tier_info["label"],
                    "tier": tier_info["tier"],
                    "tier_label": tier_info["label"],
                    "tier_weight": tier_info["weight"],
                    "badge_color": tier_info["color"],
                    "match_score": match_info["total_score"],
                    "match_score_pct": int(match_info["total_score"] * 100),
                    "svo_reversal": match_info.get("svo_reversal", False),
                    "svo_reason": match_info.get("svo_reason", ""),
                    "snippet": f"Matched entities: {', '.join([e.title() for e in match_info['entities_matched']])}" if match_info['entities_matched'] else "Topical Relevance Match"
                })
    except Exception as e:
        print(f"[Evidence Engine] Error fetching news RSS: {e}")
        
    return articles

def synthesize_credibility_dossier(*args, **kwargs) -> dict:
    """
    Synthesizes multi-source evidence into a 4-state Epistemic Assessment:
    - CORROBORATED (Requires >= 0.45 match score on Action-Aware similarity)
    - CONTRADICTED
    - DISPUTED
    - INSUFFICIENT_EVIDENCE
    Flexibly handles positional parameters from app.py:
    4-args: (claim, fact_checks, news_consensus, reddit_threads)
    5-args: (prediction, confidence, fact_checks, reddit_threads, news_consensus)
    """
    claim = ""
    fact_checks = []
    news_consensus = []
    reddit_threads = []

    if len(args) == 5:
        # app.py format: (prediction, confidence, all_fact_checks, reddit_threads, news_consensus)
        fact_checks = args[2] if isinstance(args[2], list) else []
        reddit_threads = args[3] if isinstance(args[3], list) else []
        news_consensus = args[4] if isinstance(args[4], list) else []
        claim = kwargs.get("claim", "")
    elif len(args) == 4:
        # standard format: (claim, fact_checks, news_consensus, reddit_threads)
        claim = args[0] if isinstance(args[0], str) else ""
        fact_checks = args[1] if isinstance(args[1], list) else []
        news_consensus = args[2] if isinstance(args[2], list) else []
        reddit_threads = args[3] if isinstance(args[3], list) else []
    else:
        claim = kwargs.get("claim", args[0] if len(args) > 0 and isinstance(args[0], str) else "")
        fact_checks = kwargs.get("fact_checks", [])
        news_consensus = kwargs.get("news_consensus", [])
        reddit_threads = kwargs.get("reddit_threads", [])

    official_sources = [n for n in news_consensus if isinstance(n, dict) and n.get("tier") == "official"]
    # Extract claim intent & SVO reversals
    claim_actions = extract_claim_intent(claim) if claim else set()
    svo_reversals = [n for n in news_consensus if isinstance(n, dict) and n.get("svo_reversal")]

    # High match news logic:
    # Requires match_score >= 0.45 AND no SVO reversal.
    # Crucially: If claim expresses action intent (e.g. acquired, bought, fired), source MUST also express matching action directionality.
    high_match_news = []
    for n in news_consensus:
        if isinstance(n, dict):
            score = n.get("match_score", 0)
            has_reversal = n.get("svo_reversal", False)
            if score >= 0.45 and not has_reversal:
                if claim_actions:
                    source_title = n.get("title", "")
                    source_actions = extract_claim_intent(source_title)
                    # Require that source confirms an action predicate from lexicon
                    if source_actions:
                        high_match_news.append(n)
                else:
                    high_match_news.append(n)

    factcheck_hits = len(fact_checks)
    press_coverage = len([n for n in news_consensus if isinstance(n, dict) and n.get("match_score", 0) >= 0.25])
    community_threads = len(reddit_threads)

    has_official = len(official_sources) > 0
    has_press = len(high_match_news) >= 1
    has_debunk = factcheck_hits > 0 and any(fc.get("interpretation") == "CONTRADICTED" for fc in fact_checks)

    # Extract claim entities for output
    claim_entities = [e.title() for e in extract_entities(claim)] if claim else []

    # Check for SVO Directional Reversals in retrieved news items
    svo_reversals = [n for n in news_consensus if isinstance(n, dict) and n.get("svo_reversal")]

    # Epistemic 4-State Determination Logic
    if svo_reversals:
        assessment = "INSUFFICIENT_EVIDENCE"
        assessment_label = "Directional Claim Conflict"
        confidence_state = "unverified"
        reasoning = svo_reversals[0].get("svo_reason", "Directional conflict detected: Subject-object relationship in claim contradicts news coverage.")
    elif has_debunk:
        assessment = "CONTRADICTED"
        assessment_label = "Contradicted by Fact-Checking Registry"
        confidence_state = "high-evidence"
        reasoning = "Official fact-checking databases explicitly refute or debunk key elements of this claim."
    elif has_official:
        assessment = "CORROBORATED"
        assessment_label = "Corroborated by Official Channels"
        confidence_state = "high-evidence"
        reasoning = f"Official announcements/publications ({', '.join([s['source'] for s in official_sources[:2]])}) confirm this claim."
    elif has_press:
        assessment = "CORROBORATED"
        assessment_label = "Corroborated by Established Press"
        confidence_state = "medium-evidence"
        reasoning = f"Multiple verified press outlets ({', '.join([s['source'] for s in high_match_news[:3]])}) report active coverage matching this claim."
    elif len(high_match_news) == 1:
        assessment = "DISPUTED"
        assessment_label = "Disputed / Limited Coverage"
        confidence_state = "low-evidence"
        reasoning = "Only single non-official press coverage found matching this claim. Independent confirmation is limited."
    else:
        assessment = "INSUFFICIENT_EVIDENCE"
        assessment_label = "Insufficient Public Evidence"
        confidence_state = "unverified"
        reasoning = "No corroborating reports found in official AI research blogs, fact-checking registries, or established tech press."

    # Sort sources by weight & score
    ranked_sources = sorted(news_consensus, key=lambda x: (x.get("match_score", 0), x.get("tier_weight", 0)), reverse=True)

    return {
        "assessment": assessment,
        "assessment_label": assessment_label,
        "confidence_state": confidence_state,
        "reasoning": reasoning,
        "extracted_entities": claim_entities,
        "ranked_sources": ranked_sources,
        "evidence_counts": {
            "official_sources": len(official_sources),
            "factcheck_hits": factcheck_hits,
            "press_coverage": press_coverage,
            "community_threads": community_threads
        },
        "community_sentiment": {
            "thread_count": community_threads,
            "threads": reddit_threads,
            "disclaimer": "Reddit threads reflect community sentiment and discussion volume, NOT factual verification."
        },
        "disclaimer": "Factual assessments are based strictly on evidence corroboration across official channels, verified fact-checking databases, and established tech press."
    }

def extract_search_query(text: str) -> str:
    """Extract clean keywords for search query."""
    entities = extract_entities(text)
    if entities:
        return " ".join(list(entities)[:4])
    words = re.findall(r'[a-zA-Z0-9]+', text)
    filtered = [w for w in words if w.lower() not in STOPWORDS]
    return " ".join(filtered[:5]) if filtered else text[:60]

def fetch_reddit_context(claim: str, limit: int = 3) -> list:
    """Fetch Reddit community discussions (isolated from factual evidence)."""
    try:
        query = extract_search_query(claim)
        encoded = urllib.parse.quote(query)
        url = f"https://www.reddit.com/r/ArtificialInteligence+technology/search.json?q={encoded}&limit={limit}&sort=relevance"
        req = urllib.request.Request(url, headers={'User-Agent': 'VerifAI-Bot/1.0'})
        with urllib.request.urlopen(req, timeout=4) as resp:
            import json
            data = json.loads(resp.read().decode('utf-8'))
            threads = []
            for post in data.get('data', {}).get('children', []):
                pdata = post.get('data', {})
                threads.append({
                    "title": pdata.get('title'),
                    "subreddit": f"r/{pdata.get('subreddit')}",
                    "score": pdata.get('score', 0),
                    "num_comments": pdata.get('num_comments', 0),
                    "url": f"https://reddit.com{pdata.get('permalink')}"
                })
            return threads
    except Exception:
        return []

# Alias for backward compatibility
fetch_news_consensus = fetch_live_evidence_news

import re
import requests
from difflib import SequenceMatcher

# Common english stopwords to exclude from search queries
STOPWORDS = {
    "a", "about", "above", "after", "again", "against", "all", "am", "an", "and",
    "any", "are", "aren't", "as", "at", "be", "because", "been", "before", "being",
    "below", "between", "both", "but", "by", "can", "can't", "cannot", "could",
    "couldn't", "did", "didn't", "do", "does", "doesn't", "doing", "don't", "down",
    "during", "each", "few", "for", "from", "further", "had", "hadn't", "has",
    "hasn't", "have", "haven't", "having", "he", "he'd", "he'll", "he's", "her",
    "here", "here's", "hers", "herself", "him", "himself", "his", "how", "how's",
    "i", "i'd", "i'll", "i'm", "i've", "if", "in", "into", "is", "isn't", "it",
    "it's", "its", "itself", "let's", "me", "more", "most", "mustn't", "my",
    "myself", "no", "nor", "not", "of", "off", "on", "once", "only", "or", "other",
    "ought", "our", "ours", "ourselves", "out", "over", "own", "same", "shan't",
    "she", "she'd", "she'll", "she's", "should", "shouldn't", "so", "some", "such",
    "than", "that", "that's", "the", "their", "theirs", "them", "themselves", "then",
    "there", "there's", "these", "they", "they'd", "they'll", "they're", "they've",
    "this", "those", "through", "to", "too", "under", "until", "up", "very", "was",
    "wasn't", "we", "we'd", "we'll", "we're", "we've", "were", "weren't", "what",
    "what's", "when", "when's", "where", "where's", "which", "while", "who", "who's",
    "whom", "why", "why's", "with", "won't", "would", "wouldn't", "you", "you'd",
    "you'll", "you're", "you've", "your", "yours", "yourself", "yourselves", "said",
    "says", "claim", "claims", "report", "reports", "breaking", "news", "just", "also"
}

def extract_search_query(text: str, max_words: int = 7) -> str:
    """
    Extracts high-information salient keywords and entities from an input text or claim.
    Ideal for targeted multi-platform queries (Reddit, FactCheck, Web).
    """
    if not text:
        return ""

    # First take the first line or first sentence
    sentences = re.split(r'[.!?\n]', text)
    primary_sentence = sentences[0].strip() if sentences else text[:100]

    # Clean punctuation
    words = re.findall(r'[A-Za-z0-9]+', primary_sentence)
    if not words:
        return text[:60].strip()

    # Prioritize capitalized words (Named Entities) and non-stopwords
    salient = []
    for w in words:
        wl = w.lower()
        if wl not in STOPWORDS and len(wl) > 2:
            salient.append(w)

    if len(salient) < 3:
        # Fallback to general non-stopwords
        salient = [w for w in words if w.lower() not in STOPWORDS]

    selected = salient[:max_words]
    return " ".join(selected) if selected else primary_sentence[:60]


import urllib.parse
import xml.etree.ElementTree as ET

def calculate_text_similarity(text1: str, text2: str) -> float:
    """
    Computes strict semantic & keyword overlap between user claim and news article title.
    """
    if not text1 or not text2:
        return 0.0

    t1 = set(re.findall(r'[a-z0-9]{3,}', text1.lower()))
    t2 = set(re.findall(r'[a-z0-9]{3,}', text2.lower()))
    
    # Remove common stopwords
    t1_clean = {w for w in t1 if w not in STOPWORDS}
    t2_clean = {w for w in t2 if w not in STOPWORDS}

    if not t1_clean or not t2_clean:
        return 0.0

    intersection = t1_clean.intersection(t2_clean)
    
    # Overlap ratio relative to user claim keywords
    claim_coverage = len(intersection) / len(t1_clean)
    
    # Sequence similarity for phrase alignment
    seq_sim = SequenceMatcher(None, text1.lower(), text2.lower()).ratio()

    return round((claim_coverage * 0.70) + (seq_sim * 0.30), 3)


def fetch_news_consensus(query: str, limit: int = 5, raw_claim: str = ""):
    """
    Live web news consensus via Google News RSS search.
    Enforces strict claim validation so unrelated news articles are NOT counted as corroboration.
    """
    if not query or len(query.strip()) < 3:
        return []

    try:
        # Quote query for exact multi-word relevance
        search_term = f'"{query}"' if " " in query and len(query.split()) <= 4 else query
        encoded = urllib.parse.quote(search_term)
        rss_url = f"https://news.google.com/rss/search?q={encoded}&hl=en-US&gl=US&ceid=US:en"
        headers = {"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)"}
        
        r = requests.get(rss_url, headers=headers, timeout=6)
        if r.status_code != 200:
            return []

        root = ET.fromstring(r.content)
        items = root.findall(".//item")
        results = []

        debunk_keywords = ["debunk", "fake", "hoax", "misleading", "false", "fact check", "disinfo", "untrue", "debunked", "myth", "rumor", "claims falsely"]

        claim_to_check = raw_claim if raw_claim else query

        for it in items:
            title = it.find("title").text if it.find("title") is not None else ""
            link = it.find("link").text if it.find("link") is not None else ""
            source_elem = it.find("source")
            source_name = source_elem.text if source_elem is not None else "News Outlet"

            combined_text = title.lower()
            debunk_flag = any(k in combined_text for k in debunk_keywords)

            # Check similarity against the actual claim
            sim_score = calculate_text_similarity(claim_to_check, title)

            # Only accept articles that actually talk about the claim (at least 35% relevant keywords)
            if sim_score >= 0.32:
                results.append({
                    "source": source_name,
                    "title": title,
                    "url": link,
                    "debunk_flag": debunk_flag,
                    "similarity": sim_score
                })

            if len(results) >= limit:
                break

        return results
    except Exception as e:
        print("News consensus fetch notice:", e)
        return []



def fetch_reddit_context(query: str, limit: int = 5):
    """
    Fetches real-time public Reddit discussions without paid API credentials.
    Uses Reddit's official public JSON interface.
    """
    if not query or len(query.strip()) < 3:
        return []

    url = "https://www.reddit.com/search.json"
    headers = {
        "User-Agent": "TruthLensResearchBot/2.0 (Academic Verification Tool; contact: truthlens.research@gmail.com)"
    }
    params = {
        "q": query,
        "sort": "relevance",
        "limit": limit,
        "type": "link"
    }

    try:
        res = requests.get(url, headers=headers, params=params, timeout=6)
        if res.status_code != 200:
            return []

        data = res.json()
        posts = data.get("data", {}).get("children", [])
        results = []

        debunk_keywords = ["debunk", "fake", "hoax", "misleading", "false", "fact check", "disinfo", "untrue", "debunked"]

        for p in posts:
            post_data = p.get("data", {})
            title = post_data.get("title", "")
            subreddit = post_data.get("subreddit_name_prefixed", "")
            permalink = "https://reddit.com" + post_data.get("permalink", "")
            score = post_data.get("score", 0)
            num_comments = post_data.get("num_comments", 0)
            selftext = (post_data.get("selftext", "") or "")[:250]
            created_utc = post_data.get("created_utc", 0)

            combined_text = (title + " " + selftext).lower()
            debunk_flag = any(k in combined_text for k in debunk_keywords)

            results.append({
                "source": "Reddit",
                "subreddit": subreddit,
                "title": title,
                "snippet": selftext,
                "url": permalink,
                "score": score,
                "num_comments": num_comments,
                "debunk_flag": debunk_flag,
                "created_utc": created_utc
            })

        return results
    except Exception as e:
        print("Reddit fetch notice:", e)
        return []


def synthesize_credibility_dossier(ml_prediction: str, ml_confidence: float, fact_checks: list, reddit_threads: list, news_consensus: list = None):
    """
    Real-world multi-source evidence verification.
    Prioritizes legitimate live reporting and institutional checks over offline stylometric ML.
    """
    if news_consensus is None:
        news_consensus = []

    # Count high-trust corroborating news sources
    news_debunk_items = [n for n in news_consensus if n.get("debunk_flag")]
    news_support_items = [n for n in news_consensus if not n.get("debunk_flag")]
    
    # Fact checks with actual high similarity
    direct_debunks = [
        fc for fc in fact_checks 
        if fc.get("interpretation") == "CONTRADICTED" and fc.get("similarity", 0) >= 0.55
    ]
    direct_supports = [
        fc for fc in fact_checks 
        if fc.get("interpretation") == "SUPPORTED" and fc.get("similarity", 0) >= 0.50
    ]

    reddit_debunks = [r for r in reddit_threads if r.get("debunk_flag")]

    # 1. Clear Institutional Debunk: A directly matched fact-check explicitly contradicts the claim
    if len(direct_debunks) > 0:
        verdict = "DEBUNKED"
        summary = f"Institutional fact-checker ({direct_debunks[0].get('publisher', 'Verified Source')}) directly rated this claim as false or misleading."
        confidence_level = "High"
        final_truth_status = "FAKE"

    # 2. Strong Real-World News Corroboration: Multiple legitimate news outlets actively confirm this specific claim
    elif len(news_support_items) >= 2 and len(news_debunk_items) == 0:
        sources_list = ", ".join([n.get("source", "Major Outlet") for n in news_support_items[:3]])
        verdict = "CORROBORATED"
        summary = f"Verified across legitimate real-world news outlets ({sources_list}). Active coverage confirms this is a genuine event/report."
        confidence_level = "High"
        final_truth_status = "REAL"

    # 3. Direct Fact-Check Supports
    elif len(direct_supports) > 0:
        verdict = "CORROBORATED"
        summary = f"Fact-checking records ({direct_supports[0].get('publisher', 'Verified Source')}) corroborate this claim."
        confidence_level = "High"
        final_truth_status = "REAL"

    # 4. Mixed or Disputed News: Contradictory reporting or explicit debunk flags
    elif len(news_debunk_items) > 0 or len(reddit_debunks) >= 2:
        verdict = "DISPUTED"
        summary = "Live news investigations or public reporting indicate debunking flags or disputed factual details."
        confidence_level = "Medium"
        final_truth_status = "DISPUTED"

    # 5. Only 1 weakly related news item found (insufficient for full corroboration)
    elif len(news_support_items) == 1:
        source_name = news_support_items[0].get("source", "News Publisher")
        verdict = "UNVERIFIED"
        summary = f"Mentioned in passing by {source_name}, but lacks broad independent corroboration. Treat with caution."
        confidence_level = "Low"
        final_truth_status = "UNVERIFIED"

    # 6. Fallback if no external real-world sources exist
    elif len(fact_checks) == 0 and len(news_consensus) == 0:
        # If no real-world news outlets or fact-checkers report this, and ML model flags it as FAKE:
        if ml_prediction == "FAKE" and ml_confidence >= 65:
            verdict = "DEBUNKED"
            summary = "No credible news outlets or official records confirm this claim. Linguistic patterns closely match known false reports."
            confidence_level = "High" if ml_confidence >= 80 else "Medium"
            final_truth_status = "FAKE"
        else:
            verdict = "UNVERIFIED"
            summary = "No legitimate news publications or official fact-check records report this claim. Unverified by credible sources."
            confidence_level = "Low"
            final_truth_status = "UNVERIFIED"

    else:
        verdict = "MIXED CONTEXT"
        summary = "Partial context found across public records without definitive institutional verification."
        confidence_level = "Medium"
        final_truth_status = "MIXED"

    return {
        "research_verdict": verdict,
        "final_truth_status": final_truth_status,
        "summary": summary,
        "confidence_level": confidence_level,
        "evidence_sources_count": len(fact_checks) + len(reddit_threads) + len(news_consensus),
        "reddit_threads_count": len(reddit_threads),
        "fact_checks_count": len(fact_checks),
        "news_consensus_count": len(news_consensus)
    }


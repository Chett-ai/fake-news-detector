import re
from datetime import datetime

# ==============================================================================
# PROPAGANDA & RHETORICAL MANIPULATION TECHNIQUES (DISINFORMATION RESEARCH)
# Based on EU DisinfoLab & Propaganda Analysis Framework
# ==============================================================================

RHETORICAL_PATTERNS = {
    "fear_appeal": {
        "label": "Fear & Threat Appeal",
        "description": "Uses alarming, catastrophizing language to induce panic and urgency.",
        "color": "#f43f5e",
        "keywords": [
            "deadly", "catastrophic", "destroy", "annihilation", "collapse",
            "apocalypse", "crisis", "lethal", "disaster", "danger", "terror",
            "panic", "threat", "horrifying", "shocking", "doomsday", "warning"
        ]
    },
    "vague_authority": {
        "label": "Unverified / Anonymous Authority",
        "description": "Appeals to unnamed experts, secret insiders, or clandestine whistleblowers.",
        "color": "#f59e0b",
        "keywords": [
            "insiders", "whistleblower", "anonymous", "leaked", "secret",
            "they don't want you to know", "hidden truth", "deep state",
            "confidential", "undercover", "sources reveal", "classified", "admit"
        ]
    },
    "urgent_call": {
        "label": "Manufactured Urgency & Viral Bait",
        "description": "Pressures immediate sharing before content is 'deleted' or 'censored'.",
        "color": "#a855f7",
        "keywords": [
            "share before deleted", "must watch", "act now", "urgent",
            "breaking now", "censored", "banned", "going viral", "wake up",
            "don't trust", "spread this", "everyone needs to know"
        ]
    },
    "loaded_sentiment": {
        "label": "Emotionally Polarizing Sentiment",
        "description": "Hyperbolic adjectives designed to bypass critical reasoning.",
        "color": "#3b82f6",
        "keywords": [
            "unbelievable", "mindblowing", "insane", "evil", "monstrous",
            "miracle", "cure all", "magic", "guaranteed", "plot", "scam"
        ]
    }
}


def analyze_rhetorical_patterns(text: str):
    """
    Scans text for cognitive manipulation and propaganda framing devices.
    Returns detected categories and highlighted spans.
    """
    if not text:
        return {"detected_techniques": [], "manipulation_score": 0}

    lowered = text.lower()
    detected = []
    total_matches = 0

    for cat_id, info in RHETORICAL_PATTERNS.items():
        matched_words = []
        for kw in info["keywords"]:
            pattern = r'\b' + re.escape(kw) + r'\b'
            matches = re.findall(pattern, lowered)
            if matches:
                matched_words.extend(list(set(matches)))

        if matched_words:
            total_matches += len(matched_words)
            detected.append({
                "id": cat_id,
                "label": info["label"],
                "description": info["description"],
                "color": info["color"],
                "matched_words": matched_words[:6],
                "intensity": "High" if len(matched_words) >= 3 else "Medium"
            })

    # Manipulation risk rating based on technique density
    risk = "Low"
    if total_matches >= 4 or len(detected) >= 3:
        risk = "Severe"
    elif total_matches >= 2 or len(detected) >= 2:
        risk = "Moderate"

    return {
        "detected_techniques": detected,
        "manipulation_score": min(100, total_matches * 18),
        "risk_level": risk,
        "count": len(detected)
    }


def audit_temporal_timeline(text: str, news_consensus: list):
    """
    Detects potential 'Zombie News' / out-of-context timeline recirculation.
    Compares historical references in articles to live web reporting.
    """
    # Look for historical year references (e.g. 2012, 2014, 2018, 2020)
    current_year = datetime.now().year
    years_found = [int(y) for y in re.findall(r'\b(19\d{2}|20\d{2})\b', text)]
    
    historical_years = [y for y in years_found if y < (current_year - 2)]
    is_temporal_anomaly = False
    details = "No timeline discrepancies detected."

    if historical_years:
        oldest_year = min(historical_years)
        is_temporal_anomaly = True
        details = f"Article references events/dates from {oldest_year}. Check if past footage or archived events are being recirculated as breaking news."

    # Cross-reference with news items containing historical flags
    for n in news_consensus:
        title_lower = n.get("title", "").lower()
        if "from " in title_lower or "resurfaces" in title_lower or "old clip" in title_lower or "years ago" in title_lower:
            is_temporal_anomaly = True
            details = "News consensus indicates this story or media is an older event recirculating online."
            break

    return {
        "temporal_mismatch_detected": is_temporal_anomaly,
        "historical_references": historical_years,
        "audit_note": details
    }

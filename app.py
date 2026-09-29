from flask import Flask, request, jsonify
import os
import re
import requests
import joblib
import numpy as np

from dotenv import load_dotenv
from difflib import SequenceMatcher

try:
    import shap
    SHAP_AVAILABLE = True
except ImportError:
    SHAP_AVAILABLE = False
    print("WARNING: shap not installed. Run: pip install shap")

from evidence_engine import (
    extract_search_query,
    fetch_reddit_context,
    fetch_news_consensus,
    synthesize_credibility_dossier,
)
from rhetoric_engine import (
    analyze_rhetorical_patterns,
    audit_temporal_timeline,
)


# =========================================================
# APP CONFIGURATION
# =========================================================

app = Flask(__name__)

@app.after_request
def add_cors_headers(response):
    response.headers["Access-Control-Allow-Origin"] = "*"
    response.headers["Access-Control-Allow-Headers"] = "Content-Type,Authorization"
    response.headers["Access-Control-Allow-Methods"] = "GET,POST,OPTIONS"
    return response

load_dotenv()

NEWS_API_KEY = os.getenv("NEWS_API_KEY")
FACTCHECK_API_KEY = os.getenv("FACTCHECK_API_KEY")


# =========================================================
# LOAD ML MODEL
# =========================================================

MODEL_PATH = "model/fake_news_model.pkl"
VECTORIZER_PATH = "model/tfidf_vectorizer.pkl"
SHAP_BACKGROUND_PATH = "model/shap_background.npy"

try:

    model = joblib.load(MODEL_PATH)
    vectorizer = joblib.load(VECTORIZER_PATH)

    MODEL_LOADED = True
    VECTORIZER_LOADED = True

    print("ML model loaded successfully.")
    print("TF-IDF vectorizer loaded successfully.")

except Exception as e:

    model = None
    vectorizer = None

    MODEL_LOADED = False
    VECTORIZER_LOADED = False

    print("ERROR loading ML model/vectorizer:")
    print(e)


# =========================================================
# SHAP EXPLAINER SETUP
# =========================================================

shap_explainer = None
SHAP_READY = False

if SHAP_AVAILABLE and MODEL_LOADED and VECTORIZER_LOADED:
    try:
        if os.path.exists(SHAP_BACKGROUND_PATH):
            # Load the saved mean TF-IDF vector as the SHAP baseline
            background = np.load(SHAP_BACKGROUND_PATH)
        else:
            # Fallback: zero vector as baseline
            n_features = len(vectorizer.get_feature_names_out())
            background = np.zeros((1, n_features))
            print("WARNING: shap_background.npy not found. Using zero baseline.")
            print("Re-run train.py to generate a proper baseline.")

        shap_explainer = shap.LinearExplainer(
            model,
            background,
            feature_perturbation="interventional"
        )

        SHAP_READY = True
        print("SHAP LinearExplainer initialized successfully.")

    except Exception as e:
        shap_explainer = None
        SHAP_READY = False
        print("ERROR initializing SHAP explainer:")
        print(e)


# =========================================================
# TEXT CLEANING
# =========================================================

def clean_text(text):

    if not text:
        return ""

    text = str(text)

    # Remove URLs
    text = re.sub(
        r"http\S+|www\S+",
        " ",
        text
    )

    # Remove HTML
    text = re.sub(
        r"<.*?>",
        " ",
        text
    )

    # Keep letters, numbers and spaces
    text = re.sub(
        r"[^a-zA-Z0-9\s]",
        " ",
        text
    )

    # Remove extra spaces
    text = re.sub(
        r"\s+",
        " ",
        text
    )

    return text.strip()


# =========================================================
# ML CLASSIFICATION
# =========================================================

def classify_text(text):

    """
    TF-IDF + Logistic Regression classifier.

    Returns:
        prediction  (str)   : "REAL", "FAKE", or "UNKNOWN"
        confidence  (float) : percentage confidence (0-100)
        transformed (sparse): TF-IDF matrix for SHAP — None on failure

    IMPORTANT:
    This is a machine-learning signal only.
    It is NOT independent factual verification.
    """

    if model is None or vectorizer is None:

        return "UNKNOWN", 0.0, None

    cleaned = clean_text(text)

    if not cleaned:

        return "UNKNOWN", 0.0, None

    try:

        transformed_text = vectorizer.transform(
            [cleaned]
        )

        prediction = model.predict(
            transformed_text
        )[0]

        confidence = 0.0

        if hasattr(model, "predict_proba"):

            probabilities = model.predict_proba(
                transformed_text
            )[0]

            confidence = float(
                max(probabilities) * 100
            )

        prediction = str(prediction).upper()

        return (
            prediction,
            round(confidence, 2),
            transformed_text
        )

    except Exception as e:

        print("ML classification error:")
        print(e)

        return "UNKNOWN", 0.0, None


# =========================================================
# SHAP EXPLANATION
# =========================================================

def explain_prediction(transformed_text, prediction, top_n=15):

    """
    Use SHAP LinearExplainer to find which words most influenced
    the prediction. Returns a list of dicts:

        [
          { "word": "secret",    "shap": 0.42, "direction": "FAKE" },
          { "word": "president", "shap": 0.12, "direction": "FAKE" },
          { "word": "verified",  "shap": 0.09, "direction": "REAL" },
          ...
        ]

    direction:
        "FAKE" → this word pushed the model toward FAKE
        "REAL" → this word pushed the model toward REAL

    Falls back to empty list if SHAP is unavailable or fails.
    """

    if not SHAP_READY or shap_explainer is None or transformed_text is None:
        return []

    try:
        # Compute SHAP values — shape: (1, n_features)
        # For LogisticRegression with 2 classes, LinearExplainer
        # returns values aligned with model.classes_ ordering.
        shap_values = shap_explainer.shap_values(transformed_text)

        # shap_values may be a list (one array per class) or single array.
        # For binary classification we want the FAKE class.
        classes = list(model.classes_)
        fake_idx = classes.index("FAKE") if "FAKE" in classes else 1

        if isinstance(shap_values, list):
            sv = np.array(shap_values[fake_idx]).flatten()
        else:
            sv = np.array(shap_values).flatten()

        feature_names = vectorizer.get_feature_names_out()

        # Get non-zero TF-IDF entries in the input (only present words)
        cx = transformed_text.tocoo()
        present_indices = set(cx.col.tolist())

        # Collect (word, shap_value) for words actually in the text
        word_shap = []
        for idx in present_indices:
            if idx < len(sv):
                word_shap.append((
                    feature_names[idx],
                    float(sv[idx])
                ))

        # Sort by absolute SHAP value descending
        word_shap.sort(key=lambda x: abs(x[1]), reverse=True)

        top_words = []
        for word, shap_val in word_shap[:top_n]:
            direction = "FAKE" if shap_val > 0 else "REAL"
            top_words.append({
                "word": word,
                "shap": round(abs(shap_val), 4),
                "raw_shap": round(shap_val, 4),
                "direction": direction
            })

        return top_words

    except Exception as e:
        print("SHAP explanation error:")
        print(e)
        return []


# =========================================================
# CLAIM NORMALIZATION
# =========================================================

def normalize_claim(text):

    if not text:
        return ""

    text = text.lower()

    replacements = {

        "uttarpradesh":
            "uttar pradesh",

        "u p":
            "uttar pradesh",

        "cm":
            "chief minister",

        "pm":
            "prime minister"
    }

    for old, new in replacements.items():

        text = text.replace(
            old,
            new
        )

    text = re.sub(
        r"http\S+|www\S+",
        " ",
        text
    )

    text = re.sub(
        r"[^a-z0-9\s]",
        " ",
        text
    )

    text = re.sub(
        r"\s+",
        " ",
        text
    )

    return text.strip()


# =========================================================
# CLAIM SIMILARITY
# =========================================================

def calculate_claim_similarity(
    user_claim,
    fact_claim
):

    user_claim = normalize_claim(
        user_claim
    )

    fact_claim = normalize_claim(
        fact_claim
    )

    if not user_claim or not fact_claim:

        return 0.0

    # -----------------------------------------------------
    # Sequence similarity
    # -----------------------------------------------------

    sequence_score = SequenceMatcher(
        None,
        user_claim,
        fact_claim
    ).ratio()

    # -----------------------------------------------------
    # Word similarity
    # -----------------------------------------------------

    user_words = set(
        user_claim.split()
    )

    fact_words = set(
        fact_claim.split()
    )

    if not user_words or not fact_words:

        jaccard_score = 0.0

    else:

        intersection = (
            user_words.intersection(
                fact_words
            )
        )

        union = (
            user_words.union(
                fact_words
            )
        )

        jaccard_score = (
            len(intersection)
            /
            len(union)
        )

    # -----------------------------------------------------
    # Important words
    # -----------------------------------------------------

    important_user_words = {
        word
        for word in user_words
        if len(word) >= 4
    }

    important_fact_words = {
        word
        for word in fact_words
        if len(word) >= 4
    }

    if important_user_words:

        important_overlap = (
            len(
                important_user_words.intersection(
                    important_fact_words
                )
            )
            /
            len(important_user_words)
        )

    else:

        important_overlap = 0.0

    # -----------------------------------------------------
    # Combined score
    # -----------------------------------------------------

    score = (

        (sequence_score * 0.35)

        +

        (jaccard_score * 0.25)

        +

        (important_overlap * 0.40)
    )

    return round(
        score,
        3
    )


# =========================================================
# FACT CHECK RATING
# =========================================================

def interpret_rating(rating):

    if not rating:

        return "UNKNOWN"

    rating_lower = (
        rating
        .lower()
        .strip()
    )

    false_terms = [

        "false",
        "fake",
        "incorrect",
        "wrong",
        "misleading",
        "pants on fire",
        "not true",
        "mostly false"
    ]

    for term in false_terms:

        if term in rating_lower:

            return "CONTRADICTED"

    true_terms = [

        "true",
        "correct",
        "accurate",
        "verified",
        "mostly true"
    ]

    for term in true_terms:

        if term in rating_lower:

            return "SUPPORTED"

    mixed_terms = [

        "half true",
        "partly true",
        "partially true",
        "mixed",
        "unproven",
        "unclear"
    ]

    for term in mixed_terms:

        if term in rating_lower:

            return "MIXED"

    return "UNKNOWN"


# =========================================================
# GOOGLE FACT CHECK
# =========================================================

def search_fact_checks(query):

    empty_result = {

        "direct_fact_checks": [],

        "related_fact_checks": [],

        "verification_status":
            "INSUFFICIENT EVIDENCE",

        "verification_message":
            "No sufficiently matching fact check was found."
    }

    if not FACTCHECK_API_KEY:

        print(
            "FACTCHECK_API_KEY is not configured."
        )

        return empty_result

    if not query or len(
        query.strip()
    ) < 5:

        return empty_result

    url = (
        "https://factchecktools.googleapis.com/"
        "v1alpha1/claims:search"
    )

    params = {

        "query":
            query,

        "languageCode":
            "en",

        "pageSize":
            10,

        "key":
            FACTCHECK_API_KEY
    }

    try:

        response = requests.get(

            url,

            params=params,

            timeout=15
        )

        print(
            "Fact Check API status:",
            response.status_code
        )

        if response.status_code != 200:

            print(
                "Fact Check API error:",
                response.text
            )

            return empty_result

        data = response.json()

        claims = data.get(
            "claims",
            []
        )

        if not claims:

            return empty_result

        direct_fact_checks = []

        related_fact_checks = []

        for claim in claims:

            claim_text = claim.get(
                "text",
                ""
            ).strip()

            if not claim_text:

                continue

            similarity = (
                calculate_claim_similarity(
                    query,
                    claim_text
                )
            )

            claim_reviews = claim.get(
                "claimReview",
                []
            )

            if not claim_reviews:

                continue

            for review in claim_reviews:

                publisher_data = (
                    review.get(
                        "publisher",
                        {}
                    )
                )

                publisher_name = (
                    publisher_data.get(
                        "name",
                        "Unknown publisher"
                    )
                )

                rating = review.get(
                    "textualRating",
                    "Unknown"
                )

                title = review.get(
                    "title",
                    ""
                )

                review_url = review.get(
                    "url",
                    ""
                )

                review_date = review.get(
                    "reviewDate",
                    ""
                )

                interpretation = (
                    interpret_rating(
                        rating
                    )
                )

                fact_check_item = {

                    "claim":
                        claim_text,

                    "publisher":
                        publisher_name,

                    "rating":
                        rating,

                    "interpretation":
                        interpretation,

                    "title":
                        title,

                    "url":
                        review_url,

                    "review_date":
                        review_date,

                    "similarity":
                        similarity
                }

                # Strong match
                if similarity >= 0.60:

                    direct_fact_checks.append(
                        fact_check_item
                    )

                # Related result
                elif similarity >= 0.30:

                    related_fact_checks.append(
                        fact_check_item
                    )

        # -----------------------------------------------------
        # Remove duplicates
        # -----------------------------------------------------

        def remove_duplicates(items):

            unique = []

            seen = set()

            for item in items:

                key = (

                    item["claim"],

                    item["publisher"],

                    item["rating"]
                )

                if key not in seen:

                    seen.add(key)

                    unique.append(
                        item
                    )

            return unique

        direct_fact_checks = (
            remove_duplicates(
                direct_fact_checks
            )
        )

        related_fact_checks = (
            remove_duplicates(
                related_fact_checks
            )
        )

        # -----------------------------------------------------
        # Sort
        # -----------------------------------------------------

        direct_fact_checks.sort(

            key=lambda x:
                x["similarity"],

            reverse=True
        )

        related_fact_checks.sort(

            key=lambda x:
                x["similarity"],

            reverse=True
        )

        direct_fact_checks = (
            direct_fact_checks[:5]
        )

        related_fact_checks = (
            related_fact_checks[:5]
        )

        # -----------------------------------------------------
        # Determine verification
        # -----------------------------------------------------

        verification_status = (
            "INSUFFICIENT EVIDENCE"
        )

        verification_message = (
            "No sufficiently matching fact check "
            "was found for this claim."
        )

        if direct_fact_checks:

            interpretations = [

                item["interpretation"]

                for item in direct_fact_checks
            ]

            if (
                "CONTRADICTED"
                in interpretations
            ):

                verification_status = (
                    "CONTRADICTED"
                )

                verification_message = (
                    "A closely matching fact check "
                    "contains a rating indicating "
                    "that the claim is false or misleading."
                )

            elif (
                "SUPPORTED"
                in interpretations
            ):

                verification_status = (
                    "VERIFIED"
                )

                verification_message = (
                    "A closely matching fact check "
                    "contains a rating supporting the claim."
                )

            else:

                verification_status = (
                    "INSUFFICIENT EVIDENCE"
                )

                verification_message = (
                    "A closely related fact check was found, "
                    "but its rating does not provide clear "
                    "verification."
                )

        return {

            "direct_fact_checks":
                direct_fact_checks,

            "related_fact_checks":
                related_fact_checks,

            "verification_status":
                verification_status,

            "verification_message":
                verification_message
        }

    except requests.exceptions.Timeout:

        return {

            "direct_fact_checks": [],

            "related_fact_checks": [],

            "verification_status":
                "INSUFFICIENT EVIDENCE",

            "verification_message":
                "Fact-check service timed out."
        }

    except requests.exceptions.RequestException as e:

        print(
            "Fact Check API request error:"
        )

        print(e)

        return {

            "direct_fact_checks": [],

            "related_fact_checks": [],

            "verification_status":
                "INSUFFICIENT EVIDENCE",

            "verification_message":
                "Fact-check service could not be reached."
        }

    except Exception as e:

        print(
            "Fact Check processing error:"
        )

        print(e)

        return empty_result


# =========================================================
# HOME / API ROOT
# =========================================================

@app.route("/")
def home():
    return jsonify({
        "status": "online",
        "service": "TruthLens Backend API",
        "version": "2.0.0"
    })


# =========================================================
# PREDICT / FACT CHECK
# =========================================================

@app.route(
    "/predict",
    methods=["POST"]
)
def predict():

    try:

        data = request.get_json()

        if not data:

            return jsonify({

                "success":
                    False,

                "error":
                    "No JSON data received."
            }), 400

        text = data.get(
            "text",
            ""
        ).strip()

        if not text:

            return jsonify({

                "success":
                    False,

                "error":
                    "Please enter some text."
            }), 400

        if len(text) < 5:

            return jsonify({

                "success":
                    False,

                "error":
                    "Please enter a longer claim or article."
            }), 400

        # ML + SHAP
        prediction, confidence, transformed_text = (
            classify_text(text)
        )

        shap_words = explain_prediction(
            transformed_text,
            prediction
        )

        # Fact Check (Institutional)
        fact_check_result = (
            search_fact_checks(
                text
            )
        )

        all_fact_checks = (
            fact_check_result.get("direct_fact_checks", []) +
            fact_check_result.get("related_fact_checks", [])
        )

        # Community Stance (Reddit) & Live Web Consensus
        search_query = extract_search_query(text)
        reddit_threads = fetch_reddit_context(search_query, limit=5)
        news_consensus = fetch_news_consensus(search_query, limit=5, raw_claim=text)

        # Research-backed multi-source stance synthesis
        dossier = synthesize_credibility_dossier(
            prediction,
            confidence,
            all_fact_checks,
            reddit_threads,
            news_consensus
        )

        # Deep Rhetorical & Cognitive Vulnerability Audit
        rhetoric_analysis = analyze_rhetorical_patterns(text)

        # Temporal Anomaly / Timeline Recirculation Check
        temporal_audit = audit_temporal_timeline(text, news_consensus)

        final_truth_status = dossier.get("final_truth_status", prediction)

        return jsonify({
            "success": True,
            "prediction": prediction,
            "confidence": confidence,
            "final_truth_status": final_truth_status,
            "shap_words": shap_words,
            "shap_available": SHAP_READY,
            "verification_status": fact_check_result["verification_status"],
            "verification_message": fact_check_result["verification_message"],
            "direct_fact_checks": fact_check_result["direct_fact_checks"],
            "related_fact_checks": fact_check_result["related_fact_checks"],
            "direct_fact_check_count": len(fact_check_result["direct_fact_checks"]),
            "related_fact_check_count": len(fact_check_result["related_fact_checks"]),
            "reddit_threads": reddit_threads,
            "news_consensus": news_consensus,
            "research_dossier": dossier,
            "rhetoric_analysis": rhetoric_analysis,
            "temporal_audit": temporal_audit,
            "disclaimer": "Truth status is cross-referenced in real-time with verified news consensus and institutional fact checks."
        })

    except Exception as e:

        print(
            "Prediction endpoint error:"
        )

        print(e)

        return jsonify({

            "success":
                False,

            "error":
                "Something went wrong while analyzing the claim."
        }), 500


# =========================================================
# NEWS ARTICLE FORMATTER
# =========================================================
# =========================================================
# NEWS ARTICLE FORMATTER
# =========================================================

def process_news_articles(articles):

    processed_articles = []

    for article in articles:

        title = article.get(
            "title",
            ""
        )

        description = article.get(
            "description",
            ""
        )

        content = article.get(
            "content",
            ""
        )

        article_url = article.get(
            "url",
            ""
        )

        image_url = article.get(
            "urlToImage",
            ""
        )

        author = article.get(
            "author",
            ""
        )

        published_at = article.get(
            "publishedAt",
            ""
        )

        source = article.get(
            "source",
            {}
        )

        source_name = source.get(
            "name",
            "Unknown"
        )


        # Skip completely empty articles
        if not title and not description:
            continue


        processed_articles.append({

            "title":
                title,

            "description":
                description,

            "content":
                content,

            "source":
                source_name,

            "author":
                author,

            "url":
                article_url,

            "image":
                image_url,

            "publishedAt":
                published_at

        })


    return processed_articles
# =========================================================
# LIVE NEWS
# =========================================================

@app.route(
    "/live-news",
    methods=["GET"]
)
def live_news():

    if not NEWS_API_KEY:

        return jsonify({

            "success":
                False,

            "error":
                "NEWS_API_KEY is not configured.",

            "articles":
                []
        }), 500

    category = request.args.get(
        "category",
        "general"
    )

    page = request.args.get(
        "page",
        1,
        type=int
    )

    page_size = request.args.get(
        "pageSize",
        20,
        type=int
    )

    allowed_categories = [

        "business",
        "entertainment",
        "general",
        "health",
        "science",
        "sports",
        "technology"
    ]

    if category not in allowed_categories:

        category = "general"

    page = max(
        1,
        page
    )

    page_size = max(
        1,
        min(
            page_size,
            20
        )
    )

    headers = {

        "X-Api-Key":
            NEWS_API_KEY
    }

    try:

        # =================================================
        # PRIMARY: GOOGLE NEWS INDIA
        # =================================================

        url = (
            "https://newsapi.org/v2/top-headlines"
        )

        params = {

            "sources":
                "google-news-in",

            "page":
                page,

            "pageSize":
                page_size
        }

        print("")
        print(
            "======================================"
        )
        print(
            "       TRUTHLENS LIVE NEWS"
        )
        print(
            "======================================"
        )
        print(
            "Source: Google News India"
        )
        print(
            "Category:",
            category
        )
        print(
            "Page:",
            page
        )

        response = requests.get(

            url,

            params=params,

            headers=headers,

            timeout=15
        )

        print(
            "NewsAPI status:",
            response.status_code
        )

        if response.status_code != 200:

            print(
                "NewsAPI error:",
                response.text
            )

            return jsonify({

                "success":
                    False,

                "error":
                    "News API request failed.",

                "details":
                    response.text,

                "articles":
                    []
            }), response.status_code

        data = response.json()

        raw_articles = data.get(
            "articles",
            []
        )

        # =================================================
        # CATEGORY FILTER
        # =================================================
        #
        # Google News India source itself is general.
        # For category-specific feeds we use keyword
        # filtering on the returned headlines.
        # =================================================

        category_keywords = {

            "technology": [
                "technology",
                "tech",
                "ai",
                "artificial intelligence",
                "software",
                "google",
                "apple",
                "microsoft",
                "openai",
                "cyber",
                "smartphone"
            ],

            "business": [
                "business",
                "market",
                "stock",
                "shares",
                "economy",
                "bank",
                "company",
                "finance",
                "rupee",
                "investment"
            ],

            "sports": [
                "cricket",
                "football",
                "tennis",
                "sports",
                "ipl",
                "match",
                "player",
                "olympics",
                "fifa",
                "wicket"
            ],

            "science": [
                "science",
                "space",
                "nasa",
                "isro",
                "research",
                "scientist",
                "climate",
                "physics",
                "biology"
            ],

            "health": [
                "health",
                "hospital",
                "doctor",
                "disease",
                "medicine",
                "medical",
                "healthcare",
                "virus",
                "vaccine"
            ],

            "entertainment": [
                "movie",
                "film",
                "actor",
                "actress",
                "bollywood",
                "hollywood",
                "music",
                "celebrity",
                "series",
                "netflix"
            ]
        }

        if category != "general":

            keywords = category_keywords.get(
                category,
                []
            )

            filtered_articles = []

            for article in raw_articles:

                text = " ".join([

                    article.get(
                        "title",
                        ""
                    ),

                    article.get(
                        "description",
                        ""
                    )
                ]).lower()

                if any(
                    keyword in text
                    for keyword in keywords
                ):

                    filtered_articles.append(
                        article
                    )

            # If filtering removed everything,
            # don't falsely claim category news.
            raw_articles = filtered_articles

        articles = process_news_articles(
            raw_articles
        )

        print(
            "Articles received:",
            len(raw_articles)
        )

        print(
            "Articles processed:",
            len(articles)
        )

        print(
            "======================================"
        )

        return jsonify({

            "success":
                True,

            "source":
                "Google News India",

            "category":
                category,

            "page":
                page,

            "pageSize":
                page_size,

            "totalResults":
                data.get(
                    "totalResults",
                    len(articles)
                ),

            "articles":
                articles
        })

    except requests.exceptions.Timeout:

        return jsonify({

            "success":
                False,

            "error":
                "News API request timed out.",

            "articles":
                []
        }), 504

    except requests.exceptions.RequestException as e:

        print(
            "NewsAPI request error:"
        )

        print(e)

        return jsonify({

            "success":
                False,

            "error":
                "Could not connect to News API.",

            "articles":
                []
        }), 500

    except Exception as e:

        print(
            "Live news error:"
        )

        print(e)

        return jsonify({

            "success":
                False,

            "error":
                "Could not load live news.",

            "articles":
                []
        }), 500


# =========================================================
# SEARCH NEWS
# =========================================================

@app.route(
    "/search-news",
    methods=["GET"]
)
def search_news():

    if not NEWS_API_KEY:

        return jsonify({

            "success":
                False,

            "error":
                "NEWS_API_KEY is not configured.",

            "articles":
                []
        }), 500

    query = request.args.get(
        "q",
        ""
    ).strip()

    page = request.args.get(
        "page",
        1,
        type=int
    )

    page_size = request.args.get(
        "pageSize",
        20,
        type=int
    )

    if not query:

        return jsonify({

            "success":
                False,

            "error":
                "Please provide a search query.",

            "articles":
                []
        }), 400

    if len(query) < 2:

        return jsonify({

            "success":
                False,

            "error":
                "Search query is too short.",

            "articles":
                []
        }), 400

    page = max(
        1,
        page
    )

    page_size = max(
        1,
        min(
            page_size,
            20
        )
    )

    url = (
        "https://newsapi.org/v2/everything"
    )

    params = {

        "q":
            query,

        "language":
            "en",

        "sortBy":
            "publishedAt",

        "page":
            page,

        "pageSize":
            page_size
    }

    headers = {

        "X-Api-Key":
            NEWS_API_KEY
    }

    try:

        response = requests.get(

            url,

            params=params,

            headers=headers,

            timeout=15
        )

        print(
            "News search status:",
            response.status_code
        )

        if response.status_code != 200:

            print(
                "News search error:",
                response.text
            )

            return jsonify({

                "success":
                    False,

                "error":
                    "News search request failed.",

                "details":
                    response.text,

                "articles":
                    []
            }), response.status_code

        data = response.json()

        articles = process_news_articles(

            data.get(
                "articles",
                []
            )
        )

        return jsonify({

            "success":
                True,

            "query":
                query,

            "page":
                page,

            "pageSize":
                page_size,

            "totalResults":
                data.get(
                    "totalResults",
                    len(articles)
                ),

            "articles":
                articles
        })

    except requests.exceptions.Timeout:

        return jsonify({

            "success":
                False,

            "error":
                "News search timed out.",

            "articles":
                []
        }), 504

    except requests.exceptions.RequestException as e:

        print(
            "News search request error:"
        )

        print(e)

        return jsonify({

            "success":
                False,

            "error":
                "Could not connect to News API.",

            "articles":
                []
        }), 500

    except Exception as e:

        print(
            "News search error:"
        )

        print(e)

        return jsonify({

            "success":
                False,

            "error":
                "Could not search news.",

            "articles":
                []
        }), 500


# =========================================================
# HEALTH CHECK
# =========================================================

@app.route(
    "/health",
    methods=["GET"]
)
def health():

    return jsonify({

        "status":
            "online",

        "model_loaded":
            MODEL_LOADED,

        "vectorizer_loaded":
            VECTORIZER_LOADED,

        "shap_ready":
            SHAP_READY,

        "shap_available":
            SHAP_AVAILABLE,

        "news_api_configured":
            bool(
                NEWS_API_KEY
            ),

        "factcheck_api_configured":
            bool(
                FACTCHECK_API_KEY
            )
    })


# =========================================================
# DEDICATED CONTEXT VERIFICATION ENDPOINT
# =========================================================

@app.route("/verify-context", methods=["POST"])
def verify_context():
    """
    Stand-alone context & stance validation endpoint.
    Ideal for lightweight extensions, social feed inspection, or external bots.
    """
    try:
        data = request.get_json() or {}
        text = data.get("text", "").strip()

        if not text:
            return jsonify({
                "success": False,
                "error": "No text provided for context verification."
            }), 400

        query = extract_search_query(text)
        reddit_threads = fetch_reddit_context(query, limit=5)
        news_consensus = fetch_news_consensus(query, limit=5)
        fact_check_result = search_fact_checks(text)

        all_fact_checks = (
            fact_check_result.get("direct_fact_checks", []) +
            fact_check_result.get("related_fact_checks", [])
        )

        dossier = synthesize_credibility_dossier(
            "UNKNOWN",
            0.0,
            all_fact_checks,
            reddit_threads,
            news_consensus
        )

        return jsonify({
            "success": True,
            "query": query,
            "research_dossier": dossier,
            "reddit_threads": reddit_threads,
            "news_consensus": news_consensus,
            "fact_checks": all_fact_checks
        })

    except Exception as e:
        print("verify_context error:", e)
        return jsonify({
            "success": False,
            "error": "Context verification engine encountered an issue."
        }), 500


# =========================================================
# RUN SERVER
# =========================================================

if __name__ == "__main__":

    print("")

    print(
        "======================================"
    )

    print(
        "          TRUTHLENS SERVER"
    )

    print(
        "======================================"
    )

    print(

        "ML Model:",

        "READY"
        if MODEL_LOADED
        else
        "ERROR"
    )

    print(

        "Vectorizer:",

        "READY"
        if VECTORIZER_LOADED
        else
        "ERROR"
    )

    print(

        "NewsAPI:",

        "CONFIGURED"
        if NEWS_API_KEY
        else
        "MISSING"
    )

    print(

        "Fact Check API:",

        "CONFIGURED"
        if FACTCHECK_API_KEY
        else
        "MISSING"
    )

    print(
        "======================================"
    )

    print("")

    app.run(

        debug=True,

        host="127.0.0.1",

        port=5000
    )
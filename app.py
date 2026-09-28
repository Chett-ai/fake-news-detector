"""
app.py
------
Flask web application for the Fake News Detector.

Loads the trained model + TF-IDF vectorizer (produced by train.py) and
serves a simple web UI + JSON API for classifying news article text as
REAL or FAKE.

Usage:
    python app.py
"""

import os
import re
import joblib
from flask import Flask, request, jsonify, render_template

MODEL_DIR = "model"
MODEL_PATH = os.path.join(MODEL_DIR, "fake_news_model.pkl")
VECTORIZER_PATH = os.path.join(MODEL_DIR, "tfidf_vectorizer.pkl")

app = Flask(__name__)

model = None
vectorizer = None
load_error = None

try:
    model = joblib.load(MODEL_PATH)
    vectorizer = joblib.load(VECTORIZER_PATH)
except FileNotFoundError:
    load_error = (
        "Model files not found. Run 'python train.py' first to train the "
        "model and generate model/fake_news_model.pkl and "
        "model/tfidf_vectorizer.pkl."
    )


def clean_text(text: str) -> str:
    """Basic cleanup applied to user input before vectorizing."""
    text = text.strip()
    text = re.sub(r"\s+", " ", text)
    return text


@app.route("/")
def index():
    return render_template("index.html")


@app.route("/predict", methods=["POST"])
def predict():
    if load_error:
        return jsonify({"error": load_error}), 503

    data = request.get_json(silent=True) or {}
    text = data.get("text", "")

    if not isinstance(text, str) or not text.strip():
        return jsonify({"error": "Please provide non-empty article text."}), 400

    cleaned = clean_text(text)
    features = vectorizer.transform([cleaned])

    prediction = model.predict(features)[0]

    # Confidence, when the model supports probability estimates
    confidence = None
    if hasattr(model, "predict_proba"):
        proba = model.predict_proba(features)[0]
        classes = list(model.classes_)
        confidence = round(float(max(proba)) * 100, 2)
        _ = classes  # classes available if per-class breakdown is needed later

    return jsonify({
        "prediction": prediction,
        "confidence": confidence
    })


@app.route("/health")
def health():
    status = "ok" if not load_error else "model_not_loaded"
    return jsonify({"status": status})


if __name__ == "__main__":
    app.run(debug=True)

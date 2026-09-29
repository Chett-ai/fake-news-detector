"""
train.py
--------
Trains a Logistic Regression model to classify news articles as REAL or FAKE.

Pipeline:
    1. Load CSV dataset (dataset/news.csv)
    2. Remove missing values
    3. Remove duplicate records
    4. Separate text and labels
    5. Split into train/test sets
    6. Convert text to TF-IDF features
    7. Train Logistic Regression model
    8. Evaluate (accuracy, precision, recall, F1)
    9. Save the trained model and vectorizer to model/

Usage:
    python train.py
"""

import os
import numpy as np
import pandas as pd
import joblib

from sklearn.model_selection import train_test_split
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import accuracy_score, precision_score, recall_score, f1_score, classification_report

DATASET_PATH = os.path.join("dataset", "news.csv")
MODEL_DIR = "model"
MODEL_PATH = os.path.join(MODEL_DIR, "fake_news_model.pkl")
VECTORIZER_PATH = os.path.join(MODEL_DIR, "tfidf_vectorizer.pkl")

REQUIRED_COLUMNS = ["text", "label"]
VALID_LABELS = {"REAL", "FAKE"}


def load_dataset(path: str) -> pd.DataFrame:
    if not os.path.exists(path):
        raise FileNotFoundError(
            f"Could not find dataset at '{path}'.\n"
            f"Place a CSV file with columns {REQUIRED_COLUMNS} "
            f"(label values: {sorted(VALID_LABELS)}) at that location."
        )

    df = pd.read_csv(path)

    missing_cols = [c for c in REQUIRED_COLUMNS if c not in df.columns]
    if missing_cols:
        raise ValueError(f"Dataset is missing required column(s): {missing_cols}")

    return df


def clean_dataset(df: pd.DataFrame) -> pd.DataFrame:
    before = len(df)

    # Remove missing values in required columns
    df = df.dropna(subset=REQUIRED_COLUMNS)

    # Normalize label casing, then drop rows with unexpected labels
    df["label"] = df["label"].astype(str).str.strip().str.upper()
    df = df[df["label"].isin(VALID_LABELS)]

    # Remove duplicate records
    df = df.drop_duplicates(subset=["text"])

    after = len(df)
    print(f"Cleaned dataset: {before} -> {after} rows "
          f"({before - after} rows removed for missing/duplicate/invalid data).")

    return df.reset_index(drop=True)


def main():
    print("Loading dataset...")
    df = load_dataset(DATASET_PATH)

    print("Cleaning dataset...")
    df = clean_dataset(df)

    if df.empty:
        raise ValueError("No usable rows remain after cleaning. Check your dataset.")

    print("Label distribution:")
    print(df["label"].value_counts())

    X = df["text"]
    y = df["label"]

    print("\nSplitting into train/test sets (80/20)...")
    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.2, random_state=42, stratify=y
    )

    print("Vectorizing text with TF-IDF...")
    vectorizer = TfidfVectorizer(stop_words="english")
    X_train_tfidf = vectorizer.fit_transform(X_train)
    X_test_tfidf = vectorizer.transform(X_test)

    print("Training Logistic Regression model...")
    model = LogisticRegression(max_iter=1000)
    model.fit(X_train_tfidf, y_train)

    print("\nEvaluating model...")
    y_pred = model.predict(X_test_tfidf)

    accuracy = accuracy_score(y_test, y_pred)
    precision = precision_score(y_test, y_pred, pos_label="FAKE")
    recall = recall_score(y_test, y_pred, pos_label="FAKE")
    f1 = f1_score(y_test, y_pred, pos_label="FAKE")

    print(f"Accuracy:  {accuracy:.4f}")
    print(f"Precision: {precision:.4f} (positive class: FAKE)")
    print(f"Recall:    {recall:.4f} (positive class: FAKE)")
    print(f"F1-score:  {f1:.4f}")
    print("\nFull classification report:")
    print(classification_report(y_test, y_pred))

    os.makedirs(MODEL_DIR, exist_ok=True)
    joblib.dump(model, MODEL_PATH)
    joblib.dump(vectorizer, VECTORIZER_PATH)

    # ----------------------------------------------------------
    # Save SHAP background: mean TF-IDF vector across training set
    # Used by shap.LinearExplainer as the baseline ("expected")
    # feature vector at inference time.
    # ----------------------------------------------------------
    background_mean = np.array(X_train_tfidf.mean(axis=0))
    shap_background_path = os.path.join(MODEL_DIR, "shap_background.npy")
    np.save(shap_background_path, background_mean)

    print(f"\nSaved model to          {MODEL_PATH}")
    print(f"Saved vectorizer to     {VECTORIZER_PATH}")
    print(f"Saved SHAP background to {shap_background_path}")


if __name__ == "__main__":
    main()

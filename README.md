# Fake News Detector

A web application that predicts whether a given news article is **REAL** or **FAKE**
using a trained machine learning model (TF-IDF + Logistic Regression).

## Project Structure

```
fake-news-detector/
├── dataset/
│   └── news.csv          # Your dataset goes here (not included)
├── model/
│   ├── fake_news_model.pkl      # Created by train.py
│   └── tfidf_vectorizer.pkl     # Created by train.py
├── templates/
│   └── index.html
├── static/
│   ├── style.css
│   └── script.js
├── train.py
├── app.py
├── requirements.txt
└── README.md
```

## Dataset

Place a CSV file at `dataset/news.csv` with at least these columns:

| column | description                          |
|--------|---------------------------------------|
| text   | the full text of the news article     |
| label  | `REAL` or `FAKE`                      |

A commonly used public dataset for this exact task is the "Fake and real news
dataset" / "news.csv" dataset used in several fake-news-detection tutorials —
search for "fake news detection news.csv dataset" if you don't already have one.

## Setup

1. **Install dependencies**

   ```bash
   pip install -r requirements.txt
   ```

2. **Add your dataset**

   Copy your `news.csv` file into the `dataset/` folder.

3. **Train the model**

   ```bash
   python train.py
   ```

   This will:
   - Load and clean the dataset (drop missing values & duplicates)
   - Split into train/test sets (80/20)
   - Vectorize text with TF-IDF (English stop words removed)
   - Train a Logistic Regression classifier
   - Print accuracy, precision, recall, and F1-score
   - Save `model/fake_news_model.pkl` and `model/tfidf_vectorizer.pkl`

4. **Run the web app**

   ```bash
   python app.py
   ```

   Then open **http://127.0.0.1:5000** in your browser.

## Using the App

1. Paste a news article's text into the text box.
2. Click **Check News**.
3. The app displays the prediction (**REAL** or **FAKE**) along with a
   confidence percentage.
4. Click **Clear** to reset the input and try another article.

## API

The frontend calls a simple JSON API you can also use directly:

**POST** `/predict`

```json
{ "text": "Some news article text..." }
```

Response:

```json
{ "prediction": "FAKE", "confidence": 87.42 }
```

**GET** `/health` — returns whether the model has loaded successfully.

## Notes

- If you run `app.py` before `python train.py`, the app will start but
  `/predict` will return a 503 error explaining that the model needs to be
  trained first.
- This is a statistical text-classification model, not a fact-checking
  system — treat predictions as a signal, not a verdict.

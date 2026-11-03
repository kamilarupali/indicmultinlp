"""Train a TF-IDF + logistic regression text classifier from CSV."""
from pathlib import Path
import argparse

import joblib
import pandas as pd
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.linear_model import LogisticRegression
from sklearn.pipeline import Pipeline

def train(csv_path: str, text_col: str, label_col: str, output: str):
    frame = pd.read_csv(csv_path).dropna(subset=[text_col, label_col])
    if len(frame) < 2 or frame[label_col].nunique() < 2:
        raise ValueError("Training requires at least two rows and two distinct labels.")
    model = Pipeline([("tfidf", TfidfVectorizer(ngram_range=(1, 2), min_df=1, max_features=50000)), ("classifier", LogisticRegression(max_iter=1000, class_weight="balanced", random_state=42))])
    model.fit(frame[text_col].astype(str), frame[label_col].astype(str))
    Path(output).parent.mkdir(parents=True, exist_ok=True)
    joblib.dump(model, output)
    return model

if __name__ == "__main__":
    p = argparse.ArgumentParser(); p.add_argument("csv"); p.add_argument("--text", default="text"); p.add_argument("--label", default="sentiment"); p.add_argument("--output", default="models/sentiment/tfidf_lr.joblib")
    a = p.parse_args(); train(a.csv, a.text, a.label, a.output); print(f"Saved model to {a.output}")

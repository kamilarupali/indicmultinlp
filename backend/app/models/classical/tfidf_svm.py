"""Train a TF-IDF + linear SVM text classifier from a labeled CSV."""
import argparse
from pathlib import Path

import joblib
import pandas as pd
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.pipeline import Pipeline
from sklearn.svm import LinearSVC

def build_model():
    return Pipeline([("tfidf", TfidfVectorizer(ngram_range=(1, 2), min_df=1, max_features=50000)), ("classifier", LinearSVC(class_weight="balanced"))])


def train(csv_path: str, text_col: str, label_col: str, output: str):
    frame = pd.read_csv(csv_path).dropna(subset=[text_col, label_col])
    if len(frame) < 2 or frame[label_col].nunique() < 2:
        raise ValueError("Training requires at least two rows and two distinct labels.")
    model = build_model()
    model.fit(frame[text_col].astype(str), frame[label_col].astype(str))
    Path(output).parent.mkdir(parents=True, exist_ok=True)
    joblib.dump(model, output)
    return model


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("csv")
    parser.add_argument("--text", default="text")
    parser.add_argument("--label", default="sentiment")
    parser.add_argument("--output", default="models/sentiment/tfidf_svm.joblib")
    args = parser.parse_args()
    train(args.csv, args.text, args.label, args.output)
    print(f"Saved model to {args.output}")

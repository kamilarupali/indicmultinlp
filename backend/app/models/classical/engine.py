"""Resilient Classical ML Engine with automatic scikit-learn / pure-NumPy dispatch."""
from __future__ import annotations

import math
from collections import Counter
import numpy as np


class PureTfidfVectorizer:
    def __init__(self, ngram_range: tuple[int, int] = (1, 2), min_df: int = 1, max_features: int = 50000):
        self.ngram_range = ngram_range
        self.min_df = min_df
        self.max_features = max_features
        self.vocabulary_: dict[str, int] = {}
        self.idf_: np.ndarray = np.array([], dtype=np.float32)

    def _extract_ngrams(self, text: str) -> list[str]:
        words = str(text).casefold().split()
        ngrams: list[str] = []
        min_n, max_n = self.ngram_range
        for n in range(min_n, max_n + 1):
            for i in range(len(words) - n + 1):
                ngrams.append(" ".join(words[i:i + n]))
        return ngrams

    def fit(self, texts, y=None):
        doc_counts: Counter[str] = Counter()
        text_list = list(texts)
        n_docs = len(text_list)
        for t in text_list:
            unique_terms = set(self._extract_ngrams(t))
            for term in unique_terms:
                doc_counts[term] += 1

        filtered = [term for term, count in doc_counts.items() if count >= self.min_df]
        sorted_terms = sorted(filtered, key=lambda t: (-doc_counts[t], t))[:self.max_features]
        self.vocabulary_ = {term: idx for idx, term in enumerate(sorted_terms)}
        idfs = [math.log((1.0 + n_docs) / (1.0 + doc_counts[term])) + 1.0 for term in sorted_terms]
        self.idf_ = np.array(idfs, dtype=np.float32) if idfs else np.array([1.0], dtype=np.float32)
        return self

    def transform(self, texts) -> np.ndarray:
        text_list = list(texts)
        n_docs = len(text_list)
        n_feats = len(self.vocabulary_)
        if n_feats == 0:
            return np.zeros((n_docs, 1), dtype=np.float32)

        X = np.zeros((n_docs, n_feats), dtype=np.float32)
        for i, t in enumerate(text_list):
            counts = Counter(self._extract_ngrams(t))
            for term, count in counts.items():
                if term in self.vocabulary_:
                    idx = self.vocabulary_[term]
                    X[i, idx] = float(count) * self.idf_[idx]
            norm = float(np.linalg.norm(X[i]))
            if norm > 0.0:
                X[i] /= norm
        return X

    def fit_transform(self, texts, y=None) -> np.ndarray:
        return self.fit(texts, y).transform(texts)


class PureLinearClassifier:
    def __init__(self, loss: str = "log_loss", max_iter: int = 300, lr: float = 0.12, alpha: float = 0.0005, random_state: int = 42):
        self.loss = loss
        self.max_iter = max_iter
        self.lr = lr
        self.alpha = alpha
        self.random_state = random_state
        self.classes_: list[str] = []
        self.W_: np.ndarray = np.array([], dtype=np.float32)
        self.b_: np.ndarray = np.array([], dtype=np.float32)

    def fit(self, X: np.ndarray, y):
        y_list = [str(val) for val in y]
        self.classes_ = sorted(list(set(y_list)))
        n_samples, n_features = X.shape
        n_classes = len(self.classes_)
        class_to_idx = {c: i for i, c in enumerate(self.classes_)}
        y_indices = np.array([class_to_idx[val] for val in y_list], dtype=np.int32)

        np.random.seed(self.random_state)
        self.W_ = np.zeros((n_classes, n_features), dtype=np.float32)
        self.b_ = np.zeros(n_classes, dtype=np.float32)

        for epoch in range(self.max_iter):
            indices = np.random.permutation(n_samples)
            current_lr = self.lr / (1.0 + 0.005 * epoch)
            for i in indices:
                xi = X[i]
                target = y_indices[i]
                scores = np.dot(self.W_, xi) + self.b_

                if self.loss == "log_loss":
                    exp_s = np.exp(scores - np.max(scores))
                    probs = exp_s / np.sum(exp_s)
                    grad_scores = probs.copy()
                    grad_scores[target] -= 1.0
                    self.W_ -= current_lr * (np.outer(grad_scores, xi) + self.alpha * self.W_)
                    self.b_ -= current_lr * grad_scores
                else:  # Hinge loss (Linear SVM)
                    for c in range(n_classes):
                        y_binary = 1.0 if c == target else -1.0
                        margin = y_binary * scores[c]
                        if margin < 1.0:
                            self.W_[c] += current_lr * (y_binary * xi - self.alpha * self.W_[c])
                            self.b_[c] += current_lr * y_binary
                        else:
                            self.W_[c] -= current_lr * self.alpha * self.W_[c]
        return self

    def decision_function(self, X: np.ndarray) -> np.ndarray:
        if X.ndim == 1:
            X = X.reshape(1, -1)
        return np.dot(X, self.W_.T) + self.b_

    def predict_proba(self, X: np.ndarray) -> np.ndarray:
        scores = self.decision_function(X)
        exp_s = np.exp(scores - np.max(scores, axis=-1, keepdims=True))
        return exp_s / np.sum(exp_s, axis=-1, keepdims=True)

    def predict(self, X: np.ndarray) -> np.ndarray:
        scores = self.decision_function(X)
        indices = np.argmax(scores, axis=-1)
        return np.array([self.classes_[idx] for idx in indices])


class PurePipeline:
    def __init__(self, steps: list[tuple[str, any]]):
        self.steps = steps
        self.named_steps = {name: step for name, step in steps}

    def fit(self, texts, y):
        X = texts
        for name, step in self.steps[:-1]:
            X = step.fit_transform(X, y)
        self.steps[-1][1].fit(X, y)
        return self

    def predict(self, texts):
        X = texts
        for name, step in self.steps[:-1]:
            X = step.transform(X)
        return self.steps[-1][1].predict(X)

    def predict_proba(self, texts):
        X = texts
        for name, step in self.steps[:-1]:
            X = step.transform(X)
        classifier = self.steps[-1][1]
        if hasattr(classifier, "predict_proba"):
            return classifier.predict_proba(X)
        # Softmax over decision function for SVM
        scores = classifier.decision_function(X)
        exp_s = np.exp(scores - np.max(scores, axis=-1, keepdims=True))
        return exp_s / np.sum(exp_s, axis=-1, keepdims=True)

    def decision_function(self, texts):
        X = texts
        for name, step in self.steps[:-1]:
            X = step.transform(X)
        return self.steps[-1][1].decision_function(X)


def create_classifier_pipeline(family: str = "tfidf_lr") -> any:
    """Build a TF-IDF classifier pipeline using scikit-learn or fallback engine."""
    try:
        from sklearn.feature_extraction.text import TfidfVectorizer
        from sklearn.linear_model import LogisticRegression
        from sklearn.pipeline import Pipeline
        from sklearn.svm import LinearSVC

        estimator = (
            LogisticRegression(max_iter=1000, class_weight="balanced", random_state=42)
            if family == "tfidf_lr"
            else LinearSVC(class_weight="balanced", random_state=42)
        )
        return Pipeline([
            ("tfidf", TfidfVectorizer(ngram_range=(1, 2), min_df=1, max_features=50000)),
            ("classifier", estimator),
        ])
    except ImportError:
        loss = "log_loss" if family == "tfidf_lr" else "hinge"
        return PurePipeline([
            ("tfidf", PureTfidfVectorizer(ngram_range=(1, 2), min_df=1, max_features=50000)),
            ("classifier", PureLinearClassifier(loss=loss, random_state=42)),
        ])


def dump_artifact(obj: any, path: any) -> None:
    try:
        import joblib
        joblib.dump(obj, path)
    except ImportError:
        import pickle
        with open(path, "wb") as f:
            pickle.dump(obj, f)


def load_artifact(path: any) -> any:
    try:
        import joblib
        return joblib.load(path)
    except ImportError:
        import pickle
        with open(path, "rb") as f:
            return pickle.load(f)

from __future__ import annotations

import json
from datetime import datetime, timezone
from uuid import uuid4

import pandas as pd

from app.models.classical.engine import create_classifier_pipeline
from app.services.model_service import FAMILIES
from app.utils.metrics import classification_metrics
from app.utils.paths import EXPERIMENTS_DIR, resolve_data_file

EXPERIMENT_CATEGORIES = {
    "language_identification", "sentiment", "intent", "native_vs_romanized",
    "monolingual_vs_codemixed", "ablation", "error_analysis",
}


def _categorize_error(text: str, expected: str, predicted: str) -> tuple[str, str]:
    lower = text.lower()
    negation_cues = {"not", "nahi", "ledu", "kaledu", "illa", "illai", "kevalama", "unclean", "delay", "baledu", "bekar"}
    has_neg = any(c in lower for c in negation_cues)
    is_mixed = any(ord(c) > 127 for c in text) and any(c.isascii() and c.isalpha() for c in text)
    is_roman = all(ord(c) < 128 for c in text) and any(w in lower for w in ("chala", "bagundi", "bahut", "acchi", "nalla", "chennagide", "kooda", "oota", "saapadu"))

    if has_neg:
        return "Negation & Polarity Reversal", "Sentence contains a morphological or lexical negation marker that inverted local polarity, which n-gram TF-IDF failed to capture."
    if is_mixed:
        return "Code-Mixing & Matrix Language Switching", "Code-switching across scripts weakened token feature weights in both native and borrowed vocabulary spaces."
    if is_roman:
        return "Romanization / Phonetic Ambiguity", "Informal phonetic spelling in Latin script produced sub-optimal subword alignments and out-of-vocabulary mismatches."
    if len(text.split()) <= 4:
        return "Lexical Ambiguity & Polysemy", "Short context window with insufficient discriminative n-gram cues led to ambiguous classification boundary."
    return "Rare Word / OOV", "Domain-specific vocabulary or low-frequency Indic n-grams received near-zero TF-IDF weight."


def _get_confusion_matrix(y_true, y_pred, labels: list[str]) -> list[list[int]]:
    try:
        from sklearn.metrics import confusion_matrix
        return confusion_matrix(y_true, y_pred, labels=labels).tolist()
    except ImportError:
        matrix = [[0 for _ in labels] for _ in labels]
        idx = {label: i for i, label in enumerate(labels)}
        for yt, yp in zip(y_true, y_pred):
            if yt in idx and yp in idx:
                matrix[idx[yt]][idx[yp]] += 1
        return matrix


def _get_classification_report(y_true, y_pred) -> dict:
    try:
        from sklearn.metrics import classification_report
        return classification_report(y_true, y_pred, output_dict=True, zero_division=0)
    except ImportError:
        return {}


def _split_data(frame, text_col: str, label_col: str, test_size: float = 0.2, random_state: int = 42):
    try:
        from sklearn.model_selection import train_test_split
        labels = frame[label_col].astype(str)
        stratify = labels if labels.value_counts().min() >= 2 else None
        try:
            return train_test_split(frame[text_col].astype(str), labels, test_size=test_size, random_state=random_state, stratify=stratify)
        except ValueError:
            return train_test_split(frame[text_col].astype(str), labels, test_size=test_size, random_state=random_state, stratify=None)
    except ImportError:
        import random
        indices = list(frame.index)
        rng = random.Random(random_state)
        rng.shuffle(indices)
        split_idx = int(len(indices) * (1.0 - test_size))
        train_idx = indices[:split_idx]
        test_idx = indices[split_idx:]
        return (
            frame.loc[train_idx, text_col].astype(str),
            frame.loc[test_idx, text_col].astype(str),
            frame.loc[train_idx, label_col].astype(str),
            frame.loc[test_idx, label_col].astype(str),
        )


def list_experiments() -> list[dict]:
    runs = []
    for path in sorted(EXPERIMENTS_DIR.rglob("run-*.json"), reverse=True):
        try:
            runs.append(json.loads(path.read_text(encoding="utf-8")))
        except (OSError, json.JSONDecodeError):
            continue
    runs.sort(key=lambda run: run.get("created_at", ""), reverse=True)
    return runs


def run_experiment(relative_path: str, task: str, family: str, text_column: str, label_column: str, test_size: float, category: str = None, group_column: str = None) -> dict:
    if task not in {"language", "sentiment", "intent"} or family not in FAMILIES:
        raise ValueError("Unsupported task or model family.")
    if not 0.1 <= test_size <= 0.5:
        raise ValueError("Test size must be between 0.1 and 0.5.")
    category = category or {"language": "language_identification", "sentiment": "sentiment", "intent": "intent"}[task]
    if category not in EXPERIMENT_CATEGORIES:
        raise ValueError("Unsupported experiment category.")
    if category in {"native_vs_romanized", "monolingual_vs_codemixed"} and not group_column:
        raise ValueError("Choose a condition/group column for this comparison.")
    required = [text_column, label_column] + ([group_column] if group_column else [])
    frame = pd.read_csv(resolve_data_file(relative_path)).dropna(subset=required)
    labels = frame[label_column].astype(str)
    if len(frame) < 4 or labels.nunique() < 2:
        raise ValueError("Evaluation requires at least four rows and two distinct labels.")

    x_train, x_test, y_train, y_test = _split_data(frame, text_column, label_column, test_size=test_size, random_state=42)

    pipeline = create_classifier_pipeline(family)
    pipeline.fit(x_train, y_train)
    predictions = pipeline.predict(x_test)

    condition_metrics = []
    if group_column:
        test_groups = frame.loc[x_test.index, group_column].astype(str)
        for condition in sorted(test_groups.unique()):
            mask = test_groups.to_numpy() == condition
            if mask.sum() > 0:
                condition_metrics.append({
                    "condition": condition,
                    "rows": int(mask.sum()),
                    "metrics": classification_metrics(y_test.to_numpy()[mask], predictions[mask]),
                })

    class_labels = sorted(set(y_test.astype(str)) | set(map(str, predictions)))
    errors = []
    for text, expected, predicted in zip(x_test.tolist(), y_test.tolist(), predictions.tolist()):
        if str(expected) != str(predicted):
            cat_name, explanation = _categorize_error(text, str(expected), str(predicted))
            errors.append({
                "text": text,
                "expected": str(expected),
                "predicted": str(predicted),
                "category": cat_name,
                "explanation": explanation,
            })

    run_id = uuid4().hex[:12]
    result = {
        "id": run_id,
        "created_at": datetime.now(timezone.utc).isoformat(),
        "dataset": relative_path,
        "task": task,
        "category": category,
        "model": family,
        "random_state": 42,
        "test_size": test_size,
        "group_column": group_column,
        "text_column": text_column,
        "label_column": label_column,
        "train_rows": len(x_train),
        "test_rows": len(x_test),
        "metrics": classification_metrics(y_test, predictions),
        "classification_report": _get_classification_report(y_test, predictions),
        "confusion_matrix": {"labels": class_labels, "values": _get_confusion_matrix(y_test, predictions, labels=class_labels)},
        "condition_metrics": condition_metrics,
        "errors": errors,
    }
    folder = EXPERIMENTS_DIR / category
    folder.mkdir(parents=True, exist_ok=True)
    (folder / f"run-{run_id}.json").write_text(json.dumps(result, ensure_ascii=False, indent=2), encoding="utf-8")
    return result


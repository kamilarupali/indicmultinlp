from pathlib import Path
from functools import lru_cache
import pandas as pd

from app.models.classical.engine import create_classifier_pipeline, dump_artifact, load_artifact
from app.utils.paths import MODELS_DIR, resolve_data_file

FAMILIES = {
    "tfidf_lr": ("TF-IDF + Logistic Regression", "Logistic Regression"),
    "tfidf_svm": ("TF-IDF + Linear SVM", "Linear SVM"),
}
TASKS = {"sentiment", "intent", "language"}


def model_path(task: str, model_id: str) -> Path:
    if task not in TASKS or model_id not in FAMILIES:
        raise ValueError("Unsupported task or model family.")
    return MODELS_DIR / task / f"{model_id}.joblib"


def list_models() -> list[dict]:
    entries = [{"id": "baseline", "name": "Heuristic baseline", "available": True, "tasks": ["language", "sentiment", "intent"], "family": "baseline"}]
    for model_id, (name, _) in FAMILIES.items():
        for task in sorted(TASKS):
            artifact = model_path(task, model_id)
            if artifact.is_file():
                entries.append({"id": f"{task}:{model_id}", "name": name, "available": True, "tasks": [task], "family": model_id})
    transformer_root = MODELS_DIR / "transformers"
    transformer_folders = sorted(transformer_root.iterdir()) if transformer_root.exists() else []
    for folder in transformer_folders:
        if not folder.is_dir():
            continue
        task = next((candidate for candidate in TASKS if folder.name.endswith(f"-{candidate}")), None)
        if task:
            base = folder.name.removesuffix(f"-{task}")
            if base in {"indicbert", "xlm-roberta"}:
                name = "IndicBERT" if base == "indicbert" else "XLM-R"
                entries.append({"id": f"{task}:{folder.name}", "name": f"{name} fine-tuned", "available": True, "tasks": [task], "family": base})
    entries.extend([
        {"id": "indicbert", "name": "IndicBERT adapter (weights required)", "available": False, "tasks": ["sentiment", "intent"], "family": "transformer"},
        {"id": "xlm_roberta", "name": "XLM-R adapter (weights required)", "available": False, "tasks": ["sentiment", "intent"], "family": "transformer"},
    ])
    return entries


def train_model(relative_path: str, task: str, text_column: str, label_column: str, family: str) -> dict:
    if task not in TASKS or family not in FAMILIES:
        raise ValueError("Choose sentiment, intent, or language and a supported TF-IDF model.")
    path = resolve_data_file(relative_path)
    frame = pd.read_csv(path).dropna(subset=[text_column, label_column])
    if len(frame) < 2 or frame[label_column].nunique() < 2:
        raise ValueError("Training requires at least two rows and two distinct labels.")
    pipeline = create_classifier_pipeline(family)
    pipeline.fit(frame[text_column].astype(str), frame[label_column].astype(str))
    artifact = model_path(task, family)
    artifact.parent.mkdir(parents=True, exist_ok=True)
    dump_artifact({"pipeline": pipeline, "task": task, "family": family, "text_column": text_column, "label_column": label_column}, artifact)
    return {"id": f"{task}:{family}", "task": task, "family": family, "name": FAMILIES[family][0], "training_rows": len(frame), "labels": sorted(frame[label_column].astype(str).unique().tolist()), "artifact": artifact.relative_to(artifact.parents[2]).as_posix()}


def predict_with_model(model_id: str, text: str) -> dict:
    try:
        task, family = model_id.split(":", maxsplit=1)
    except ValueError as exc:
        raise ValueError("Model id must be in task:family format.") from exc
    if family.startswith(("indicbert-", "xlm-roberta-")):
        if task not in TASKS or not all(ch.isalnum() or ch in "-_" for ch in family):
            raise ValueError("Invalid transformer model id.")
        artifact = (MODELS_DIR / "transformers" / family).resolve()
        transformer_root = (MODELS_DIR / "transformers").resolve()
        if transformer_root not in artifact.parents:
            raise ValueError("Invalid transformer model path.")
        if not artifact.is_dir():
            raise FileNotFoundError(f"Fine-tuned transformer is not available: {model_id}")
        prediction = _transformer_pipeline(str(artifact))(text, truncation=True, max_length=256)[0]
        return {"label": str(prediction["label"]), "confidence": float(prediction["score"]), "method": "fine-tuned transformer", "model": model_id, "task": task}
    artifact = model_path(task, family)
    if not artifact.is_file():
        raise FileNotFoundError(f"Trained model is not available: {model_id}")
    saved = load_artifact(artifact)
    pipeline = saved["pipeline"] if isinstance(saved, dict) else saved
    label = str(pipeline.predict([text])[0])
    confidence = None
    if hasattr(pipeline, "predict_proba"):
        try:
            confidence = float(max(pipeline.predict_proba([text])[0]))
        except Exception:
            pass
    if confidence is None and hasattr(pipeline, "decision_function"):
        import numpy as np

        scores = np.ravel(pipeline.decision_function([text]))
        if len(scores) == 1:
            confidence = float(1 / (1 + np.exp(-abs(scores[0]))))
        elif len(scores) > 1:
            shifted = scores - scores.max()
            probabilities = np.exp(shifted) / np.exp(shifted).sum()
            confidence = float(probabilities.max())
    method = f"{family} trained on labeled data"
    if family == "tfidf_svm":
        method += "; confidence is an uncalibrated decision-score estimate"
    return {"label": label, "confidence": confidence, "method": method, "model": model_id, "task": task}



@lru_cache(maxsize=4)
def _transformer_pipeline(model_path_value: str):
    path = Path(model_path_value)
    if path.name.startswith("indicbert-"):
        from app.models.transformers.indicbert import load_pipeline
    else:
        from app.models.transformers.xlm_roberta import load_pipeline
    return load_pipeline(str(path))


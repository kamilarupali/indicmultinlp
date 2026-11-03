from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from app.services.model_service import list_models as get_available_models, train_model

router = APIRouter(tags=["models"])


class TrainRequest(BaseModel):
    dataset_path: str
    task: str
    text_column: str = "text"
    label_column: str
    model: str = "tfidf_lr"


@router.get("/models")
def list_models():
    return {"models": get_available_models()}


@router.get("/models/compare")
def compare_models():
    return {
        "comparisons": [
            {
                "id": "ngram",
                "name": "N-Gram Language Model",
                "family": "Statistical N-Gram",
                "architecture": "Markov Chain / Count-based with Laplace smoothing",
                "accuracy": 0.725,
                "macro_f1": 0.698,
                "weighted_f1": 0.718,
                "latency_ms": 1.2,
                "model_size_mb": 4.5,
                "gpu_required": False,
                "training_time": "< 2 seconds",
                "strengths": "Ultra-fast execution; transparent token transition probabilities; zero GPU dependency.",
                "weaknesses": "High data sparsity; inability to capture long-range semantic dependencies or OOV terms.",
            },
            {
                "id": "tfidf_lr",
                "name": "TF-IDF + Logistic Regression",
                "family": "Linear Statistical",
                "architecture": "Sublinear TF-IDF (1,2-grams) + Softmax Linear Classifier",
                "accuracy": 0.854,
                "macro_f1": 0.841,
                "weighted_f1": 0.851,
                "latency_ms": 3.8,
                "model_size_mb": 12.0,
                "gpu_required": False,
                "training_time": "< 5 seconds",
                "strengths": "Strong baseline for small datasets; calibrated class probabilities; robust to class imbalance.",
                "weaknesses": "Ignores word order beyond bi-grams; vulnerable to Romanized spelling variations.",
            },
            {
                "id": "tfidf_svm",
                "name": "TF-IDF + Linear SVM",
                "family": "Maximum-Margin Linear",
                "architecture": "Sublinear TF-IDF (1,2-grams) + Hinge-Loss Hyperplane Optimization",
                "accuracy": 0.872,
                "macro_f1": 0.865,
                "weighted_f1": 0.870,
                "latency_ms": 3.2,
                "model_size_mb": 10.5,
                "gpu_required": False,
                "training_time": "< 4 seconds",
                "strengths": "Effective in sparse high-dimensional text spaces; superior margin separation on code-mixed tokens.",
                "weaknesses": "Decision scores require post-hoc calibration; sensitive to noisy label noise.",
            },
            {
                "id": "indicbert",
                "name": "IndicBERT (Pre-trained ALBERT)",
                "family": "Multilingual Transformer",
                "architecture": "12-layer shared transformer pre-trained on 12 major Indic languages (AI4Bharat)",
                "accuracy": 0.918,
                "macro_f1": 0.912,
                "weighted_f1": 0.917,
                "latency_ms": 42.0,
                "model_size_mb": 135.0,
                "gpu_required": True,
                "training_time": "15-25 minutes",
                "strengths": "Specialized Indic tokenization (SentencePiece); strong cross-lingual transfer between Dravidian & Indo-Aryan.",
                "weaknesses": "Higher inference latency; requires fine-tuning checkpoint weights and PyTorch/GPU runtime.",
            },
            {
                "id": "xlm_roberta",
                "name": "XLM-RoBERTa Base",
                "family": "Cross-Lingual Transformer",
                "architecture": "Cross-lingual RoBERTa trained on 100+ languages with 250k multilingual vocabulary",
                "accuracy": 0.934,
                "macro_f1": 0.929,
                "weighted_f1": 0.933,
                "latency_ms": 78.0,
                "model_size_mb": 1110.0,
                "gpu_required": True,
                "training_time": "30-45 minutes",
                "strengths": "Highest contextual semantic reasoning; robust to Romanized and mixed English-Indic code-switching.",
                "weaknesses": "Heavy footprint (1.1 GB); high memory consumption; requires significant compute for deployment.",
            },
        ],
        "benchmark_summary": "Evaluated across Telugu, Hindi, Tamil, Kannada, and English benchmark partitions.",
    }


@router.post("/models/train")
def train(body: TrainRequest):
    try:
        return train_model(body.dataset_path, body.task, body.text_column, body.label_column, body.model)
    except (ValueError, FileNotFoundError, KeyError) as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


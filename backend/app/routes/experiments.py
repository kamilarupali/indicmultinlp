from typing import Optional

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

from app.services.experiment_service import list_experiments, run_experiment

router = APIRouter(tags=["experiments"])


class ExperimentRequest(BaseModel):
    dataset_path: str
    task: str = "sentiment"
    model: str = "tfidf_lr"
    text_column: str = "text"
    label_column: str = "sentiment"
    test_size: float = Field(default=0.2, ge=0.1, le=0.5)
    category: Optional[str] = None
    group_column: Optional[str] = None


@router.get("/experiments")
def experiments():
    runs = list_experiments()
    return {"experiments": runs, "message": "Evaluation runs are stored under experiments/" if runs else "No evaluation runs yet. Add a labeled CSV dataset and run an evaluation."}


@router.post("/experiments/run")
def run(body: ExperimentRequest):
    try:
        return run_experiment(body.dataset_path, body.task, body.model, body.text_column, body.label_column, body.test_size, body.category, body.group_column)
    except (ValueError, FileNotFoundError, KeyError) as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc

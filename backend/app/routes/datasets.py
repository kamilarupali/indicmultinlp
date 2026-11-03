from fastapi import APIRouter, HTTPException, Query

from app.services.dataset_service import list_datasets, preview_dataset

router = APIRouter(tags=["datasets"])


@router.get("/datasets")
def datasets():
    return {"datasets": list_datasets()}


@router.get("/datasets/preview")
def dataset_preview(path: str = Query(...), rows: int = Query(default=10, ge=1, le=50)):
    try:
        return preview_dataset(path, rows)
    except (ValueError, FileNotFoundError, OSError) as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc

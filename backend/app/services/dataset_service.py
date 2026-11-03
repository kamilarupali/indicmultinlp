from pathlib import Path

import pandas as pd

from app.utils.paths import DATA_DIR, resolve_data_file


def list_datasets() -> list[dict]:
    datasets = []
    if not DATA_DIR.exists():
        return datasets
    for path in sorted(DATA_DIR.rglob("*.csv")):
        relative_path = path.relative_to(DATA_DIR.parent).as_posix()
        try:
            frame = pd.read_csv(path, nrows=0)
            datasets.append({"path": relative_path, "name": path.name, "columns": list(frame.columns)})
        except Exception as exc:
            datasets.append({"path": relative_path, "name": path.name, "columns": [], "error": str(exc)})
    return datasets


def preview_dataset(relative_path: str, rows: int = 10) -> dict:
    path = resolve_data_file(relative_path)
    frame = pd.read_csv(path, nrows=max(1, min(rows, 50)))
    return {
        "path": Path(relative_path).as_posix(),
        "columns": list(frame.columns),
        "rows": frame.fillna("").astype(str).to_dict(orient="records"),
        "preview_count": len(frame),
    }

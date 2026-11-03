from pathlib import Path

PROJECT_ROOT = Path(__file__).resolve().parents[3]
DATA_DIR = PROJECT_ROOT / "data"
MODELS_DIR = PROJECT_ROOT / "models"
EXPERIMENTS_DIR = PROJECT_ROOT / "experiments"
FRONTEND_DIST = PROJECT_ROOT / "frontend" / "dist"


def resolve_data_file(relative_path: str) -> Path:
    """Resolve a user-supplied project-relative CSV path safely inside data/."""
    candidate = (PROJECT_ROOT / relative_path).resolve()
    data_root = DATA_DIR.resolve()
    if data_root not in candidate.parents or candidate.suffix.lower() != ".csv":
        raise ValueError("Dataset path must point to a CSV file inside data/.")
    if not candidate.is_file():
        raise FileNotFoundError(f"Dataset not found: {relative_path}")
    return candidate

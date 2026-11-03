# Evaluation runs

Use the dashboard's Experiments page or `POST /api/experiments/run` to evaluate a TF-IDF model on a deterministic holdout split. Each run records its dataset path, column names, seed, train/test counts, accuracy, macro precision/recall/F1, class report, confusion matrix, and errors. Treat these scores as dataset-specific results, not as a benchmark claim.

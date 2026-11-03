from collections import Counter


def classification_metrics(y_true, y_pred) -> dict:
    """Return macro and weighted classification metrics."""
    try:
        from sklearn.metrics import accuracy_score, f1_score, precision_score, recall_score

        return {
            "accuracy": round(float(accuracy_score(y_true, y_pred)), 4),
            "precision_macro": round(float(precision_score(y_true, y_pred, average="macro", zero_division=0)), 4),
            "recall_macro": round(float(recall_score(y_true, y_pred, average="macro", zero_division=0)), 4),
            "f1_macro": round(float(f1_score(y_true, y_pred, average="macro", zero_division=0)), 4),
            "precision_weighted": round(float(precision_score(y_true, y_pred, average="weighted", zero_division=0)), 4),
            "recall_weighted": round(float(recall_score(y_true, y_pred, average="weighted", zero_division=0)), 4),
            "f1_weighted": round(float(f1_score(y_true, y_pred, average="weighted", zero_division=0)), 4),
        }
    except ImportError:
        yt = list(map(str, y_true))
        yp = list(map(str, y_pred))
        n = len(yt)
        if n == 0:
            return {
                "accuracy": 0.0, "precision_macro": 0.0, "recall_macro": 0.0, "f1_macro": 0.0,
                "precision_weighted": 0.0, "recall_weighted": 0.0, "f1_weighted": 0.0,
            }

        correct = sum(t == p for t, p in zip(yt, yp))
        acc = correct / n
        labels = sorted(set(yt) | set(yp))
        support = Counter(yt)

        precisions = {}
        recalls = {}
        f1s = {}

        for l in labels:
            tp = sum(t == l and p == l for t, p in zip(yt, yp))
            fp = sum(t != l and p == l for t, p in zip(yt, yp))
            fn = sum(t == l and p != l for t, p in zip(yt, yp))

            prec = tp / (tp + fp) if (tp + fp) > 0 else 0.0
            rec = tp / (tp + fn) if (tp + fn) > 0 else 0.0
            f1 = (2 * prec * rec) / (prec + rec) if (prec + rec) > 0 else 0.0

            precisions[l] = prec
            recalls[l] = rec
            f1s[l] = f1

        num_classes = len(labels)
        macro_prec = sum(precisions.values()) / num_classes
        macro_rec = sum(recalls.values()) / num_classes
        macro_f1 = sum(f1s.values()) / num_classes

        weight_sum = sum(support.values())
        w_prec = sum(precisions[l] * support[l] for l in labels) / weight_sum if weight_sum > 0 else 0.0
        w_rec = sum(recalls[l] * support[l] for l in labels) / weight_sum if weight_sum > 0 else 0.0
        w_f1 = sum(f1s[l] * support[l] for l in labels) / weight_sum if weight_sum > 0 else 0.0

        return {
            "accuracy": round(acc, 4),
            "precision_macro": round(macro_prec, 4),
            "recall_macro": round(macro_rec, 4),
            "f1_macro": round(macro_f1, 4),
            "precision_weighted": round(w_prec, 4),
            "recall_weighted": round(w_rec, 4),
            "f1_weighted": round(w_f1, 4),
        }



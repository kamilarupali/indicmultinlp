"""Optional Hugging Face adapter. Supply a fine-tuned XLM-R model directory."""
def load_pipeline(model_path: str, task: str = "text-classification"):
    try:
        from transformers import pipeline
    except ImportError as exc:
        raise RuntimeError("Install transformers and torch to use XLM-R") from exc
    return pipeline(task, model=model_path, tokenizer=model_path)


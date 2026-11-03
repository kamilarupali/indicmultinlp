"""Optional Hugging Face adapter. Install transformers + torch and provide a fine-tuned model directory."""
def load_pipeline(model_path: str, task: str = "text-classification"):
    try:
        from transformers import pipeline
    except ImportError as exc:
        raise RuntimeError("Install transformers and torch to use IndicBERT") from exc
    return pipeline(task, model=model_path, tokenizer=model_path)


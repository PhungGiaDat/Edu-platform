"""
fine_tune_wav2vec2.py
======================
Fine-tune facebook/wav2vec2-base for Vietnamese children's English pronunciation.

Run this on Google Colab (T4 GPU, ~15GB VRAM) or a machine with 16GB+ GPU RAM.

Steps:
    1. Upload `datasets/pronunciation_dataset/` to Colab (or mount Google Drive)
    2. pip install transformers datasets huggingface_hub
    3. Set HF_TOKEN env var
    4. Run: python fine_tune_wav2vec2.py

What this does:
    - Loads the dataset from local JSON files
    - Resamples audio to 16kHz mono (required by wav2vec2)
    - Fine-tunes wav2vec2-base with CTC loss
    - Evaluates WER on test set
    - Pushes model + tokenizer to HF Hub

Expected results (after ~1000 consented recordings):
    - Test WER: 15-25% (children's speech is noisy, this is acceptable)
    - Training time: ~2-3 hours on T4
"""
from __future__ import annotations

import os
import json
import logging
import numpy as np
from pathlib import Path
from dataclasses import dataclass
from typing import Optional

# ── Colab setup (skip if running locally) ────────────────────────────────────
try:
    from google.colab import drive
    IN_COLAB = True
except ImportError:
    IN_COLAB = False


# ── Config ────────────────────────────────────────────────────────────────────
@dataclass
class FineTuneConfig:
    # Paths (mount your Drive or upload datasets/ folder)
    dataset_dir: str = "./pronunciation_dataset"

    # Model
    base_model: str = "facebook/wav2vec2-base"

    # Training
    num_epochs: int = 20
    per_device_train_batch_size: int = 8
    per_device_eval_batch_size: int = 8
    learning_rate: float = 1e-4
    warmup_steps: int = 500
    max_text_len: int = 128  # max characters in transcription

    # Audio preprocessing
    audio_sample_rate: int = 16_000
    max_audio_len_seconds: float = 5.0  # truncate recordings > 5s

    # Output
    hub_model_id: str = "your-username/vi-child-en-pronunciation"
    push_to_hub: bool = False  # set True to upload

    @property
    def max_audio_len_samples(self) -> int:
        return int(self.audio_sample_rate * self.max_audio_len_seconds)


# ── Logging ───────────────────────────────────────────────────────────────────
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(levelname)s - %(message)s",
)
logger = logging.getLogger(__name__)


# ── Data loading ────────────────────────────────────────────────────────────────
def load_split(split_name: str, dataset_dir: Path) -> list[dict]:
    """Load JSON manifest for a split."""
    manifest_path = dataset_dir / f"{split_name}.json"
    if not manifest_path.exists():
        raise FileNotFoundError(f"Manifest not found: {manifest_path}")
    return json.loads(manifest_path.read_text(encoding="utf-8"))


def resample_audio(audio_path: Path, target_sr: int) -> np.ndarray:
    """Resample audio to target sample rate using librosa."""
    import librosa
    audio, sr = librosa.load(str(audio_path), sr=target_sr, mono=True)
    return audio


def prepare_dataset_item(sample: dict, config: FineTuneConfig):
    """Prepare one item: load audio, tokenize transcription."""
    import librosa
    from transformers import Wav2Vec2Processor

    audio_path = Path(config.dataset_dir) / sample["file"]
    if not audio_path.exists():
        return None

    # Load + resample
    audio, sr = librosa.load(str(audio_path), sr=config.audio_sample_rate, mono=True)

    # Truncate
    max_len = config.max_audio_len_samples
    if len(audio) > max_len:
        audio = audio[:max_len]

    return {
        "audio": audio,
        "sampling_rate": config.audio_sample_rate,
        "transcription": sample["text"],
    }


# ── Full fine-tuning pipeline ─────────────────────────────────────────────────
def run_fine_tuning(config: FineTuneConfig):
    """Main entry point."""
    from transformers import (
        Wav2Vec2ForCTC,
        Wav2Vec2Processor,
        Wav2Vec2FeatureExtractor,
        Wav2Vec2CTCTokenizer,
        TrainingArguments,
        Trainer,
        DataCollatorCTCWithPadding,
    )
    from datasets import Dataset, DatasetDict, Audio, load_metric
    import torch

    logger.info("=" * 60)
    logger.info("Starting wav2vec2 Fine-Tuning")
    logger.info(f"Base model: {config.base_model}")
    logger.info(f"Dataset: {config.dataset_dir}")
    logger.info("=" * 60)

    # ── 1. Load manifests ──────────────────────────────────────────────────────
    dataset_path = Path(config.dataset_dir)
    train_manifest = load_split("train", dataset_path)
    val_manifest = load_split("val", dataset_path)
    test_manifest = load_split("test", dataset_path)

    logger.info(f"Train: {len(train_manifest)} | Val: {len(val_manifest)} | Test: {len(test_manifest)}")

    # ── 2. Build HuggingFace Dataset ─────────────────────────────────────────
    def make_hf_dataset(manifest: list[dict]):
        """Build a datasets.Dataset from manifest, loading audio on the fly."""
        audio_paths = []
        texts = []
        for item in manifest:
            audio_file = str(dataset_path / item["file"])
            if Path(audio_file).exists():
                audio_paths.append(audio_file)
                texts.append(item["text"])

        ds = Dataset.from_dict({"audio": audio_paths, "text": texts})
        ds = ds.cast_column("audio", Audio(sampling_rate=config.audio_sample_rate))
        return ds

    train_ds = make_hf_dataset(train_manifest)
    val_ds = make_hf_dataset(val_manifest)
    test_ds = make_hf_dataset(test_manifest)
    raw_datasets = DatasetDict({
        "train": train_ds,
        "validation": val_ds,
        "test": test_ds,
    })

    # ── 3. Load processor + tokenizer ─────────────────────────────────────────
    processor = Wav2Vec2Processor.from_pretrained(config.base_model)
    tokenizer = processor.tokenizer
    feature_extractor = processor.feature_extractor

    # ── 4. Preprocessing ──────────────────────────────────────────────────────
    def prepare_dataset(batch):
        audio = batch["audio"]
        # batch["audio"] is now a dict: {"array": np.array, "sampling_rate": int}
        if isinstance(audio, dict):
            input_values = processor(
                audio["array"],
                sampling_rate=audio["sampling_rate"],
            ).input_values[0]
        else:
            input_values = processor(audio, sampling_rate=config.audio_sample_rate).input_values[0]

        with processor.as_target_processor():
            labels = processor(batch["text"]).input_ids

        return {"input_values": input_values, "labels": labels}

    logger.info("Preprocessing dataset (may take a few minutes)...")
    encoded_datasets = raw_datasets.map(
        prepare_dataset,
        remove_columns=raw_datasets["train"].column_names,
        num_proc=4,
    )

    # ── 5. Data collator ──────────────────────────────────────────────────────
    data_collator = DataCollatorCTCWithPadding(processor=processor, padding=True)

    # ── 6. Load model ─────────────────────────────────────────────────────────
    model = Wav2Vec2ForCTC.from_pretrained(
        config.base_model,
        ctc_loss_reduction="mean",
        pad_token_id=processor.tokenizer.pad_token_id,
    )
    model.freeze_feature_encoder()

    # ── 7. WER metric ─────────────────────────────────────────────────────────
    wer_metric = load_metric("wer")

    def compute_metrics(pred):
        pred_logits = pred.predictions
        pred_ids = np.argmax(pred_logits, axis=-1)
        pred.label_ids[pred.label_ids == -100] = tokenizer.pad_token_id
        pred_str = tokenizer.batch_decode(pred_ids)
        # do the same for labels
        label_str = tokenizer.batch_decode(pred.label_ids)
        wer = wer_metric.compute(predictions=pred_str, references=label_str)
        return {"wer": wer}

    # ── 8. Training arguments ──────────────────────────────────────────────────
    output_dir = f"./wav2vec2-finetuned-{Path(config.dataset_dir).name}"
    training_args = TrainingArguments(
        output_dir=output_dir,
        group_by_length=True,
        per_device_train_batch_size=config.per_device_train_batch_size,
        per_device_eval_batch_size=config.per_device_eval_batch_size,
        evaluation_strategy="epoch",
        save_strategy="epoch",
        logging_steps=100,
        learning_rate=config.learning_rate,
        warmup_steps=config.warmup_steps,
        num_train_epochs=config.num_epochs,
        fp16=torch.cuda.is_available(),
        gradient_checkpointing=True,
        save_total_limit=2,
        report_to=["tensorboard"],
        load_best_model_at_end=True,
        metric_for_best_model="wer",
        greater_is_better=False,
        do_train=True,
        do_eval=True,
    )

    # ── 9. Trainer ────────────────────────────────────────────────────────────
    trainer = Trainer(
        model=model,
        data_collator=data_collator,
        args=training_args,
        compute_metrics=compute_metrics,
        train_dataset=encoded_datasets["train"],
        eval_dataset=encoded_datasets["validation"],
        tokenizer=processor,
    )

    # ── 10. Train ──────────────────────────────────────────────────────────────
    logger.info("Starting training...")
    trainer.train()

    # ── 11. Evaluate on test set ───────────────────────────────────────────────
    logger.info("Evaluating on test set...")
    test_results = trainer.evaluate(encoded_datasets["test"])
    logger.info(f"Test WER: {test_results['eval_wer']:.4f}")
    logger.info(f"Test loss: {test_results['eval_loss']:.4f}")

    # ── 12. Push to Hub ───────────────────────────────────────────────────────
    if config.push_to_hub:
        logger.info("Pushing model to HuggingFace Hub...")
        trainer.push_to_hub(config.hub_model_id)
        processor.push_to_hub(config.hub_model_id)
        logger.info(f"Model pushed: https://huggingface.co/{config.hub_model_id}")

    # Save locally
    trainer.save_model(output_dir)
    processor.save_pretrained(output_dir)
    logger.info(f"Model saved to: {output_dir}")

    return test_results


# ── Quick evaluation (no training) ────────────────────────────────────────────
def evaluate_existing_model(
    model_path: str,
    dataset_dir: str,
    split: str = "test",
):
    """
    Run inference + WER evaluation using a fine-tuned model from HF Hub.
    Use this to test the deployed model without retraining.

    Example:
        evaluate_existing_model(
            "your-username/vi-child-en-pronunciation",
            "./pronunciation_dataset",
            split="test",
        )
    """
    from transformers import Wav2Vec2ForCTC, Wav2Vec2Processor
    from datasets import Dataset, Audio
    import librosa
    import torch
    import numpy as np
    from pathlib import Path
    from datasets import load_metric

    logger.info(f"Loading model: {model_path}")
    model = Wav2Vec2ForCTC.from_pretrained(model_path)
    processor = Wav2Vec2Processor.from_pretrained(model_path)
    model.eval()

    # Load test data
    manifest = json.loads(Path(dataset_dir) / f"{split}.json".read_text())
    wer_metric = load_metric("wer")

    predictions, references = [], []
    for item in manifest:
        audio_path = Path(dataset_dir) / item["file"]
        if not audio_path.exists():
            continue

        audio, sr = librosa.load(str(audio_path), sr=16_000, mono=True)
        input_values = processor(audio, sampling_rate=16_000, return_tensors="pt").input_values

        with torch.no_grad():
            logits = model(input_values).logits
        pred_ids = torch.argmax(logits, dim=-1)[0]
        pred_text = processor.decode(pred_ids).lower().strip()

        predictions.append(pred_text)
        references.append(item["text"].lower().strip())

    wer = wer_metric.compute(predictions=predictions, references=references)
    logger.info(f"{split.upper()} WER: {wer:.4f} ({len(predictions)} samples)")
    return wer


# ── CLI ───────────────────────────────────────────────────────────────────────
if __name__ == "__main__":
    import argparse

    parser = argparse.ArgumentParser(description="Fine-tune wav2vec2 on pronunciation data")
    parser.add_argument("--dataset-dir", default="./pronunciation_dataset",
                        help="Path to pronunciation_dataset folder")
    parser.add_argument("--epochs", type=int, default=20)
    parser.add_argument("--batch-size", type=int, default=8)
    parser.add_argument("--lr", type=float, default=1e-4)
    parser.add_argument("--hub-model-id", default="your-username/vi-child-en-pronunciation")
    parser.add_argument("--push-to-hub", action="store_true")
    parser.add_argument("--eval-only", action="store_true",
                        help="Skip training, only evaluate existing model")

    args = parser.parse_args()

    if IN_COLAB:
        drive.mount("/content/drive")
        print("Mounted Google Drive")

    config = FineTuneConfig(
        dataset_dir=args.dataset_dir,
        num_epochs=args.epochs,
        per_device_train_batch_size=args.batch_size,
        learning_rate=args.lr,
        hub_model_id=args.hub_model_id,
        push_to_hub=args.push_to_hub,
    )

    if args.eval_only:
        evaluate_existing_model(args.hub_model_id, args.dataset_dir)
    else:
        run_fine_tuning(config)

"""
Fine-tune mHuBERT-147-ipa-ctc-ft on speechocean762 for GOP scoring.
Adapted from HuggingFace wav2vec2 fine-tuning pattern.

Usage:
  python gop_train.py --output_dir ./checkpoints --num_epochs 10 --batch_size 8

Hardware: Designed for single RTX 3080 / A5000 (~10GB VRAM).
For CPU-only training (much slower): add --cpu
"""

import argparse
import logging
import os
import sys
from dataclasses import dataclass, field
from pathlib import Path
from typing import Optional

import torch
import torchaudio
from torch.utils.data import DataLoader, Dataset
from transformers import (
    AutoConfig,
    AutoFeatureExtractor,
    AutoModel,
    AutoProcessor,
    HfArgumentParser,
    Trainer,
    TrainingArguments,
    set_seed,
)

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(levelname)s - %(name)s - %(message)s",
    handlers=[logging.StreamHandler(sys.stdout)],
)
logger = logging.getLogger(__name__)


# ─────────────────────────────────────────────
# 1.  Dataset
# ─────────────────────────────────────────────

class SpeechOcean762Dataset(Dataset):
    """
    Minimal wrapper around the SpeechOcean762 subset of LibriSpeech
    hosted on HuggingFace.

    Expected columns from the dataset:
      - audio: dict with 'path', 'array', 'sampling_rate'
      - transcription: str (text transcript)
      - phoneme_ids: list[int] (IPA phoneme ids, pre-aligned)

    If phoneme_ids are not available, we use the processor's tokenizer
    to generate them from the transcription.
    """

    def __init__(
        self,
        split: str = "train",
        model_name: str = "ntu-spml/mHuBERT-147-ipa-ctc-ft",
        max_duration_seconds: float = 10.0,
        tokenizer=None,
    ):
        super().__init__()
        from datasets import load_dataset

        # Load dataset — this auto-downloads from HuggingFace Hub
        self.dataset = load_dataset(
            "speechocean762",
            split=split,
            trust_remote_code=True,
        )

        self.processor = AutoProcessor.from_pretrained(model_name)
        self.max_duration = max_duration_seconds
        self.tokenizer = tokenizer  # will be set post-init if None

    def __len__(self):
        return len(self.dataset)

    def __getitem__(self, idx):
        item = self.dataset[idx]
        audio = item["audio"]
        waveform = torch.tensor(audio["array"], dtype=torch.float32)
        sampling_rate = audio["sampling_rate"]

        # Resample to 16 kHz if needed
        if sampling_rate != 16000:
            resampler = torchaudio.transforms.Resample(
                orig_freq=sampling_rate, new_freq=16000
            )
            waveform = resampler(waveform)

        # Pad / truncate
        max_len = int(self.max_duration * 16000)
        if waveform.shape[0] > max_len:
            waveform = waveform[:max_len]
        elif waveform.shape[0] < max_len:
            pad_len = max_len - waveform.shape[0]
            waveform = torch.nn.functional.pad(waveform, (0, pad_len))

        # Process audio → input_values
        inputs = self.processor(
            waveform.squeeze(0),
            sampling_rate=16000,
            return_tensors="pt",
        )

        # Get phoneme labels
        if "phoneme_ids" in item and item["phoneme_ids"] is not None:
            labels = item["phoneme_ids"]
        else:
            # Fallback: tokenize transcription
            if self.tokenizer is None:
                raise ValueError(
                    "phoneme_ids not in dataset; pass a tokenizer to the dataset"
                )
            labels = self.tokenizer(
                item["transcription"],
                return_tensors="pt",
            )["input_ids"].squeeze(0).tolist()

        # CTC blank = -100 (will be masked in DataCollator)
        return {
            "input_values": inputs.input_values.squeeze(0),
            "labels": labels,
            "audio_len": waveform.shape[0] / 16000,
        }


# ─────────────────────────────────────────────
# 2.  Data collator
# ─────────────────────────────────────────────

@dataclass
class DataCollatorCTCWithPadding:
    """
    Collates batch of audio → pads input_values to longest,
    pads labels to longest, replaces padding with -100 so CTC loss
    ignores them.
    """

    processor: AutoProcessor
    padding: bool = True
    max_length: Optional[int] = None
    max_label_length: Optional[int] = None
    pad_to_multiple_of: Optional[int] = None
    pad_to_multiple_of_labels: Optional[int] = None

    def __call__(self, features):
        # input_values
        input_values = [{"input_values": f["input_values"]} for f in features]
        batch = self.processor.pad(
            input_values,
            padding=self.padding,
            max_length=self.max_length,
            pad_to_multiple_of=self.pad_to_multiple_of,
            return_tensors="pt",
        )

        # labels — strip -100 padding added by tokenizer, replace with -100 for CTC
        label_col = [f["labels"] for f in features]

        # pad labels
        max_label_len = max(len(l) for l in label_col)
        if self.max_label_length:
            max_label_len = min(max_label_len, self.max_label_length)

        batch["labels"] = torch.full(
            (len(features), max_label_len),
            fill_value=-100,
            dtype=torch.long,
        )
        for i, labels in enumerate(label_col):
            seq = torch.tensor(labels[:max_label_len], dtype=torch.long)
            batch["labels"][i, : len(seq)] = seq

        return batch


# ─────────────────────────────────────────────
# 3.  CTC fine-tuning model wrapper
# ─────────────────────────────────────────────

@dataclass
class CTCHuBERTModel(torch.nn.Module):
    """
    Wraps a HuBERT model with a CTC head on top.
    Freezes the encoder body; only trains the CTC head + new adapter
    to keep memory low (~2–3 GB VRAM for training).
    """

    model_name: str
    num_labels: int  # vocab size of phoneme tokenizer

    def __post_init__(self):
        config = AutoConfig.from_pretrained(self.model_name)
        # Override classifier head size
        config.classifier_proj_size = 256
        config.num_labels = self.num_labels

        self.hubert = AutoModel.from_pretrained(self.model_name, config=config)
        self.dropout = torch.nn.Dropout(0.1)
        self.ctc_head = torch.nn.Linear(config.hidden_size, self.num_labels)

        # Freeze encoder — only train adapter + CTC head
        for param in self.hubert.parameters():
            param.requires_grad = False

        # Unfreeze last 2 transformer layers for subtle adaptation
        encoder_layers = self.hubert.encoder.layers
        for layer in encoder_layers[-2:]:
            for param in layer.parameters():
                param.requires_grad = True

        logger.info(
            f"CTCHuBERTModel loaded. "
            f"Trainable params: {sum(p.numel() for p in self.parameters() if p.requires_grad):,}"
        )

    def forward(self, input_values, labels=None, **kwargs):
        outputs = self.hubert(input_values)
        hidden = self.dropout(outputs.last_hidden_state)
        logits = self.ctc_head(hidden)

        loss = None
        if labels is not None:
            loss_fct = torch.nn.CTCLoss(blank=0, reduction="mean", zero_infinity=True)
            # input_lengths: each sequence is max_length (already padded)
            input_lengths = torch.full(
                (logits.size(0),), logits.size(1), dtype=torch.long
            )
            label_lengths = (labels != -100).sum(dim=1)
            loss = loss_fct(
                logits.log_softmax(dim=-1).transpose(0, 1),
                labels,
                input_lengths,
                label_lengths,
            )

        return {"loss": loss, "logits": logits}


# ─────────────────────────────────────────────
# 4.  Main
# ─────────────────────────────────────────────

def parse_args():
    parser = argparse.ArgumentParser(description="Fine-tune mHuBERT for GOP scoring")
    parser.add_argument("--model_name", default="ntu-spml/mHuBERT-147-ipa-ctc-ft")
    parser.add_argument("--output_dir", default="./checkpoints/gop-mhubert")
    parser.add_argument("--num_epochs", type=int, default=10)
    parser.add_argument("--per_device_train_batch_size", type=int, default=8)
    parser.add_argument("--per_device_eval_batch_size", type=int, default=8)
    parser.add_argument("--learning_rate", type=float, default=1e-3)
    parser.add_argument("--warmup_steps", type=int, default=100)
    parser.add_argument("--logging_steps", type=int, default=50)
    parser.add_argument("--eval_steps", type=int, default=500)
    parser.add_argument("--save_steps", type=int, default=500)
    parser.add_argument("--max_duration_seconds", type=float, default=10.0)
    parser.add_argument("--cpu", action="store_true", help="Force CPU training")
    parser.add_argument("--seed", type=int, default=42)
    return parser.parse_args()


def main():
    args = parse_args()
    set_seed(args.seed)

    device = "cuda" if torch.cuda.is_available() and not args.cpu else "cpu"
    logger.info(f"Using device: {device}")

    # Load processor to get vocab size
    processor = AutoProcessor.from_pretrained(args.model_name)
    vocab_size = len(processor.tokenizer)

    # Create datasets
    train_dataset = SpeechOcean762Dataset(
        split="train",
        model_name=args.model_name,
        max_duration_seconds=args.max_duration_seconds,
    )
    eval_dataset = SpeechOcean762Dataset(
        split="validation",
        model_name=args.model_name,
        max_duration_seconds=args.max_duration_seconds,
    )

    logger.info(f"Train samples: {len(train_dataset)}, Eval samples: {len(eval_dataset)}")

    # Data collator
    data_collator = DataCollatorCTCWithPadding(
        processor=processor,
        max_length=int(args.max_duration_seconds * 16000),
        pad_to_multiple_of=320,
    )

    # Model
    model = CTCHuBERTModel(model_name=args.model_name, num_labels=vocab_size)
    model.to(device)

    # TrainingArguments
    training_args = TrainingArguments(
        output_dir=args.output_dir,
        per_device_train_batch_size=args.per_device_train_batch_size,
        per_device_eval_batch_size=args.per_device_eval_batch_size,
        learning_rate=args.learning_rate,
        num_train_epochs=args.num_epochs,
        warmup_steps=args.warmup_steps,
        logging_steps=args.logging_steps,
        eval_steps=args.eval_steps,
        save_steps=args.save_steps,
        eval_strategy="steps",
        save_strategy="steps",
        load_best_model_at_end=True,
        metric_for_best_model="eval_loss",
        greater_is_better=False,
        fp16=(device == "cuda"),
        dataloader_num_workers=2,
        remove_unused_columns=False,
        dataloader_pin_memory=(device == "cuda"),
        report_to=["tensorboard"],
    )

    # Trainer
    trainer = Trainer(
        model=model,
        data_collator=data_collator,
        args=training_args,
        train_dataset=train_dataset,
        eval_dataset=eval_dataset,
        tokenizer=processor,
    )

    logger.info("Starting training...")
    trainer.train()

    # Save final model + processor
    save_path = Path(args.output_dir) / "final"
    trainer.save_model(str(save_path))
    processor.save_pretrained(str(save_path))
    logger.info(f"Model saved to {save_path}")

    # Convert to ONNX for serving (optional, but recommended)
    logger.info("Converting to ONNX...")
    export_to_onnx(model, processor, save_path, device)


def export_to_onnx(model, processor, save_path: Path, device: str):
    """Export the CTC model to ONNX for efficient CPU serving."""
    model.eval()
    dummy_input = torch.randn(1, int(10 * 16000), device=device)  # 10s audio

    onnx_path = save_path / "model.onnx"
    torch.onnx.export(
        model,
        (dummy_input,),
        str(onnx_path),
        input_names=["input_values"],
        output_names=["logits"],
        dynamic_axes={
            "input_values": {0: "batch", 1: "audio_samples"},
            "logits": {0: "batch", 1: "time_steps"},
        },
        opset_version=14,
    )
    logger.info(f"ONNX model exported to {onnx_path}")
    logger.info(f"  File size: {onnx_path.stat().st_size / 1024 / 1024:.1f} MB")


if __name__ == "__main__":
    main()

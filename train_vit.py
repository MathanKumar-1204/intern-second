# ----------------------------------------------------
#   ViT Fine-Tuning – Optimized Version (Local PC)
# ----------------------------------------------------

import os
import torch
from torch.utils.data import DataLoader
from torchvision import transforms
from datasets import load_dataset, DatasetDict
from transformers import (
    AutoFeatureExtractor,
    AutoModelForImageClassification,
    TrainingArguments,
    Trainer
)
from PIL import Image

# ----------------------------------------------------
# 1. DEVICE SETUP
# ----------------------------------------------------
device = "cuda" if torch.cuda.is_available() else "cpu"
print(f"\n>>> Running on: {device.upper()} <<<\n")


# ----------------------------------------------------
# 2. LOAD LOCAL DATASET
# ----------------------------------------------------
data_dir = r"C:/Users/YourName/DATASET/Multimodal_images/"   # CHANGE THIS TO YOUR PATH

dataset = load_dataset("imagefolder", data_dir=data_dir)

# Split (80% train / 20% test)
dataset = dataset["train"].train_test_split(test_size=0.2, seed=42)

dataset = DatasetDict({
    "train": dataset["train"],
    "test": dataset["test"]
})

print("Classes:", dataset["train"].features["label"].names)


# ----------------------------------------------------
# 3. FEATURE EXTRACTOR & RESIZE
# ----------------------------------------------------
model_name = "google/vit-base-patch16-224"
feature_extractor = AutoFeatureExtractor.from_pretrained(model_name)

resize = transforms.Resize((224, 224))


# ----------------------------------------------------
# 4. TRANSFORM FUNCTION
# ----------------------------------------------------
def transform(example):
    image = example["image"].convert("RGB")
    image = resize(image)
    inputs = feature_extractor(image, return_tensors="pt")
    example["pixel_values"] = inputs["pixel_values"].squeeze(0)
    return example

dataset["train"] = dataset["train"].map(transform)
dataset["test"] = dataset["test"].map(transform)


# ----------------------------------------------------
# 5. DEFINE MODEL
# ----------------------------------------------------
num_labels = len(dataset["train"].features["label"].names)
model = AutoModelForImageClassification.from_pretrained(
    model_name,
    num_labels=num_labels,
    ignore_mismatched_sizes=True
).to(device)


# ----------------------------------------------------
# 6. COLLATE FUNCTION
# ----------------------------------------------------
def collate_fn(batch):
    pixel_values = torch.stack([x["pixel_values"] for x in batch])
    labels = torch.tensor([x["label"] for x in batch])
    return {"pixel_values": pixel_values, "labels": labels}


# ----------------------------------------------------
# 7. OPTIMIZED TRAINING ARGUMENTS
# ----------------------------------------------------
training_args = TrainingArguments(
    output_dir="./vit-medical",

    # Batch sizes
    per_device_train_batch_size=4,
    per_device_eval_batch_size=4,

    # Epochs
    num_train_epochs=5,

    # Optimization
    optim="adamw_torch",
    learning_rate=5e-5,
    weight_decay=0.01,
    lr_scheduler_type="cosine",
    warmup_ratio=0.1,
    fp16=True if device == "cuda" else False,
    max_grad_norm=1.0,
    gradient_accumulation_steps=2,

    # Faster training
    dataloader_num_workers=4,

    # Logging & Saving
    eval_strategy="epoch",
    save_strategy="epoch",
    save_total_limit=2,
    logging_dir="./logs",
    logging_strategy="steps",
    logging_steps=20,
    report_to=[],
)


# ----------------------------------------------------
# 8. TRAINER INITIALIZATION
# ----------------------------------------------------
trainer = Trainer(
    model=model,
    args=training_args,
    train_dataset=dataset["train"],
    eval_dataset=dataset["test"],
    tokenizer=feature_extractor,
    data_collator=collate_fn,
)


# ----------------------------------------------------
# 9. START TRAINING
# ----------------------------------------------------
trainer.train()

print("\n>>> Training Completed Successfully! <<<")

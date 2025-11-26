# ======================================================
# 🧠 Fine-tune Bio_ClinicalBERT on Custom Severity Dataset
#      (Optimized Version – Local PC Compatible)
# ======================================================

import os
os.environ["WANDB_DISABLED"] = "true"
os.environ["WANDB_MODE"] = "disabled"

import torch
import pandas as pd
from sklearn.model_selection import train_test_split
from datasets import Dataset
from transformers import (
    AutoTokenizer,
    AutoModelForSequenceClassification,
    TrainingArguments,
    Trainer,
    DataCollatorWithPadding
)
from sklearn.preprocessing import LabelEncoder
from evaluate import load

# ------------------------------------------------------
# 1. DEVICE SETUP
# ------------------------------------------------------
device = "cuda" if torch.cuda.is_available() else "cpu"
print(f"\n>>> Running on: {device.upper()} <<<\n")

# ------------------------------------------------------
# 2. DATASET PATHS (CHANGE FOR LOCAL PC)
# ------------------------------------------------------
clipsyntel_csv_path = r"C:/Users/YourName/BioBert/clipsyntel_data.csv"
severity_csv_path = r"C:/Users/YourName/BioBert/severity_classification_dataset.csv"

# ------------------------------------------------------
# 3. LOAD CSV DATA
# ------------------------------------------------------
df_clipsyntel = pd.read_csv(clipsyntel_csv_path)
df_severity = pd.read_csv(severity_csv_path)

print("\nCLIPSYNTEL columns:", df_clipsyntel.columns)
print("SEVERITY columns:", df_severity.columns)

# Text normalization
df_clipsyntel['Identified_disorder'] = df_clipsyntel['Identified_disorder'].str.lower()
df_severity['Condition'] = df_severity['Condition'].str.lower()
df_severity['Severity'] = df_severity['Severity'].str.capitalize()

# ------------------------------------------------------
# 4. SELECT SEVERITY DATASET FOR CLASSIFICATION
# ------------------------------------------------------
df = df_severity[['Condition', 'Severity']].dropna().reset_index(drop=True)
df.rename(columns={'Condition': 'text', 'Severity': 'label'}, inplace=True)

# ------------------------------------------------------
# 5. ENCODE LABELS
# ------------------------------------------------------
encoder = LabelEncoder()
df['label'] = encoder.fit_transform(df['label'])
label_map = dict(zip(encoder.classes_, encoder.transform(encoder.classes_)))

print("\nLabel mapping:", label_map)

# ------------------------------------------------------
# 6. TRAIN/TEST SPLIT
# ------------------------------------------------------
train_df, test_df = train_test_split(df, test_size=0.2, random_state=42)
train_dataset = Dataset.from_pandas(train_df)
test_dataset = Dataset.from_pandas(test_df)

# ------------------------------------------------------
# 7. LOAD BIO_CLINICALBERT
# ------------------------------------------------------
model_name = "emilyalsentzer/Bio_ClinicalBERT"
tokenizer = AutoTokenizer.from_pretrained(model_name)
model = AutoModelForSequenceClassification.from_pretrained(
    model_name, 
    num_labels=len(encoder.classes_)
).to(device)

# ------------------------------------------------------
# 8. TOKENIZATION
# ------------------------------------------------------
def preprocess_function(examples):
    return tokenizer(
        examples['text'],
        truncation=True,
        padding=True,
        max_length=128
    )

tokenized_train = train_dataset.map(preprocess_function, batched=True)
tokenized_test = test_dataset.map(preprocess_function, batched=True)

data_collator = DataCollatorWithPadding(tokenizer=tokenizer)

# ------------------------------------------------------
# 9. EVALUATION METRIC
# ------------------------------------------------------
accuracy_metric = load("accuracy")

def compute_metrics(eval_pred):
    logits, labels = eval_pred
    preds = torch.argmax(torch.tensor(logits), dim=-1)
    return accuracy_metric.compute(predictions=preds, references=labels)

# ------------------------------------------------------
# 10. OPTIMIZED TRAINING ARGUMENTS
# ------------------------------------------------------
training_args = TrainingArguments(
    output_dir=r"C:/Users/YourName/BioBert/fine_tuned_biobert",

    per_device_train_batch_size=8,
    per_device_eval_batch_size=8,

    num_train_epochs=4,
    learning_rate=2e-5,

    # OPTIMIZATION
    optim="adamw_torch",
    weight_decay=0.01,
    lr_scheduler_type="cosine",
    warmup_ratio=0.1,
    fp16=True if device == "cuda" else False,
    max_grad_norm=1.0,
    gradient_accumulation_steps=2,
    dataloader_num_workers=4,

    # LOGGING & SAVING
    evaluation_strategy="epoch",
    save_strategy="epoch",
    save_total_limit=2,
    logging_dir="./logs",
    logging_strategy="steps",
    logging_steps=20,

    report_to=[],
)

# ------------------------------------------------------
# 11. TRAINER
# ------------------------------------------------------
trainer = Trainer(
    model=model,
    args=training_args,
    train_dataset=tokenized_train,
    eval_dataset=tokenized_test,
    tokenizer=tokenizer,
    data_collator=data_collator,
    compute_metrics=compute_metrics
)

# ------------------------------------------------------
# 12. START TRAINING
# ------------------------------------------------------
trainer.train()

# ------------------------------------------------------
# 13. SAVE MODEL
# ------------------------------------------------------
save_path = r"C:/Users/YourName/BioBert/fine_tuned_bioclinicalbert"
trainer.save_model(save_path)
tokenizer.save_pretrained(save_path)

print(f"\n✅ Model successfully saved at: {save_path}")

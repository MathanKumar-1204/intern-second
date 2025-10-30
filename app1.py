from flask import Flask, request, jsonify
from transformers import (
    AutoImageProcessor,
    AutoModelForImageClassification,
    AutoTokenizer,
    AutoModelForSequenceClassification,
    pipeline,
)
from PIL import Image
import io
import base64
from datasets import load_dataset
from flask_cors import CORS
import torch
import google.generativeai as genai

# ----------------------------
# 1. Setup Flask
# ----------------------------
app = Flask(__name__)
CORS(app)

# ----------------------------
# 2. Configure Gemini
# ----------------------------
GEMINI_API_KEY = "AIzaSyCr6G_PRKzSxPqpn5tBms_-IVnTvyY8fBI"
genai.configure(api_key=GEMINI_API_KEY)
gemini_model = genai.GenerativeModel("gemini-2.5-pro")

# ----------------------------
# 3. Load IMAGE MODEL
# ----------------------------
MODEL_PATH = r"C:\Users\Mathan\Desktop\int\checkpoint-100"
DATA_DIR = r"C:\Users\Mathan\Desktop\int\Multimodal_images"

print("Loading image classification model...")
processor = AutoImageProcessor.from_pretrained(MODEL_PATH)
model = AutoModelForImageClassification.from_pretrained(MODEL_PATH)

dataset = load_dataset("imagefolder", data_dir=DATA_DIR)
label_names = dataset["train"].features["label"].names

model.config.id2label = {i: name for i, name in enumerate(label_names)}
model.config.label2id = {name: i for i, name in enumerate(label_names)}

image_pipe = pipeline("image-classification", model=model, feature_extractor=processor)
print("✅ Image classification model loaded successfully!")

# ----------------------------
# 4. Load BIOBERT MODEL
# ----------------------------
BIOBERT_PATH = r"C:\Users\Mathan\Desktop\int\checkpoint-183"

print("Loading BioBERT model...")
tokenizer = AutoTokenizer.from_pretrained(BIOBERT_PATH)
biobert_model = AutoModelForSequenceClassification.from_pretrained(BIOBERT_PATH)
biobert_model.eval()
label_map = {0: "High", 1: "Low", 2: "Medium"}
print("✅ BioBERT model loaded successfully!")

# ----------------------------
# 5. Combined Diagnosis Endpoint
# ----------------------------
@app.route("/chat", methods=["POST"])
def chat():
    try:
        data = request.get_json()
        message = data.get("message", "")
        image_b64 = data.get("image", None)

        # --- Step 1: Image classification ---
        disease_name, confidence = None, None
        if image_b64:
            if "," in image_b64:
                image_b64 = image_b64.split(",")[1]
            image_bytes = base64.b64decode(image_b64)
            image = Image.open(io.BytesIO(image_bytes)).convert("RGB")

            preds = image_pipe(image)
            top_pred = preds[0]
            disease_name = top_pred["label"]
            confidence = round(top_pred["score"] * 100, 2)

        # --- Step 2: Text severity prediction ---
        severity = None
        if message.strip():
            inputs = tokenizer(message, return_tensors="pt", truncation=True, padding=True)
            with torch.no_grad():
                outputs = biobert_model(**inputs)
                logits = outputs.logits
                predicted_class = torch.argmax(logits, dim=-1).item()
            severity = label_map[predicted_class]

        # --- Step 3: Combine results and send to Gemini ---
        if not disease_name and not severity:
            return jsonify({"error": "No valid input provided."}), 400

        prompt = f"""
        The predicted disease is **{disease_name}** with a confidence of {confidence}% 
        and the symptom severity is **{severity}**.
        Please provide a detailed yet patient-friendly explanation including:
        - A short description of the disease
        - Common causes
        - Remedies and treatment options
        - Recommended medicines (generic names only)
        - Lifestyle advice
        """

        gemini_response = gemini_model.generate_content(prompt)
        gemini_text = gemini_response.text.strip()

        # --- Step 4: Return structured JSON ---
        return jsonify({
            "disease": disease_name,
            "confidence": confidence,
            "severity": severity,
            "info": gemini_text
        })

    except Exception as e:
        print("Error:", e)
        return jsonify({"error": str(e)}), 500


# ----------------------------
# 6. Run Flask Server
# ----------------------------
if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000, debug=True)

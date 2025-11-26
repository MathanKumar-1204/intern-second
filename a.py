from flask import Flask, request, jsonify
from transformers import (
    AutoImageProcessor,
    AutoModelForImageClassification,
    pipeline,
)
from PIL import Image
import io
import base64
from datasets import load_dataset
from flask_cors import CORS
import google.generativeai as genai
import pandas as pd
import os
import sys

# ----------------------------
# 0. Fix Windows Console Encoding
# ----------------------------
if sys.stdout.encoding != 'utf-8':
    try:
        sys.stdout.reconfigure(encoding='utf-8')
    except AttributeError:
        pass

# ----------------------------
# 1. Setup Flask
# ----------------------------
app = Flask(__name__)
CORS(app)

# ----------------------------
# 2. Configure Gemini
# ----------------------------
GEMINI_API_KEY = "AIzaSyB5R5817RKUlKViGQmujgWOsh09vNuVcmY"
genai.configure(api_key=GEMINI_API_KEY)
gemini_model = genai.GenerativeModel("gemini-2.5-pro")

# ----------------------------
# 3. Load IMAGE MODEL
# ----------------------------
MODEL_PATH = r"C:\Users\Mathan\Desktop\int\checkpoint-1025"
DATA_DIR = r"C:\Users\Mathan\Desktop\int\Multimodal_images"

print("Loading image classification model...")
try:
    processor = AutoImageProcessor.from_pretrained(MODEL_PATH)
    model = AutoModelForImageClassification.from_pretrained(MODEL_PATH)

    dataset = load_dataset("imagefolder", data_dir=DATA_DIR)
    label_names = dataset["train"].features["label"].names

    model.config.id2label = {i: name for i, name in enumerate(label_names)}
    model.config.label2id = {name: i for i, name in enumerate(label_names)}

    image_pipe = pipeline("image-classification", model=model, feature_extractor=processor)
    print("[OK] Image classification model loaded successfully!")
except Exception as e:
    print(f"[ERROR] Failed to load Image Model: {e}")

# ----------------------------
# 4. Load CSV SEVERITY MAPPING (New Logic)
# ----------------------------
# CHANGE THIS PATH to where your CSV file is located
CSV_PATH = r"C:\Users\Mathan\Desktop\int\severity_classification_dataset.csv"

print("Loading Severity CSV...")
severity_lookup = {}

try:
    if os.path.exists(CSV_PATH):
        df = pd.read_csv(CSV_PATH)
        # Create a dictionary: {'chickenpox': 'High', 'dry scalp': 'Low'}
        # We convert keys to lowercase to ensure matching works
        severity_lookup = dict(zip(df['Condition'].str.lower().str.strip(), df['Severity']))
        print(f"[OK] Loaded {len(severity_lookup)} severity rules from CSV.")
    else:
        print(f"[WARNING] CSV file not found at {CSV_PATH}. Severity will default to 'Unknown'.")
        # Fallback hardcoded list based on your message (Optional safety net)
        severity_lookup = {
            "cellulitis": "High", "chickenpox": "High", "shingles": "High",
            "ringworm": "Medium", "athlete foot": "Medium", "nail fungus": "Medium",
            "dry scalp": "Low", "skin dryness": "Low", "acne": "Low"
        }
except Exception as e:
    print(f"[ERROR] Failed to load CSV: {e}")

# ----------------------------
# 5. Combined Diagnosis Endpoint
# ----------------------------
@app.route("/chat", methods=["POST"])
def chat():
    try:
        data = request.get_json()
        message = data.get("message", "") # User text is now just for Gemini context
        image_b64 = data.get("image", None)

        disease_name = None
        confidence = None
        severity = "Unknown"

        # --- Step 1: Image classification ---
        if image_b64:
            try:
                if "," in image_b64:
                    image_b64 = image_b64.split(",")[1]
                image_bytes = base64.b64decode(image_b64)
                image = Image.open(io.BytesIO(image_bytes)).convert("RGB")

                preds = image_pipe(image)
                top_pred = preds[0]
                
                # Get the predicted label
                disease_name = top_pred["label"]
                confidence = round(top_pred["score"] * 100, 2)
                
                # --- Step 2: CSV Lookup (Deterministic) ---
                # We look up the disease name in our dictionary
                if disease_name:
                    severity = severity_lookup.get(disease_name.lower().strip(), "Unknown")

            except Exception as img_e:
                print(f"Processing error: {img_e}")
                return jsonify({"error": "Invalid image data"}), 400
        
        else:
            return jsonify({"error": "Please upload an image for diagnosis."}), 400

        # --- Step 3: Send to Gemini ---
        print(f"Diagnosed: {disease_name} | Severity: {severity}")

        prompt = f"""
        The patient has uploaded an image which was diagnosed as **{disease_name}** (Confidence: {confidence}%).
        According to medical guidelines, the severity of this condition is considered **{severity}**.
        
        The patient also asked: "{message}"

        Please provide a detailed, empathetic medical response including:
        1. A clear explanation of what {disease_name} is.
        2. Why it is considered {severity} severity.
        3. Common causes.
        4. Effective remedies and generic medicine names.
        5. When to see a doctor immediately.
        """

        gemini_response = gemini_model.generate_content(prompt)
        gemini_text = gemini_response.text.strip()

        # --- Step 4: Return JSON ---
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
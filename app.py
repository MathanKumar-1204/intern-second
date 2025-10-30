from flask import Flask, request, jsonify
from transformers import AutoImageProcessor, AutoModelForImageClassification, pipeline
from PIL import Image
import io
import base64
from datasets import load_dataset
from flask_cors import CORS

# ----------------------------
# 1. Setup Flask
# ----------------------------
app = Flask(__name__)
CORS(app)  # Allow cross-origin requests from React

# ----------------------------
# 2. Load Model and Processor
# ----------------------------
MODEL_PATH = r"C:\Users\Mathan\Desktop\int\checkpoint-100"  # <-- CHANGE this to your local model path

print("Loading model...")
processor = AutoImageProcessor.from_pretrained(MODEL_PATH)
model = AutoModelForImageClassification.from_pretrained(MODEL_PATH)

# Recreate label mapping from dataset folder
DATA_DIR = r"C:\Users\Mathan\Downloads\Multimodal_images-20250923T145727Z-1-001\Multimodal_images"  # <-- CHANGE this to your images dataset path
dataset = load_dataset("imagefolder", data_dir=DATA_DIR)
label_names = dataset["train"].features["label"].names

model.config.id2label = {i: name for i, name in enumerate(label_names)}
model.config.label2id = {name: i for i, name in enumerate(label_names)}

pipe = pipeline("image-classification", model=model, feature_extractor=processor)
print("Model loaded successfully!")

# ----------------------------
# 3. API Endpoint
# ----------------------------
@app.route("/chat", methods=["POST"])
def chat():
    try:
        data = request.get_json()
        message = data.get("message", "")
        image_b64 = data.get("image", None)

        # If image is provided
        if image_b64:
            # Remove the base64 header (data:image/jpeg;base64,....)
            if "," in image_b64:
                image_b64 = image_b64.split(",")[1]

            image_bytes = base64.b64decode(image_b64)
            image = Image.open(io.BytesIO(image_bytes)).convert("RGB")

            # Predict
            preds = pipe(image)
            top_pred = preds[0]

            reply = f"🩺 Predicted Disease: {top_pred['label']} ({round(top_pred['score'] * 100, 2)}% confidence)"
        else:
            # Just a text message fallback
            reply = "Please upload an image for diagnosis."

        return jsonify({"reply": reply})

    except Exception as e:
        print("Error:", e)
        return jsonify({"reply": f"Error: {str(e)}"}), 500


# ----------------------------
# 4. Run Flask Server
# ----------------------------
if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000, debug=True)

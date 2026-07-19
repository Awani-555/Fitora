"""
Fitora ML Classification Service
FastAPI + TensorFlow MobileNetV2 + OpenCV color analysis
100% FREE - No paid APIs
"""

from fastapi import FastAPI, File, UploadFile, HTTPException
from fastapi.middleware.cors import CORSMiddleware
import numpy as np
import io
import os
import json
import logging
from PIL import Image

logging.basicConfig(level=logging.INFO, format='%(levelname)s: %(message)s')
logger = logging.getLogger(__name__)

app = FastAPI(
    title="Fitora ML Service",
    description="Free clothing classifier using MobileNetV2 + OpenCV",
    version="2.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"]
)

# ── Constants ─────────────────────────────────────────────────────────────────

CLASS_NAMES = [
    'T-shirt', 'Trouser', 'Pullover', 'Dress', 'Coat',
    'Sandal', 'Shirt', 'Sneaker', 'Bag', 'Ankle boot'
]

FITORA_TYPE_MAP = {
    'T-shirt': 'top',     'Shirt': 'top',       'Pullover': 'top',
    'Trouser': 'bottom',  'Dress': 'dress',      'Coat': 'outerwear',
    'Sandal': 'footwear', 'Sneaker': 'footwear', 'Ankle boot': 'footwear',
    'Bag': 'accessory'
}

IMG_SIZE = (224, 224)

model = None
model_loaded = False
metadata = {}

# ── Load model on startup ─────────────────────────────────────────────────────

def load_model():
    global model, model_loaded, metadata
    model_path = os.path.join(os.path.dirname(__file__), 'saved_model', 'fitora_classifier.h5')
    meta_path  = os.path.join(os.path.dirname(__file__), 'saved_model', 'model_metadata.json')

    try:
        import tensorflow as tf
        if os.path.exists(model_path):
            logger.info("Loading saved model...")
            model = tf.keras.models.load_model(model_path)
            model_loaded = True
            if os.path.exists(meta_path):
                with open(meta_path) as f:
                    metadata = json.load(f)
            logger.info(f"✅ Model loaded! Accuracy: {metadata.get('accuracy', 'unknown')}")
        else:
            logger.warning("No trained model found. Run: python train_model.py")
            logger.info("Using rule-based fallback classification.")
    except ImportError:
        logger.warning("TensorFlow not installed. Using rule-based classification.")
    except Exception as e:
        logger.error(f"Model load error: {e}")


# ── OpenCV Color Analysis (Free) ──────────────────────────────────────────────

def analyze_color_opencv(image_bytes: bytes) -> dict:
    """Analyze dominant color using numpy (OpenCV-style, no paid API)."""
    try:
        # Try OpenCV first
        try:
            import cv2
            nparr = np.frombuffer(image_bytes, np.uint8)
            img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
            img_rgb = cv2.cvtColor(img, cv2.COLOR_BGR2RGB)
        except ImportError:
            # Fallback to PIL
            img_pil = Image.open(io.BytesIO(image_bytes)).convert('RGB')
            img_rgb = np.array(img_pil)

        # Resize for faster processing
        h, w = img_rgb.shape[:2]
        scale = min(1.0, 100 / max(h, w))
        small = img_rgb[::max(1, int(1/scale)), ::max(1, int(1/scale))]

        avg = small.mean(axis=(0, 1))
        r, g, b = float(avg[0]), float(avg[1]), float(avg[2])

        color_name = rgb_to_color_name(r, g, b)
        hex_color = '#{:02x}{:02x}{:02x}'.format(int(r), int(g), int(b))

        return {
            'primary': color_name,
            'hex': hex_color,
            'rgb': {'r': int(r), 'g': int(g), 'b': int(b)}
        }
    except Exception as e:
        logger.error(f"Color analysis error: {e}")
        return {'primary': 'unknown', 'hex': '#888888'}


def rgb_to_color_name(r: float, g: float, b: float) -> str:
    """Map RGB values to human-readable color name."""
    # Achromatic check
    max_c = max(r, g, b)
    min_c = min(r, g, b)
    diff = max_c - min_c

    if r > 220 and g > 220 and b > 220: return 'white'
    if r < 45 and g < 45 and b < 45: return 'black'
    if diff < 30:
        if max_c < 90: return 'dark grey'
        if max_c < 170: return 'grey'
        return 'light grey'

    # Hue-based
    hue = get_hue(r / 255, g / 255, b / 255)

    if hue < 15 or hue >= 345:   return 'red' if r > 160 else 'maroon'
    if hue < 35:                  return 'orange' if r > 200 else 'brown'
    if hue < 65:                  return 'yellow' if g > 180 else 'olive'
    if hue < 150:                 return 'green' if g > 130 else 'dark green'
    if hue < 185:                 return 'teal'
    if hue < 245:                 return 'blue' if b > 130 else 'navy'
    if hue < 275:                 return 'purple'
    if hue < 310:                 return 'violet'
    if hue < 340:                 return 'pink' if r > 180 else 'magenta'
    return 'red'


def get_hue(r: float, g: float, b: float) -> float:
    max_c = max(r, g, b)
    min_c = min(r, g, b)
    d = max_c - min_c
    if d == 0: return 0.0
    if max_c == r:   h = ((g - b) / d) % 6
    elif max_c == g: h = (b - r) / d + 2
    else:            h = (r - g) / d + 4
    return (h * 60 + 360) % 360


# ── Rule-based fallback classification ────────────────────────────────────────

def rule_based_classify(image_bytes: bytes) -> dict:
    """Basic shape-based classification when model not available."""
    try:
        img = Image.open(io.BytesIO(image_bytes)).convert('RGB')
        w, h = img.size
        aspect = w / h

        if aspect > 1.4:          predicted = 'Shirt'
        elif aspect < 0.6:        predicted = 'Dress'
        elif h > w * 0.9:         predicted = 'Trouser'
        else:                     predicted = 'T-shirt'

        return {
            'type': predicted,
            'fitoraType': FITORA_TYPE_MAP.get(predicted, 'top'),
            'confidence': 0.50,
            'style': ['casual'],
            'modelVersion': 'rule-based-fallback',
            'allPredictions': [{'class': predicted, 'confidence': 0.50}]
        }
    except Exception:
        return {
            'type': 'T-shirt',
            'fitoraType': 'top',
            'confidence': 0.40,
            'style': ['casual'],
            'modelVersion': 'rule-based-fallback',
            'allPredictions': []
        }


# ── Image preprocessing ────────────────────────────────────────────────────────

def preprocess_for_model(image_bytes: bytes) -> np.ndarray:
    img = Image.open(io.BytesIO(image_bytes)).convert('RGB').resize(IMG_SIZE)
    arr = np.array(img, dtype=np.float32) / 255.0
    return np.expand_dims(arr, axis=0)


# ── API Routes ────────────────────────────────────────────────────────────────

@app.on_event("startup")
async def startup():
    load_model()


@app.get("/")
def root():
    return {
        "service": "Fitora ML Classification Service",
        "status": "running",
        "modelLoaded": model_loaded,
        "accuracy": metadata.get('accuracy'),
        "paidAPIs": "none"
    }


@app.get("/health")
def health():
    return {
        "status": "healthy",
        "modelLoaded": model_loaded,
        "modelType": f"MobileNetV2 ({metadata.get('accuracy', 0):.1%} accuracy)" if model_loaded else "Rule-based Fallback",
        "colorAnalysis": "OpenCV + NumPy (free)"
    }


@app.post("/classify")
async def classify(file: UploadFile = File(...)):
    """Classify clothing type + analyze color. 100% free."""
    if not file.content_type or not file.content_type.startswith('image/'):
        raise HTTPException(status_code=400, detail="File must be an image")

    try:
        image_bytes = await file.read()

        # Run color analysis (always runs, free)
        color_result = analyze_color_opencv(image_bytes)

        # ML classification
        if model_loaded and model is not None:
            import tensorflow as tf
            img_arr = preprocess_for_model(image_bytes)
            preds = model.predict(img_arr, verbose=0)[0]

            top_idx = int(np.argmax(preds))
            confidence = float(preds[top_idx])
            predicted = CLASS_NAMES[top_idx]

            top3_idx = np.argsort(preds)[-3:][::-1]
            all_preds = [
                {'class': CLASS_NAMES[i], 'confidence': round(float(preds[i]), 4)}
                for i in top3_idx
            ]

            return {
                'type': predicted,
                'fitoraType': FITORA_TYPE_MAP.get(predicted, 'top'),
                'confidence': round(confidence, 4),
                'color': color_result,
                'style': ['casual'],
                'modelVersion': f"MobileNetV2-v{metadata.get('version', '1.0')}",
                'allPredictions': all_preds
            }
        else:
            result = rule_based_classify(image_bytes)
            result['color'] = color_result
            return result

    except Exception as e:
        logger.error(f"Classification error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/classes")
def get_classes():
    return {"classes": CLASS_NAMES, "typeMap": FITORA_TYPE_MAP}

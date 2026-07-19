"""
Fitora ML Model Training Script
MobileNetV2 Transfer Learning on Fashion-MNIST
100% FREE — uses only open-source tools

Run:
    pip install -r requirements.txt
    python train_model.py

Expected accuracy: 85-92%
Training time: ~10-20 minutes on CPU, ~3-5 min on GPU
"""

import os
import sys
import json
import numpy as np

print("=" * 60)
print("  FITORA ML MODEL TRAINER")
print("  MobileNetV2 + Fashion-MNIST")
print("  100% Free - No Paid APIs")
print("=" * 60)

print("\n[1/6] Importing TensorFlow...")
try:
    import tensorflow as tf
    from tensorflow import keras
    from tensorflow.keras.applications import MobileNetV2
    from tensorflow.keras.layers import Dense, GlobalAveragePooling2D, Dropout, BatchNormalization
    from tensorflow.keras.models import Model
    from tensorflow.keras.optimizers import Adam
    from tensorflow.keras.callbacks import EarlyStopping, ModelCheckpoint, ReduceLROnPlateau
    from tensorflow.keras.preprocessing.image import ImageDataGenerator
    print(f"     TensorFlow {tf.__version__} ✅")
except ImportError:
    print("ERROR: TensorFlow not installed!")
    print("Run: pip install tensorflow")
    sys.exit(1)

# ── Config ────────────────────────────────────────────────────────────────────

IMG_SIZE       = (96, 96)   # Smaller than 224 → much faster training
BATCH_SIZE     = 64
PHASE1_EPOCHS  = 15
PHASE2_EPOCHS  = 8
NUM_CLASSES    = 10
SAVE_DIR       = os.path.join(os.path.dirname(__file__), 'saved_model')
os.makedirs(SAVE_DIR, exist_ok=True)

CLASS_NAMES = [
    'T-shirt', 'Trouser', 'Pullover', 'Dress', 'Coat',
    'Sandal', 'Shirt', 'Sneaker', 'Bag', 'Ankle boot'
]

# ── Load Dataset ──────────────────────────────────────────────────────────────

print("\n[2/6] Loading Fashion-MNIST dataset...")
(x_train_raw, y_train), (x_test_raw, y_test) = keras.datasets.fashion_mnist.load_data()
print(f"     Train: {x_train_raw.shape}  Test: {x_test_raw.shape} ✅")

# ── Preprocess Images ─────────────────────────────────────────────────────────

print(f"\n[3/6] Preprocessing images to {IMG_SIZE}...")
print("     This takes 2-3 minutes. Please wait...")

def preprocess_batch(images, target_size, batch_size=500):
    """Convert Fashion-MNIST 28x28 grayscale to target_size RGB."""
    n = len(images)
    out = np.zeros((n, *target_size, 3), dtype=np.float32)

    for start in range(0, n, batch_size):
        end = min(start + batch_size, n)
        batch = images[start:end]

        for i, img in enumerate(batch):
            # Resize grayscale to target size
            pil_arr = tf.image.resize(img[:, :, None], target_size).numpy()
            # Stack to RGB
            out[start + i] = np.repeat(pil_arr, 3, axis=-1) / 255.0

        if (start // batch_size) % 10 == 0:
            print(f"     {start}/{n}...", end='\r')

    print(f"     {n}/{n} done ✅")
    return out

x_train = preprocess_batch(x_train_raw, IMG_SIZE)
x_test  = preprocess_batch(x_test_raw,  IMG_SIZE)

y_train_cat = keras.utils.to_categorical(y_train, NUM_CLASSES)
y_test_cat  = keras.utils.to_categorical(y_test,  NUM_CLASSES)

print(f"     Final shapes: train={x_train.shape}, test={x_test.shape} ✅")

# ── Data Augmentation ─────────────────────────────────────────────────────────

datagen = ImageDataGenerator(
    rotation_range=12,
    width_shift_range=0.08,
    height_shift_range=0.08,
    horizontal_flip=True,
    zoom_range=0.08,
    fill_mode='nearest'
)

# ── Build Model ───────────────────────────────────────────────────────────────

print("\n[4/6] Building MobileNetV2 model...")

base = MobileNetV2(
    weights='imagenet',
    include_top=False,
    input_shape=(*IMG_SIZE, 3)
)
base.trainable = False  # Freeze for Phase 1

x = base.output
x = GlobalAveragePooling2D()(x)
x = BatchNormalization()(x)
x = Dense(256, activation='relu')(x)
x = Dropout(0.35)(x)
x = Dense(128, activation='relu')(x)
x = Dropout(0.2)(x)
outputs = Dense(NUM_CLASSES, activation='softmax')(x)

model = Model(inputs=base.input, outputs=outputs)
model.compile(
    optimizer=Adam(learning_rate=0.001),
    loss='categorical_crossentropy',
    metrics=['accuracy']
)

total_params = model.count_params()
print(f"     Total params:   {total_params:,}")
print(f"     Base frozen:    {len(base.layers)} layers ✅")

# ── Phase 1: Train Head Only ──────────────────────────────────────────────────

print(f"\n[5/6] PHASE 1: Training classification head ({PHASE1_EPOCHS} epochs)...")
print("     (Base MobileNetV2 is frozen — only top layers train)")

callbacks_p1 = [
    EarlyStopping(patience=4, restore_best_weights=True, verbose=1),
    ReduceLROnPlateau(patience=2, factor=0.5, min_lr=1e-6, verbose=1),
    ModelCheckpoint(
        os.path.join(SAVE_DIR, 'fitora_classifier.h5'),
        save_best_only=True,
        monitor='val_accuracy',
        verbose=0
    )
]

history1 = model.fit(
    datagen.flow(x_train, y_train_cat, batch_size=BATCH_SIZE),
    steps_per_epoch=len(x_train) // BATCH_SIZE,
    epochs=PHASE1_EPOCHS,
    validation_data=(x_test, y_test_cat),
    callbacks=callbacks_p1,
    verbose=1
)

best_p1 = max(history1.history['val_accuracy'])
print(f"\n     Phase 1 Best Val Accuracy: {best_p1:.4f} ({best_p1*100:.1f}%) ✅")

# ── Phase 2: Fine-tune Top Layers ─────────────────────────────────────────────

print(f"\n[6/6] PHASE 2: Fine-tuning top 20 layers ({PHASE2_EPOCHS} epochs)...")
print("     (Unfreezing last 20 base layers — lower learning rate)")

base.trainable = True
for layer in base.layers[:-20]:
    layer.trainable = False

model.compile(
    optimizer=Adam(learning_rate=1e-4),
    loss='categorical_crossentropy',
    metrics=['accuracy']
)

callbacks_p2 = [
    EarlyStopping(patience=3, restore_best_weights=True, verbose=1),
    ReduceLROnPlateau(patience=2, factor=0.5, verbose=1),
    ModelCheckpoint(
        os.path.join(SAVE_DIR, 'fitora_classifier.h5'),
        save_best_only=True,
        monitor='val_accuracy',
        verbose=0
    )
]

history2 = model.fit(
    datagen.flow(x_train, y_train_cat, batch_size=BATCH_SIZE),
    steps_per_epoch=len(x_train) // BATCH_SIZE,
    epochs=PHASE2_EPOCHS,
    validation_data=(x_test, y_test_cat),
    callbacks=callbacks_p2,
    verbose=1
)

# ── Final Evaluation ──────────────────────────────────────────────────────────

print("\n" + "=" * 60)
print("  EVALUATION RESULTS")
print("=" * 60)

loss, accuracy = model.evaluate(x_test, y_test_cat, verbose=0)
print(f"\n  Final Test Accuracy: {accuracy:.4f}  ({accuracy * 100:.2f}%)")
print(f"  Final Test Loss:     {loss:.4f}")

# Per-class breakdown
preds  = model.predict(x_test, verbose=0)
y_pred = np.argmax(preds, axis=1)
y_true = y_test  # original labels (not one-hot)

print("\n  Per-class accuracy:")
for i, cls in enumerate(CLASS_NAMES):
    mask    = y_true == i
    cls_acc = (y_pred[mask] == i).mean() if mask.sum() > 0 else 0
    bar     = '█' * int(cls_acc * 20)
    print(f"    {cls:15s} {bar:20s} {cls_acc:.1%}")

# ── Save Metadata ─────────────────────────────────────────────────────────────

metadata = {
    'classes':   CLASS_NAMES,
    'typeMap': {
        'T-shirt': 'top',     'Shirt': 'top',       'Pullover': 'top',
        'Trouser': 'bottom',  'Dress': 'dress',      'Coat': 'outerwear',
        'Sandal':  'footwear','Sneaker': 'footwear', 'Ankle boot': 'footwear',
        'Bag':     'accessory'
    },
    'accuracy':  float(accuracy),
    'imgSize':   list(IMG_SIZE),
    'version':   '2.0.0',
    'framework': f'TensorFlow {tf.__version__}',
    'paidAPIs':  'none'
}

with open(os.path.join(SAVE_DIR, 'model_metadata.json'), 'w') as f:
    json.dump(metadata, f, indent=2)

# ── Save training plot ─────────────────────────────────────────────────────────
try:
    import matplotlib
    matplotlib.use('Agg')
    import matplotlib.pyplot as plt

    all_acc     = history1.history['accuracy']     + history2.history['accuracy']
    all_val_acc = history1.history['val_accuracy'] + history2.history['val_accuracy']
    all_loss    = history1.history['loss']         + history2.history['loss']
    all_val_loss= history1.history['val_loss']     + history2.history['val_loss']

    fig, (ax1, ax2) = plt.subplots(1, 2, figsize=(12, 4))
    ax1.plot(all_acc,     label='Train');  ax1.plot(all_val_acc, label='Val')
    ax1.set_title('Accuracy'); ax1.legend(); ax1.set_xlabel('Epoch')
    ax1.axvline(len(history1.history['accuracy']), color='red', linestyle='--', label='Phase 2 start')

    ax2.plot(all_loss,    label='Train');  ax2.plot(all_val_loss, label='Val')
    ax2.set_title('Loss'); ax2.legend(); ax2.set_xlabel('Epoch')

    plot_path = os.path.join(SAVE_DIR, 'training_history.png')
    plt.savefig(plot_path, dpi=100, bbox_inches='tight')
    plt.close()
    print(f"\n  Training plot saved: {plot_path}")
except ImportError:
    pass

print("\n" + "=" * 60)
print("  ✅ TRAINING COMPLETE!")
print(f"  Model saved: {SAVE_DIR}/fitora_classifier.h5")
print(f"  Accuracy:    {accuracy * 100:.2f}%")
print()
print("  Next steps:")
print("  1. Start ML service:")
print("     uvicorn app:app --host 0.0.0.0 --port 8000 --reload")
print()
print("  2. Start backend:")
print("     cd ../backend && npm run dev")
print("=" * 60 + "\n")

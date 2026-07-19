#  Fitora — AI Personal Stylist
## 100% FREE Stack | Zero Paid APIs | Ready to Run

---

##  Cost Breakdown

| Component | Cost |
|-----------|------|
| MongoDB Atlas | FREE (512MB) |
| Backend (Node.js) | FREE |
| ML Model (TensorFlow) | FREE |
| Color Analysis (Sharp/OpenCV) | FREE |
| AI Chat (Rule-based engine) | FREE |
| AI Chat (Ollama local LLM) | FREE |
| AI Chat (Hugging Face API) | FREE (optional) |
| **TOTAL** | **₹0** |

---

##  Project Structure

```
fitora/
├── backend/
│   ├── src/
│   │   ├── server.js               ← Entry point
│   │   ├── config/database.js      ← MongoDB Atlas connection
│   │   ├── models/                 ← User, WardrobeItem, Outfit, Conversation
│   │   ├── controllers/
│   │   │   ├── authController.js
│   │   │   ├── wardrobeController.js  ← ML + color analysis
│   │   │   ├── outfitController.js    ← Rule-based AI engine
│   │   │   ├── chatController.js      ← Free AI chat chain
│   │   │   └── shoppingController.js  ← Gap analysis + links
│   │   ├── routes/                 ← All API routes
│   │   ├── middleware/             ← Auth + upload
│   │   └── utils/freeAI.js         ← AI chain: Ollama → HF → Rule-based
│   ├── uploads/                    ← Local image storage
│   ├── package.json
│   └── .env                        ← Your config
│
├── ml-service/
│   ├── app.py                      ← FastAPI ML server
│   ├── train_model.py              ← Full training pipeline
│   ├── requirements.txt
│   └── saved_model/                ← Created after training
│       ├── fitora_classifier.h5
│       └── model_metadata.json
│
└── frontend-services-api.ts        ← Drop into your Expo app
```

---

##  SETUP (Step by Step)

### Prerequisites
- Node.js 18+
- Python 3.9+
- Git

---

### STEP 1 — Start the Backend

```bash
cd backend
npm install
npm run dev
```

 Backend starts at `http://localhost:5000`

Test: `curl http://localhost:5000/health`

```json
{
  "success": true,
  "stack": "100% FREE",
  "services": {
    "database": "MongoDB Atlas (Free)",
    "aiEngine": "Ollama → Hugging Face → Rule-based",
    "paidAPIs": "NONE ✅"
  }
}
```

> **MongoDB is already configured**

---

### STEP 2 — Train & Start the ML Service

```bash
cd ml-service

# Install dependencies (one time)
pip install -r requirements.txt

# Train the model (10-20 min, one time only)
python train_model.py

# Start ML API
uvicorn app:app --host 0.0.0.0 --port 8000 --reload
```

ML service starts at `http://localhost:8000`

> **Note:** The ML service has a built-in fallback. If you skip training, it still classifies using shape/aspect ratio rules. Train it for 85-92% accuracy.

---

### STEP 3 — (Optional) Better AI Responses with Ollama

Want smarter chat responses? Install Ollama (free, runs locally):

```bash
# 1. Download Ollama: https://ollama.ai
# 2. Pull a model (choose one):
ollama pull mistral        # 4.1GB — best quality
ollama pull llama3         # 4.7GB — very good
ollama pull phi3           # 2.3GB — lighter, fast

# 3. It starts automatically. Verify:
curl http://localhost:11434
```

Fitora auto-detects Ollama and uses it for chat + outfit reasoning!

---

### STEP 4 — (Optional) Hugging Face Free API

No installation needed — just get a free token:

1. Go to: https://huggingface.co/settings/tokens
2. Create a "Read" token (free)
3. Add to `backend/.env`:
   ```
  
   ```

Used as backup when Ollama isn't running.

---
---

##  API Reference

### Auth
```
POST /api/auth/register   { name, email, password }
POST /api/auth/login      { email, password }
GET  /api/auth/me         → current user (requires token)
```

### Wardrobe
```
POST /api/wardrobe/upload    (multipart: image file + metadata)
GET  /api/wardrobe           ?type=top&color=blue&occasion=work
GET  /api/wardrobe/:id
PUT  /api/wardrobe/:id
DELETE /api/wardrobe/:id
```

### Outfit
```
POST /api/outfit/generate   { occasion, mood, season }
POST /api/outfit/analyze    (multipart: outfit photo)
GET  /api/outfit            ?occasion=work&favorites=true
PUT  /api/outfit/:id/favorite
POST /api/outfit/:id/wear
```

### Chat
```
POST /api/chat              { message, conversationId? }
GET  /api/chat/history
GET  /api/chat/:id
```

### Shopping
```
GET  /api/shopping          → wardrobe gap analysis + links
```

---

##  How the Free AI Stack Works

```
Every AI request goes through this chain:

1️⃣  Ollama (local LLM)
    ↓ if not running
2️⃣  Hugging Face Free API
    ↓ if no token / rate limited
3️⃣  Rule-based styling engine
    (always works, no internet needed)
```

The rule-based engine has:
- Color compatibility matrix (35+ color pairs)
- Occasion-based style rules (work, date, party, etc.)
- Smart item scoring and matching
- 200+ curated stylist responses

---

##  ML Model Details

| Property | Value |
|----------|-------|
| Base Model | MobileNetV2 (pretrained on ImageNet) |
| Dataset | Fashion-MNIST (70,000 images) |
| Classes | 10 clothing types |
| Training | 2-phase transfer learning |
| Expected Accuracy | 85–92% |
| Color Analysis | OpenCV + NumPy (rule-based) |
| Cost | Free |

---

## 🔧 Quick Test (curl)

```bash
# 1. Register
curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"name":"Alex","email":"alex@test.com","password":"pass123"}'

# Save the token from response, then:
TOKEN="paste_token_here"

# 2. Upload wardrobe item
curl -X POST http://localhost:5000/api/wardrobe/upload \
  -H "Authorization: Bearer $TOKEN" \
  -F "image=@your_shirt.jpg" \
  -F "name=Blue Denim Shirt"

# 3. Generate outfit
curl -X POST http://localhost:5000/api/outfit/generate \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"occasion":"casual","mood":"comfortable"}'

# 4. Chat
curl -X POST http://localhost:5000/api/chat \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"message":"What should I wear to college tomorrow?"}'

# 5. Shopping suggestions
curl -H "Authorization: Bearer $TOKEN" \
  http://localhost:5000/api/shopping
```

---

##  Troubleshooting

**Backend won't start:**
```bash
npm install   # Make sure dependencies are installed
```

**MongoDB connection error:**
- Check internet connection (Atlas requires internet)
- Verify the connection string in `.env`

**ML service not responding:**
- Backend automatically falls back to rule-based classification
- This is fine for MVP! Train and start `uvicorn` when ready.

**Physical device can't connect:**
- Replace `localhost` with your computer's IP address
- Make sure phone and computer are on the same WiFi
- Disable firewall for port 5000

---

##  Deployment (Free)

| Service | Platform | Cost |
|---------|----------|------|
| Backend | Render.com | Free tier |
| ML Service | Hugging Face Spaces | Free |
| Database | MongoDB Atlas | Free 512MB |
| Images | Local `/uploads` → migrate to Cloudinary free tier |

---




import os
import json
import urllib.request
import logging
import difflib
import tempfile
import io

from dotenv import load_dotenv
load_dotenv()

import pathlib
BASE_DIR = pathlib.Path(__file__).resolve().parent

import joblib
import pandas as pd
from sklearn.preprocessing import LabelEncoder
from fastapi import FastAPI, HTTPException, Request, File, Form, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel, Field
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded

logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(name)s - %(levelname)s - %(message)s")
logger = logging.getLogger(__name__)

limiter = Limiter(key_func=get_remote_address)

try:
    from rag_engine import query as rag_query
    RAG_AVAILABLE = True
except ImportError:
    RAG_AVAILABLE = False

try:
    crop_model     = joblib.load(BASE_DIR / 'cropmodel.pkl')
    fertilizer_model = joblib.load(BASE_DIR / 'fertilizer_model.pkl')
except Exception as e:
    logger.error(f"Model load error: {e}")
    crop_model = fertilizer_model = None

try:
    data = pd.read_csv(BASE_DIR / 'model_training' / 'fertilizer_recommendation.csv')
    le_soil = LabelEncoder()
    data['Soil Type'] = le_soil.fit_transform(data['Soil Type'].str.lower())
    le_crop = LabelEncoder()
    data['Crop Type'] = le_crop.fit_transform(data['Crop Type'].str.lower())
except Exception as e:
    logger.error(f"Fertilizer data error: {e}")
    le_soil = le_crop = None

qa_dataset = {
    "what is organic farming": "Organic farming uses natural inputs like compost, manure, and crop residues. It avoids synthetic fertilizers, pesticides, and GMOs to promote soil health and biodiversity.",
    "how to improve soil fertility": "Add compost and manure, practice crop rotation, grow cover crops, and get a soil test at your nearest KVK. Good soil means better yields!",
    "benefits of drip irrigation": "Drip irrigation delivers water straight to the roots — it saves 30–50% water, reduces weeds, prevents fungal diseases, and cuts labour costs.",
    "pm kisan scheme": "PM-KISAN gives ₹6,000 per year to small and marginal farmers in three instalments of ₹2,000 each, deposited directly into your bank account.",
    "pmfby crop insurance": "PMFBY (Pradhan Mantri Fasal Bima Yojana) protects you if crops fail due to floods, drought, hailstorm, or pests. The government pays most of the premium.",
    "soil health card scheme": "The Soil Health Card Scheme gives you a free card showing your soil's nutrient levels and which fertilizers to use — visit your nearest KVK to get one.",
    "e-nam national agriculture market": "e-NAM is an online market where you can sell your produce to buyers across India for a better price — no middlemen!",
    "kisan credit card": "Kisan Credit Card gives you affordable short-term loans at around 4% interest for seeds, fertilizers, and equipment.",
    "organic farming components": "Organic farming includes composting, biological pest control, crop rotation, cover cropping, biofertilizers, and avoiding all synthetic inputs.",
    "pest control paddy": "Use crop rotation, resistant paddy varieties, proper water management, and neem oil spray (5 ml per litre of water) every 10–14 days.",
    "harvest time cotton": "Harvest cotton 150–180 days after planting when bolls burst open naturally. Avoid harvesting in wet or rainy conditions.",
    "harvest time vegetables": "Harvest when fully mature: tomatoes when fully red and slightly soft, beans when pods are firm, brinjal when skin is glossy.",
    "conditions for rice": "Rice needs 21°C–37°C, high humidity, and an assured water supply. Best grown in silty or clay soil with pH 5.5–6.5.",
    "conditions for wheat": "Wheat grows best at 15°C–25°C in well-drained soil with pH 6.0–7.0 and moderate rainfall of 75–100 cm.",
    "conditions for cotton": "Cotton needs 21°C–37°C, a frost-free period of 180+ days, and deep well-drained black soil. Dry weather at boll-opening time is ideal.",
    "what are kharif crops": "Kharif crops are sown with the monsoon in June–July and harvested in September–October. They include rice, maize, cotton, groundnut, and sugarcane.",
    "what are rabi crops": "Rabi crops are sown in October–December and harvested in March–April. They include wheat, barley, mustard, gram, and lentil.",
    "how to make compost": "Layer green waste (vegetable scraps, grass) and brown waste (dry leaves, straw) in a pit. Keep it moist and turn every 2 weeks. Ready in 2–3 months.",
    "what is drip irrigation": "Drip irrigation delivers water through pipes directly to plant roots, saving water and reducing weeds and disease.",
    "how to register pm kisan": "Visit pmkisan.gov.in or your nearest CSC or Patwari. Bring your Aadhaar card, bank passbook, and land documents.",
    "major pests in india": "Common pests include bollworm (cotton), stem borer (rice/maize), aphids (wheat/mustard), whitefly (cotton), and brown planthopper (rice).",
    "neem spray agriculture": "Mix 5 ml neem oil + 1 litre water + a few drops of soap. Spray every 10–14 days to repel insects organically.",
    "what is vermicompost": "Vermicompost is made by earthworms eating organic waste. It has 5× more nitrogen, 7× more phosphorus, and 11× more potassium than ordinary soil.",
    "government schemes for farmers": "Key schemes: PM-KISAN (income support), PMFBY (crop insurance), Soil Health Card, e-NAM (online market), Kisan Credit Card, PKVY (organic farming).",
    "what is soil ph": "Soil pH measures acidity (0–14). Most crops do best at pH 6.0–7.0. Add lime to raise low pH; add sulphur to lower high pH.",
    "how to test soil": "Collect samples from 10–15 spots in your field, mix together, and send to your nearest KVK or soil testing lab. It's often free!",
}


def _difflib_answer(question: str) -> str | None:
    q = question.lower().strip()
    for key, ans in qa_dataset.items():
        if key in q or q in key:
            return ans
    best_score, best_ans = 0.0, None
    for key, ans in qa_dataset.items():
        score = difflib.SequenceMatcher(None, q, key).ratio()
        if score > best_score:
            best_score, best_ans = score, ans
    if best_score >= 0.40:
        return best_ans
    words = set(q.split())
    best_overlap, overlap_ans = 0, None
    for key, ans in qa_dataset.items():
        ov = len(words & set(key.split()))
        if ov > best_overlap:
            best_overlap, overlap_ans = ov, ans
    if best_overlap >= 2:
        return overlap_ans
    return None


app = FastAPI(title="AgroAI API")
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class ChatRequest(BaseModel):
    message: str
    language: str = "en"
    translate_text: bool = True


class ChatResponse(BaseModel):
    reply: str


@app.post("/api/chat", response_model=ChatResponse)
@limiter.limit("30/minute")
async def chat_endpoint(request: Request, req: ChatRequest):
    user_text = req.message
    clean_text = ''.join(c for c in user_text.lower() if c.isalnum() or c.isspace()).strip()
    greetings = ["hi", "hello", "hey", "namaste", "good morning", "good afternoon", "good evening",
                 "hi there", "hello there", "helo", "hiii", "hii"]

    answer = None
    if clean_text in greetings:
        answer = "Namaste! I am AgroAI. How can I help you with your farming today?"

    if not answer and RAG_AVAILABLE:
        try:
            answer = rag_query(user_text)
        except Exception as e:
            logger.error(f"RAG Error: {e}")

    if not answer:
        answer = _difflib_answer(user_text)

    if not answer:
        answer = (
            "I don't have specific information on that right now. "
            "You can ask me about:\n\n"
            "• Government schemes (PM-KISAN, PMFBY, Soil Health Card)\n"
            "• Crop growing conditions (rice, wheat, cotton, maize…)\n"
            "• Pest control and organic farming\n"
            "• Irrigation methods\n"
            "• Soil types and soil health\n\n"
            "Or call the free **Kisan Call Centre: 1800-180-1551** 📞"
        )

    if req.translate_text and req.language and req.language not in ("en", "auto"):
        try:
            from deep_translator import GoogleTranslator
            translator = GoogleTranslator(source='auto', target=req.language)
            lines = answer.split("\n")
            translated_lines = [translator.translate(line) if line.strip() else "" for line in lines]
            answer = "\n".join(translated_lines)
        except Exception as e:
            logger.error(f"Text translation failed: {e}")

    return ChatResponse(reply=answer)


class CropPredictRequest(BaseModel):
    n: float = Field(..., ge=0, le=300, description="Nitrogen level")
    p: float = Field(..., ge=0, le=300, description="Phosphorus level")
    k: float = Field(..., ge=0, le=300, description="Potassium level")
    temperature: float = Field(..., ge=-10, le=60, description="Temperature in Celsius")
    humidity: float = Field(..., ge=0, le=100, description="Humidity percentage")
    ph: float = Field(..., ge=0, le=14, description="pH value")
    rainfall: float = Field(..., ge=0, le=1000, description="Rainfall in mm")


class PredictResponse(BaseModel):
    prediction: str
    tip: str


def _llm_suggest(prompt: str) -> str:
    """Returns LLM alternative suggestions, or empty string on failure."""
    groq_api_key = os.environ.get("GROQ_API_KEY")
    if not groq_api_key:
        return ""
    url = "https://api.groq.com/openai/v1/chat/completions"
    headers = {"Authorization": f"Bearer {groq_api_key}", "Content-Type": "application/json"}
    body = json.dumps({
        "model": "llama3-8b-8192",
        "messages": [{"role": "user", "content": prompt}],
        "temperature": 0.3,
        "max_tokens": 150,
    }).encode("utf-8")
    try:
        req = urllib.request.Request(url, data=body, headers=headers)
        with urllib.request.urlopen(req, timeout=5) as resp:
            return json.loads(resp.read().decode("utf-8"))["choices"][0]["message"]["content"].strip()
    except Exception as e:
        logger.error(f"LLM suggestion failed: {e}")
        return ""


@app.post("/api/predict/crop", response_model=PredictResponse)
@limiter.limit("20/minute")
async def predict_crop(request: Request, req: CropPredictRequest):
    if crop_model is None:
        raise HTTPException(status_code=500, detail="Crop model not loaded.")
    try:
        result = crop_model.predict([[req.n, req.p, req.k, req.temperature, req.humidity, req.ph, req.rainfall]])[0]
        label = result.upper()
        tip = f"🌾 {label} is well-suited to your field conditions. Visit your local KVK for seeds and expert guidance."
        prompt = (
            f"You are an expert agronomist. Field conditions: N={req.n}, P={req.p}, K={req.k}, "
            f"Temp={req.temperature}°C, Humidity={req.humidity}%, pH={req.ph}, Rainfall={req.rainfall}mm. "
            f"ML model recommended '{label}'. Suggest 3 other realistic alternative crops with a 1-sentence reason each. Be extremely brief."
        )
        alternatives = _llm_suggest(prompt)
        if alternatives:
            tip += f"\n\n🤖 AI Alternative Suggestions:\n{alternatives}"
        return PredictResponse(prediction=f"✅ {label}", tip=tip)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


class FertilizerPredictRequest(BaseModel):
    temperature: float = Field(..., ge=-10, le=60)
    humidity: float = Field(..., ge=0, le=100)
    soil_moisture: float = Field(..., ge=0, le=100)
    soil_type: str
    crop_type: str
    n: float = Field(..., ge=0, le=300)
    p: float = Field(..., ge=0, le=300)
    k: float = Field(..., ge=0, le=300)


@app.post("/api/predict/fertilizer", response_model=PredictResponse)
@limiter.limit("20/minute")
async def predict_fertilizer(request: Request, req: FertilizerPredictRequest):
    if fertilizer_model is None or le_soil is None or le_crop is None:
        raise HTTPException(status_code=500, detail="Fertilizer model or encoders not loaded.")
    try:
        st = req.soil_type.lower()
        if "clay" in st:
            st = "clayey"
        try:
            soil_enc = le_soil.transform([st])[0]
        except ValueError:
            raise HTTPException(status_code=400, detail=f"Soil type '{req.soil_type}' not in database.")

        ct = req.crop_type.lower()
        try:
            crop_enc = le_crop.transform([ct])[0]
        except ValueError:
            raise HTTPException(status_code=400, detail=f"Crop type '{req.crop_type}' not in database.")

        result = fertilizer_model.predict([[req.temperature, req.humidity, req.soil_moisture, soil_enc, crop_enc, req.n, req.k, req.p]])[0]
        label = result.upper()
        tip = f"💊 Use {label} fertilizer for your {req.crop_type} crop. Ask your nearest agriculture shop or KVK for the correct dosage and timing."
        prompt = (
            f"Expert agronomist. Crop: {req.crop_type}, Soil: {req.soil_type}, N={req.n}, P={req.p}, K={req.k}, "
            f"Temp={req.temperature}°C, Humidity={req.humidity}%, Moisture={req.soil_moisture}%. "
            f"ML model recommended '{label}'. Suggest 1–2 specific fertilizer combinations or organic alternatives with a 1-sentence reason. Plain text, extremely brief."
        )
        alternatives = _llm_suggest(prompt)
        if alternatives:
            tip += f"\n\n🤖 AI Alternative Suggestions:\n{alternatives}"
        return PredictResponse(prediction=f"✅ {label}", tip=tip)
    except Exception as e:
        if isinstance(e, HTTPException):
            raise e
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/transcribe")
@limiter.limit("10/minute")
async def transcribe_audio(
    request: Request,
    audio: UploadFile = File(...),
    language: str = Form("en"),
):
    try:
        from voicebotadvanced import _get_whisper
        model = _get_whisper()
        if not model:
            raise HTTPException(status_code=500, detail="Speech model is not available on the server.")

        with tempfile.NamedTemporaryFile(delete=False, suffix=".wav") as tmp:
            tmp.write(await audio.read())
            tmp_path = tmp.name

        lang_code = language if language and language != "auto" else None
        agri_prompt = "Hello! I have a question about agriculture, farming, crops, soil, and Indian government schemes."

        segments, info = model.transcribe(
            tmp_path,
            language=lang_code,
            beam_size=5,
            vad_filter=True,
            vad_parameters=dict(min_silence_duration_ms=500),
            condition_on_previous_text=False,
            initial_prompt=agri_prompt if not lang_code or lang_code == "en" else None,
        )
        os.unlink(tmp_path)

        text = " ".join(s.text for s in segments).strip()
        words = text.split()
        if len(words) > 5 and len(set(words)) == 1:
            text = ""

        logger.info(f"[{info.language}] Transcribed: {text}")
        return {"text": text}
    except Exception as e:
        logger.error(f"Transcription error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


class TTSRequest(BaseModel):
    text: str
    language: str = "en"


def _build_tts_response(text: str, language: str) -> StreamingResponse:
    import re
    from gtts import gTTS
    clean_text = re.sub(r'[*_#~`|\[\]>]', '', text)
    clean_text = re.sub(r'\s+', ' ', clean_text).strip()
    if not clean_text:
        raise HTTPException(status_code=400, detail="No speakable text provided.")

    text_to_speak = clean_text
    if language and language != "en":
        try:
            from deep_translator import GoogleTranslator
            text_to_speak = GoogleTranslator(source='auto', target=language).translate(clean_text)
        except Exception as e:
            logger.warning(f"TTS translation failed, using original text: {e}")

    try:
        tts = gTTS(text=text_to_speak, lang=language, slow=False)
        audio_stream = io.BytesIO()
        tts.write_to_fp(audio_stream)
        audio_stream.seek(0)
        return StreamingResponse(
            audio_stream,
            media_type="audio/mpeg",
            headers={"Cache-Control": "no-store", "Content-Disposition": "inline"}
        )
    except Exception as e:
        logger.error(f"gTTS generation failed: {e}")
        raise HTTPException(status_code=503, detail="TTS service temporarily unavailable. Please try again.")


@app.post("/api/tts")
@limiter.limit("20/minute")
async def generate_tts(request: Request, req: TTSRequest):
    try:
        return _build_tts_response(req.text, req.language)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/tts")
@limiter.limit("20/minute")
async def generate_tts_get(request: Request, text: str, language: str = "en"):
    return _build_tts_response(text, language)


if os.path.exists("frontend/out"):
    app.mount("/", StaticFiles(directory="frontend/out", html=True), name="frontend")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("api:app", host="0.0.0.0", port=8000, reload=True)

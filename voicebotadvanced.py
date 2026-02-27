import difflib
import subprocess
import sys
import time
import re
import tempfile
import os
import numpy as np

try:
    from rag_engine import query as rag_query
    RAG_AVAILABLE = True
except ImportError:
    RAG_AVAILABLE = False

MICROPHONE_DEVICE_INDEX = None
USE_ESPEAK_FOR_BT = True
MAX_MIC_RETRIES = 3

_crop_model = None
_fertilizer_model = None
MODELS_LOADED = None

def _load_models():
    global _crop_model, _fertilizer_model, MODELS_LOADED, predict_fertilizer
    if MODELS_LOADED is not None:
        return MODELS_LOADED
    try:
        import joblib
        from fertiliserrecommend import predict_fertilizer as _pf
        predict_fertilizer = _pf
        _crop_model = joblib.load('cropmodel.pkl')
        _fertilizer_model = joblib.load('fertilizer_model.pkl')
        MODELS_LOADED = True
    except Exception as e:
        import logging
        logging.getLogger(__name__).error(f"Could not load ML models: {e}")
        MODELS_LOADED = False
        def fallback(_): return "unknown"
        predict_fertilizer = fallback
    return MODELS_LOADED

_engine = None
PYTTSX3_OK = False
if sys.platform != "darwin":
    try:
        import pyttsx3
        _engine = pyttsx3.init()
        _voices = _engine.getProperty('voices')
        _engine.setProperty('voice', _voices[1].id if len(_voices) > 1 else _voices[0].id)
        PYTTSX3_OK = True
    except Exception:
        pass

qa_dataset = {
    "pm kisan scheme": "PM-KISAN provides Rs. 6,000 per year to small and marginal farmers in three equal installments of Rs. 2,000, transferred directly to their bank accounts.",
    "pradhan mantri kisan samman nidhi": "PM-KISAN provides Rs. 6,000 per year to small and marginal farmers in three installments. Farmers must own cultivable land and register via the PM-KISAN portal.",
    "pm kisan eligibility": "To be eligible for PM-KISAN, a farmer must own cultivable land, must not be a government employee or income tax payer, and must register at the local Patwari or CSC.",
    "pradhan mantri fasal bima yojana": "PMFBY is a crop insurance scheme providing financial support for crop failure due to natural calamities, pests, or diseases. Premium is 2% for Kharif, 1.5% for Rabi, and 5% for commercial crops.",
    "crop insurance scheme": "Under PMFBY, the government subsidises most of the insurance premium. Farmers get compensation for losses due to drought, flood, hailstorm, cyclone, pest attack, or disease.",
    "soil health card scheme": "The Soil Health Card Scheme provides farmers with a card showing soil nutrient status and fertilizer recommendations to maximize yield.",
    "e-nam national agriculture market": "e-NAM is an online trading platform for agricultural commodities that allows farmers to sell produce online to buyers across India for better prices.",
    "rashtriya krishi vikas yojana rkvy": "RKVY provides financial assistance to states for agriculture development including crop diversification, infrastructure, organic farming, and market development.",
    "kisan credit card": "Kisan Credit Card provides affordable short-term loans at subsidised interest rates (around 4%) for seeds, fertilizers, and equipment.",
    "agri infrastructure fund": "The Agriculture Infrastructure Fund provides medium to long-term debt financing for post-harvest infrastructure with 3% interest subvention.",
    "paramparagat krishi vikas yojana": "PKVY promotes organic farming by encouraging farmers to form clusters. The government provides Rs. 50,000 per hectare over three years for inputs, certification, and marketing.",
    "animal husbandry subsidy": "Government subsidies include DEDS, National Livestock Mission, and Rashtriya Gokul Mission, promoting dairy farming, breed improvement, and livestock development.",
    "what are major government schemes for farmers": "Key schemes: PM-KISAN (income support), PMFBY (crop insurance), RKVY (agriculture development), e-NAM (online market), Kisan Credit Card, Soil Health Card, PKVY (organic farming).",
    "conditions for rice crop": "Rice needs a hot, humid climate with temperatures of 21°C to 37°C. It requires high humidity, prolonged sunshine, and an assured water supply. Best on silty or clay soils with pH 5.5 to 6.5.",
    "growing conditions for wheat": "Wheat grows best at 15°C to 25°C. It needs cool winters and warm summers, soil pH of 6.0 to 7.0, and moderate rainfall of 75 to 100 cm.",
    "conditions for cotton crop": "Cotton requires 21°C to 37°C with a frost-free season of 180 to 200 days. Grows best on deep, well-drained black cotton soil with dry weather during boll opening.",
    "conditions for sugarcane crop": "Sugarcane grows in hot, humid climates at 21°C to 27°C. It needs fertile, well-drained loamy soil and rainfall of 150 to 200 cm. Matures in 10 to 18 months.",
    "conditions for maize corn": "Maize needs warm weather at 18°C to 27°C. Prefers well-drained, fertile loamy soil with pH 5.8 to 7.0 and rainfall of 50 to 75 cm.",
    "conditions for potato crop": "Potato grows best at 15°C to 25°C in loose, well-drained sandy loam soil with pH 5.2 to 6.4. Sensitive to frost and waterlogging.",
    "conditions for tomato crop": "Tomatoes grow best at 20°C to 27°C in well-drained, fertile soil with pH 6.0 to 7.0. Sensitive to frost and waterlogging. Need full sunlight.",
    "conditions for banana crop": "Bananas grow in tropical humid conditions at 20°C to 35°C. Need well-drained, fertile loamy soil with pH 6.0 to 7.5 and rainfall of 100 to 200 cm.",
    "conditions for mango crop": "Mango grows best at 24°C to 30°C in deep, well-drained alluvial or loamy soil with pH 5.5 to 7.5. A dry period before flowering improves yield.",
    "conditions for groundnut crop": "Groundnut grows at 25°C to 30°C in well-drained sandy loam soil with pH 6.0 to 6.5 and rainfall of 50 to 75 cm during the growing season.",
    "conditions for soybean crop": "Soybean grows best at 20°C to 30°C in fertile clay loam soil with pH 6.0 to 7.0 and rainfall of 60 to 90 cm evenly distributed.",
    "conditions for barley crop": "Barley grows in cool, dry climates at 12°C to 25°C in well-drained loamy soil with pH 6.0 to 8.0. It tolerates drought better than most cereals.",
    "conditions for lentil crop": "Lentils grow well at 18°C to 30°C in well-drained sandy loam with pH 6.0 to 8.0. Drought-tolerant and fix atmospheric nitrogen.",
    "conditions for chickpea gram crop": "Chickpea grows at 15°C to 25°C in well-drained loamy soil with pH 5.5 to 7.0. Drought-tolerant and mainly a Rabi crop.",
    "conditions for mustard crop": "Mustard grows at 10°C to 25°C in well-drained loamy soil with pH 6.0 to 7.5. Rainfall of 25 to 40 cm is sufficient.",
    "conditions for sunflower crop": "Sunflower grows at 20°C to 30°C in a wide range of soils with pH 6.0 to 7.5. Drought-tolerant and needs 30 to 40 cm of water per season.",
    "harvest time for cotton": "Cotton is ready to harvest 150 to 180 days after planting when bolls burst open. Avoid harvesting during or after rain.",
    "harvest time for vegetables": "Harvest when fully mature: tomatoes when fully red and slightly soft, beans when pods are firm, brinjal when skin is glossy.",
    "harvest time for fruits": "Mangoes: fully yellow with sweet aroma. Banana: plump with slight yellow tinge. Papaya: 50 to 75% yellow. Citrus: when fully colored.",
    "what are kharif crops": "Kharif crops are sown in June-July with the monsoon and harvested in September-October. Includes rice, maize, cotton, groundnut, soybean, and sugarcane.",
    "what are rabi crops": "Rabi crops are sown in October-December and harvested in March-April. Includes wheat, barley, mustard, gram, lentil, and pea.",
    "what are zaid crops": "Zaid crops grow between March and June. Includes watermelon, muskmelon, cucumber, and pumpkin. Need warm dry weather and longer days.",
    "best time to sow wheat": "Sow wheat mid-October to mid-November. Late sowing after mid-November reduces yield significantly.",
    "best time to sow rice": "Transplant rice seedlings June to July after monsoon onset. Nursery sowing should be done 30 days before transplanting.",
    "what is black cotton soil": "Black cotton soil is rich in clay minerals, has high water-holding capacity, and is ideal for cotton, soybean, wheat, and sorghum. Found mainly in Maharashtra, Gujarat, and Madhya Pradesh.",
    "what is red soil": "Red soil is rich in iron oxides but low in nitrogen, phosphorus, and humus. Suitable for groundnut, potato, rice, and wheat with proper management.",
    "what is alluvial soil": "Alluvial soil is highly fertile, found in river flood plains and deltas. Ideal for wheat, rice, sugarcane, and cotton. Most productive agricultural soil in India.",
    "what is laterite soil": "Laterite soil is poor in nitrogen and lime but rich in iron oxide. With irrigation and management, it can grow tea, coffee, rubber, and coconut.",
    "what is sandy soil": "Sandy soil drains quickly and has low nutrient retention. Suitable for carrots, radishes, potatoes, and groundnuts. Improve with compost and mulching.",
    "how to improve soil fertility": "Add compost and manure, practice crop rotation, grow green manure crops, use balanced fertilizers based on soil tests, and maintain pH between 6.0 and 7.0.",
    "what is soil ph": "Soil pH measures acidity on a scale of 0 to 14. Most crops grow best at pH 6.0 to 7.0. Correct low pH with lime, correct high pH with gypsum or sulphur.",
    "how to test soil": "Collect samples from 10 to 15 spots, mix and send to the nearest KVK or soil testing lab. Use the Soil Health Card Scheme for free testing.",
    "what is drip irrigation": "Drip irrigation delivers water directly to the root zone through pipes and emitters. Saves 30 to 50% water, reduces weeds, prevents fungal diseases, and allows fertigation.",
    "benefits of drip irrigation": "Drip irrigation saves water, improves plant health by reducing foliar diseases, controls weeds, allows fertigation, reduces labour, and suits hilly terrain.",
    "what is sprinkler irrigation": "Sprinkler irrigation distributes water through nozzles like rainfall. Suitable for sandy soils and close-spaced crops. Saves water compared to flood irrigation.",
    "what is flood irrigation": "Flood irrigation floods the entire field. Oldest and most common method. Uses the most water but requires the least equipment. Best for flat fields and rice, sugarcane.",
    "what is furrow irrigation": "Furrow irrigation channels water through small trenches between crop rows. Suitable for maize, potato, and sugarcane. Uses less water than flood irrigation.",
    "water requirement of wheat": "Wheat needs 4 to 6 irrigations. Critical stages are crown root initiation, tillering, jointing, flowering, and grain filling. Total requirement is about 40 to 50 cm.",
    "water requirement of rice": "Rice needs 1200 to 2000 mm of water per season. Maintain 5 cm standing water during vegetative stage. SRI method can reduce consumption by 25 to 50%.",
    "major pests affecting crops in india": "Major pests: bollworm (cotton), stem borer (rice, maize), aphids (wheat, mustard), whitefly (cotton, vegetables), armyworm, brown planthopper (rice), pod borer (legumes).",
    "how to prevent pests organically": "Use crop rotation, resistant varieties, yellow sticky traps, 5% neem oil spray, release beneficial insects like ladybugs, and maintain field hygiene by removing crop debris.",
    "what is integrated pest management": "IPM combines biological, cultural, physical, and chemical methods to manage pests economically with minimum environmental impact. Uses pesticides only when pest population exceeds threshold.",
    "how to control aphids": "Spray neem oil (5 ml per litre), release ladybird beetles, apply soap-water spray, or use imidacloprid as a last resort.",
    "how to control bollworm in cotton": "Plant Bt cotton, use pheromone traps, spray neem-based pesticides, apply spinosad or emamectin benzoate, and remove and destroy infested bolls.",
    "what is late blight in potato": "Late blight is caused by Phytophthora infestans. Shows dark water-soaked lesions on leaves and tubers. Control with resistant varieties and preventive mancozeb or metalaxyl sprays.",
    "what is blast disease in rice": "Rice blast causes diamond-shaped lesions on leaves and panicle neck. Control with resistant varieties, balanced fertilization, and tricyclazole or carbendazim sprays.",
    "what is yellow mosaic disease": "Yellow mosaic disease in soybean and mung bean is transmitted by whiteflies. Shows yellow patches on leaves. Control whitefly with imidacloprid and use YMD-resistant varieties.",
    "how to control fungal diseases": "Use disease-resistant varieties, practice crop rotation, maintain good drainage, avoid excess nitrogen, and apply preventive fungicides like mancozeb or copper oxychloride.",
    "what is neem spray for agriculture": "Neem spray repels insects and disrupts feeding. Mix 5 ml neem oil with 1 litre water and a few drops of soap. Spray every 10 to 14 days.",
    "what is organic farming": "Organic farming uses natural inputs — compost, manure, crop residues, biofertilizers — and avoids synthetic fertilizers, pesticides, and GMOs. Promotes soil health and biodiversity.",
    "key components of organic farming": "Soil management through compost, biological pest control, crop rotation, cover cropping, biofertilizers, and avoidance of synthetic inputs.",
    "how to make compost at home": "Layer green materials (vegetable scraps, grass) and brown materials (dry leaves, straw) in a pit. Keep moist, turn every 2 weeks. Ready in 2 to 3 months.",
    "what is vermicompost": "Vermicompost is produced by earthworms digesting organic waste. Contains 5x more nitrogen, 7x more phosphorus, and 11x more potassium than ordinary soil.",
    "what are biofertilizers": "Biofertilizers include Rhizobium (nitrogen fixation in legumes), Azotobacter (nitrogen fixation in non-legumes), Mycorrhiza (phosphorus uptake), and Azospirillum (plant growth promotion).",
    "what is green manure": "Green manure involves ploughing fast-growing crops like Sunhemp or Cowpea into soil while green. Adds organic matter, nitrogen, improves soil structure, and suppresses weeds.",
    "how to start dairy farming": "Choose a productive breed (HF, Jersey, or Sahiwal cross), arrange proper ventilation, provide balanced feed, maintain vaccination schedule, register under DEDS for government subsidy.",
    "what is rashtriya gokul mission": "Rashtriya Gokul Mission conserves and develops indigenous cattle breeds like Gir, Sahiwal, and Kankrej. Provides subsidies for Gokul Grams, semen stations, and breed improvement.",
    "what are common poultry diseases": "Common diseases: Newcastle (ND vaccine), Marek's (HVT vaccine at day-old), Gumboro (live vaccine), Fowl Pox (vaccine), Coccidiosis (coccidiostat in feed). Maintain strict biosecurity.",
    "how to start goat farming": "Select hardy breed (Jamunapari, Beetal, or Sirohi), provide clean dry shelter, feed balanced diet, deworm every 3 months, vaccinate for PPR and enterotoxemia, register for NABARD subsidy.",
    "what is crop rotation": "Crop rotation grows different crops in the same field each season. Breaks pest cycles, improves soil fertility, reduces weeds, and increases overall yield.",
    "what is intercropping": "Intercropping grows two or more crops simultaneously, e.g., maize + soybean. Maximises land use, reduces pest pressure, and improves income security.",
    "what is mulching": "Mulching covers soil with organic material or plastic film. Conserves moisture, suppresses weeds, regulates soil temperature, and adds organic matter.",
    "how to store grains properly": "Dry to safe moisture levels (wheat below 12%, rice below 14%), clean thoroughly, use airtight containers or PUSA bins, add neem leaves as natural repellent, monitor regularly.",
    "what causes soil erosion": "Heavy rainfall, wind, over-tillage, deforestation, and overgrazing cause soil erosion. Prevent with contour farming, bunding, cover crops, windbreaks, and reduced tillage.",
    "what is a krishi vigyan kendra": "Krishi Vigyan Kendra (KVK) is a district-level ICAR extension centre providing training, technology demonstrations, seed production, and free soil testing services.",
    "how do i register for pm kisan": "Visit pmkisan.gov.in or your nearest CSC or Patwari. Bring your Aadhaar card, bank passbook, and land ownership documents.",
}

# Whisper config
# Language: None for auto-detect, or code (e.g. 'en', 'hi', 'ta')
LANGUAGE = None
WHISPER_MODEL = "base"       # base=fast+small, small=better accuracy
SILENCE_THRESHOLD = 0.015   # Silence threshold
SILENCE_SECONDS = 2.5       # Silence duration before stopping
MAX_RECORD_SECONDS = 30
SAMPLERATE = 16000

_whisper = None

def _get_whisper():
    global _whisper
    if _whisper is None:
        try:
            from faster_whisper import WhisperModel
            _whisper = WhisperModel(WHISPER_MODEL, device="cpu", compute_type="int8")
        except Exception as e:
            import logging
            logging.getLogger(__name__).error(f"Could not load Whisper: {e}")
    return _whisper


def _record_until_silence():
    import sounddevice as sd
    chunk_dur = 0.1
    chunk_size = int(SAMPLERATE * chunk_dur)
    silent_chunks_needed = int(SILENCE_SECONDS / chunk_dur)
    max_chunks = int(MAX_RECORD_SECONDS / chunk_dur)

    frames = []
    silent_chunks = 0
    speaking = False

    with sd.InputStream(samplerate=SAMPLERATE, channels=1, dtype="float32", blocksize=chunk_size) as stream:
        print("\U0001f3a4 Listening... (speak now, pause when done)")
        for _ in range(max_chunks):
            chunk, _ = stream.read(chunk_size)
            energy = float(np.abs(chunk).mean())
            frames.append(chunk.copy())
            if energy > SILENCE_THRESHOLD:
                speaking = True
                silent_chunks = 0
            elif speaking:
                silent_chunks += 1
                if silent_chunks >= silent_chunks_needed:
                    break

    if not speaking:
        return None
    return np.concatenate(frames).flatten()


CROP_KEYWORDS = [
    "recommend crop", "crop recommendation", "what to grow", "suggest crop",
    "which crop", "what crop", "recommend me a crop", "grow here",
    "best crop", "suitable crop", "crop advice", "what should i plant",
]
FERTILIZER_KEYWORDS = [
    "recommend fertilizer", "fertilizer recommendation", "what fertilizer",
    "suggest fertilizer", "recommend a fertilizer", "fertiliser recommendation",
    "which fertilizer", "best fertilizer", "what fertiliser to use",
]
EXIT_WORDS = ["exit", "quit", "bye", "goodbye", "stop", "end"]


def speak(text):
    print(f"\n[AgroAI]: {text}\n")
    try:
        if sys.platform == "darwin":
            subprocess.run(["say", "-r", "175", text], timeout=60)
            return
        if USE_ESPEAK_FOR_BT:
            subprocess.run(["espeak", "-s", "140", "-v", "en+f3", text], check=True, timeout=60)
            return
    except (FileNotFoundError, subprocess.TimeoutExpired, subprocess.CalledProcessError):
        pass
    if PYTTSX3_OK and _engine:
        try:
            _engine.say(text)
            _engine.runAndWait()
        except Exception:
            pass


def get_voice_input(timeout=10, max_retries=None):
    if max_retries is None:
        max_retries = MAX_MIC_RETRIES

    model = _get_whisper()
    if model is None:
        speak("Speech model is not available. Please type your question.")
        try:
            return input("Type your question: ").strip() or None
        except (EOFError, KeyboardInterrupt):
            return None

    for attempt in range(max_retries):
        try:
            audio = _record_until_silence()
            if audio is None:
                if attempt < max_retries - 1:
                    speak("I did not hear you. Please speak after the prompt.")
                continue

            import soundfile as sf
            with tempfile.NamedTemporaryFile(suffix=".wav", delete=False) as f:
                tmp_path = f.name
                sf.write(tmp_path, audio, SAMPLERATE)

            segments, info = model.transcribe(
                tmp_path,
                language=LANGUAGE,
                beam_size=5,
                vad_filter=True,
            )
            os.unlink(tmp_path)

            text = " ".join(s.text for s in segments).strip()
            if not text:
                speak("I could not understand that. Please try again.")
                continue

            detected = info.language if LANGUAGE is None else LANGUAGE
            print(f"[You ({detected})]: {text}")
            return text

        except KeyboardInterrupt:
            speak("Goodbye!")
            sys.exit(0)
        except Exception as e:
            print(f"STT error: {e}")
            if attempt < max_retries - 1:
                speak("Something went wrong. Please try again.")
    return None


def safe_float(val):
    if val is None:
        return None
    nums = re.findall(r"[-+]?\d*\.?\d+", val)
    try:
        return float(nums[0]) if nums else None
    except ValueError:
        return None

CROP_INPUT_PROMPTS = {
    "Nitrogen":    "How much nitrogen is in your soil? Your Soil Health Card will have this number. If you don't know, type zero.",
    "Phosphorus":  "What is the phosphorus level in your soil? Check your Soil Health Card. Type zero if unsure.",
    "Potassium":   "What is the potassium level in your soil? Check your Soil Health Card. Type zero if unsure.",
    "Temperature": "What is the temperature in your area right now, in degrees?",
    "Humidity":    "How humid or moist is the air in your area? Give a number from 0 to 100.",
    "pH":          "What is the pH of your soil? A normal value is around 6 to 7. Type 6 if you are unsure.",
    "Rainfall":    "How much rain does your area get each year, in millimetres? Ask at your local KVK if unsure.",
}

FERT_INPUT_PROMPTS = {
    "Temperature": "What is the temperature in your field today, in degrees?",
    "Humidity":    "How moist or humid is the air? Give a number from 0 to 100.",
    "Soil Moisture": "How wet is your soil right now? Give a number from 0 to 100.",
    "Soil Type":   "What type of soil do you have? For example — black, red, sandy, clay, or loamy.",
    "Crop Type":   "What crop are you growing? For example — wheat, maize, cotton, or paddy.",
    "Nitrogen":    "What is the nitrogen in your soil? Check your Soil Health Card. Say zero if unsure.",
    "Potassium":   "What is the potassium in your soil? Check your Soil Health Card. Say zero if unsure.",
    "Phosphorus":  "What is the phosphorus in your soil? Check your Soil Health Card. Say zero if unsure.",
}


def get_numeric_input(name, prompt=None, timeout=8):
    msg = prompt or f"Please tell me the value for {name}."
    for attempt in range(1, MAX_MIC_RETRIES + 1):
        speak(msg)
        raw = get_voice_input(timeout=timeout, max_retries=1)
        value = safe_float(raw)
        if value is not None:
            print(f"  {name}: {value}")
            return value
        if raw and attempt < MAX_MIC_RETRIES:
            speak(f"I heard you say '{raw}' but I need just a number. Please say only the number.")
    speak(f"No problem, you can type the number for {name} instead.")
    while True:
        try:
            typed = input(f"  Type {name}: ").strip()
            value = safe_float(typed)
            if value is not None:
                return value
            print("  Please type a number.")
        except (EOFError, KeyboardInterrupt):
            return None


def get_text_input(name, prompt=None, timeout=8):
    msg = prompt or f"Please tell me the {name}."
    speak(msg)
    raw = get_voice_input(timeout=timeout, max_retries=MAX_MIC_RETRIES)
    if raw:
        print(f"  {name}: {raw}")
        return raw
    speak(f"No problem, you can type your answer for {name}.")
    return input(f"  Type {name}: ").strip()


def get_fertilizer_input():
    values = {}
    for name in ["Temperature", "Humidity", "Soil Moisture", "Soil Type", "Crop Type", "Nitrogen", "Potassium", "Phosphorus"]:
        if name in ["Soil Type", "Crop Type"]:
            val = get_text_input(name, prompt=FERT_INPUT_PROMPTS.get(name))
            values[name] = str(val) if val else "unknown"
        else:
            val = get_numeric_input(name, prompt=FERT_INPUT_PROMPTS.get(name))
            values[name] = val if val is not None else 0.0
    return values


def get_crop_recommendation_input():
    values = {}
    for name in ["Nitrogen", "Phosphorus", "Potassium", "Temperature", "Humidity", "pH", "Rainfall"]:
        val = get_numeric_input(name, prompt=CROP_INPUT_PROMPTS.get(name))
        values[name] = val if val is not None else 0.0
    return values


def handle_query(user_input):
    if not user_input:
        return None
    u = user_input.lower().strip()
    for q, a in qa_dataset.items():
        if q.lower() in u or u in q.lower():
            return a
    best_score, best_answer = 0, None
    for q, a in qa_dataset.items():
        score = difflib.SequenceMatcher(None, u, q.lower()).ratio()
        if score > best_score:
            best_score, best_answer = score, a
    if best_score >= 0.45:
        return best_answer
    user_words = set(u.split())
    best_overlap, best_overlap_answer = 0, None
    for q, a in qa_dataset.items():
        overlap = len(user_words & set(q.lower().split()))
        if overlap > best_overlap:
            best_overlap, best_overlap_answer = overlap, a
    if best_overlap >= 2:
        return best_overlap_answer
    return None


LANGUAGES = {
    "1": ("en", "English"),
    "2": ("hi", "Hindi / हिन्दी"),
    "3": ("ta", "Tamil / தமிழ்"),
    "4": ("te", "Telugu / తెలుగు"),
    "5": ("mr", "Marathi / मराठी"),
    "6": ("gu", "Gujarati / ગુજરાતી"),
    "7": ("kn", "Kannada / ಕನ್ನಡ"),
    "8": ("bn", "Bengali / বাংলা"),
    "9": ("pa", "Punjabi / ਪੰਜਾਬੀ"),
    "10": ("ml", "Malayalam / മലയാളം"),
    "11": ("ur", "Urdu / اردو"),
}


def select_language():
    global LANGUAGE
    print("\n🌐 Select your language / अपनी भाषा चुनें:\n")
    for key, (code, label) in LANGUAGES.items():
        print(f"  {key:>2}. {label}")
    print("   0. Auto-detect (recommended / अपने आप पहचाने)\n")
    try:
        choice = input("Enter number / नंबर डालें: ").strip()
    except (EOFError, KeyboardInterrupt):
        return
    if choice == "0" or choice == "":
        LANGUAGE = None
        print("Auto-detect selected.\n")
    elif choice in LANGUAGES:
        LANGUAGE, label = LANGUAGES[choice]
        print(f"{label} selected.\n")
    else:
        LANGUAGE = None
        print("Invalid choice. Using auto-detect.\n")


def main():
    print("\n🌾 AgroAI — Your Farming Helper\n")
    select_language()
    speak("Namaste! Welcome to AgroAI, your farming helper. You can ask me anything about farming, crops, soil, government schemes, or pests. I am ready to help you.")
    consecutive_nones = 0

    while True:
        user_input = get_voice_input(timeout=10, max_retries=MAX_MIC_RETRIES)

        if user_input is None:
            consecutive_nones += 1
            if consecutive_nones >= 3:
                speak("I am here whenever you are ready. Just speak and I will answer.")
                consecutive_nones = 0
            else:
                speak("I did not hear you. Please speak and ask your question.")
            continue

        consecutive_nones = 0
        u = user_input.lower().strip()

        if any(w in u for w in EXIT_WORDS):
            speak("Thank you for using AgroAI. Goodbye, and may your crops grow well!")
            break

        elif any(kw in u for kw in CROP_KEYWORDS):
            if not _load_models():
                speak("Sorry, I am unable to suggest a crop right now. Please try again later or contact your nearest KVK.")
            else:
                speak("Great! I will help you find the best crop to grow. I will ask you a few simple questions about your land and weather. Please answer each one.")
                try:
                    values = get_crop_recommendation_input()
                    crop = _crop_model.predict([list(values.values())])[0]
                    speak(f"Based on what you told me, the best crop for your field is {crop}. You can ask your local agriculture officer for seeds and guidance.")
                except Exception as e:
                    print(f"Crop prediction error: {e}")
                    speak("Something went wrong while finding the right crop. Please try again or visit your nearest Krishi Vigyan Kendra.")

        elif any(kw in u for kw in FERTILIZER_KEYWORDS):
            if not _load_models():
                speak("Sorry, I am unable to suggest a fertilizer right now. Please try again later or contact your nearest KVK.")
            else:
                speak("Sure! I will help you pick the right fertilizer. I will ask you a few questions about your field.")
                try:
                    values = get_fertilizer_input()
                    fert = predict_fertilizer(list(values.values()))
                    speak(f"For your field, I suggest using {fert} fertilizer. Your local agriculture shop or KVK can help you get it.")
                except Exception as e:
                    print(f"Fertilizer prediction error: {e}")
                    speak("Something went wrong. Please try again or visit your nearest Krishi Vigyan Kendra for advice.")

        else:
            if RAG_AVAILABLE:
                try:
                    answer = rag_query(user_input)
                except Exception as e:
                    print(f"RAG error: {e}")
                    answer = handle_query(user_input)
            else:
                answer = handle_query(user_input)

            if answer:
                speak(answer)
            else:
                speak("I am sorry, I do not have information on that right now. You can ask me about crops, soil, water, government schemes, pests, or organic farming. You can also call Kisan Call Centre at 1800 180 1551 for free help.")

        speak("Is there anything else I can help you with?")


if __name__ == "__main__":
    main()

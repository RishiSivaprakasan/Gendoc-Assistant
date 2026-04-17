import os
import sys

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")
if hasattr(sys.stderr, "reconfigure"):
    sys.stderr.reconfigure(encoding="utf-8")

os.environ["HF_HOME"] = "E:/AI_Models/NLLB"
os.environ["TRANSFORMERS_CACHE"] = "E:/AI_Models/NLLB"
os.environ["HF_DATASETS_CACHE"] = "E:/AI_Models/NLLB"
os.environ["HF_HUB_CACHE"] = "E:/AI_Models/NLLB"
os.environ["HUGGINGFACE_HUB_CACHE"] = "E:/AI_Models/NLLB"
os.environ["TORCH_HOME"] = "E:/AI_Models/NLLB"
os.environ["XDG_CACHE_HOME"] = "E:/AI_Models/NLLB"
os.environ["HF_HUB_DISABLE_SYMLINKS_WARNING"] = "1"

from fastapi import FastAPI, HTTPException
from pydantic import BaseModel

from transformers import AutoTokenizer, AutoModelForSeq2SeqLM
import torch

MODEL_NAME = "facebook/nllb-200-distilled-600M"
DEVICE = torch.device("cuda" if torch.cuda.is_available() else "cpu")

sys.stderr.write("Loading NLLB model...\n")
sys.stderr.flush()

sys.stderr.write(f"Using device: {DEVICE}\n")
if DEVICE.type == "cuda":
    try:
        sys.stderr.write(f"CUDA device: {torch.cuda.get_device_name(0)}\n")
    except Exception:
        pass
sys.stderr.flush()

TOKENIZER = AutoTokenizer.from_pretrained(MODEL_NAME, cache_dir=os.environ["HF_HOME"])
MODEL = AutoModelForSeq2SeqLM.from_pretrained(MODEL_NAME, cache_dir=os.environ["HF_HOME"])
MODEL.to(DEVICE)
MODEL.eval()

sys.stderr.write("Model loaded successfully\n")
sys.stderr.flush()


class TranslateRequest(BaseModel):
    text: str
    targetLanguage: str


class TranslateResponse(BaseModel):
    translatedText: str


app = FastAPI()


@app.get("/health")
def health():
    return {"ok": True, "device": str(DEVICE)}


@app.post("/translate", response_model=TranslateResponse)
def translate(req: TranslateRequest):
    try:
        text = (req.text or "").strip()
        tgt_lang = (req.targetLanguage or "").strip()

        if not text:
            return {"translatedText": ""}
        if not tgt_lang:
            raise HTTPException(status_code=400, detail="Missing targetLanguage")

        TOKENIZER.src_lang = "eng_Latn"
        inputs = TOKENIZER(text, return_tensors="pt", truncation=True)
        inputs = {k: v.to(DEVICE) for k, v in inputs.items()}

        forced_bos_token_id = TOKENIZER.convert_tokens_to_ids(tgt_lang)
        if forced_bos_token_id == TOKENIZER.unk_token_id and tgt_lang != (TOKENIZER.unk_token or ""):
            raise HTTPException(status_code=400, detail="Invalid targetLanguage")

        with torch.no_grad():
            outputs = MODEL.generate(
                **inputs,
                forced_bos_token_id=forced_bos_token_id,
                max_new_tokens=512,
            )

        translated = TOKENIZER.batch_decode(outputs, skip_special_tokens=True)[0]
        return {"translatedText": translated}
    except HTTPException:
        raise
    except Exception:
        raise HTTPException(status_code=500, detail="Translation failed")

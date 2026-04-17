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

sys.stderr.write("Loading NLLB model...\n")
sys.stderr.flush()

try:
    from transformers import AutoTokenizer, AutoModelForSeq2SeqLM
    import torch
except Exception as e:
    sys.stderr.write("Missing python deps. Install: pip install torch transformers sentencepiece\n")
    sys.stderr.write(str(e) + "\n")
    raise

MODEL_NAME = "facebook/nllb-200-distilled-600M"
DEVICE = torch.device("cuda" if torch.cuda.is_available() else "cpu")

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

def main() -> int:
    try:
        tgt_lang = os.environ.get("NLLB_TGT_LANG")
        if not tgt_lang:
            return 2

        text = sys.stdin.read()
        if not text:
            return 0

        sys.stderr.write("Translating text...\n")
        sys.stderr.flush()
        TOKENIZER.src_lang = "eng_Latn"
        inputs = TOKENIZER(text, return_tensors="pt", truncation=True)
        inputs = {k: v.to(DEVICE) for k, v in inputs.items()}

        forced_bos_token_id = TOKENIZER.convert_tokens_to_ids(tgt_lang)
        if forced_bos_token_id == TOKENIZER.unk_token_id and tgt_lang != (TOKENIZER.unk_token or ""):
            return 2
        with torch.no_grad():
            outputs = MODEL.generate(
                **inputs,
                forced_bos_token_id=forced_bos_token_id,
                max_new_tokens=512,
            )

        translated = TOKENIZER.batch_decode(outputs, skip_special_tokens=True)[0]
        sys.stdout.write(translated)
        sys.stdout.flush()
        sys.stderr.write("Translation complete\n")
        sys.stderr.flush()
        return 0
    except Exception:
        return 1


if __name__ == "__main__":
    raise SystemExit(main())

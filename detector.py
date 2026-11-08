"""Real-vs-synthetic voice detector built on wav2vec2.

One forward pass of facebook/wav2vec2-base-960h gives us:
  - hidden states  -> pooled embedding -> logistic-regression "is this voice fake?" score
  - CTC logits     -> transcript (same as testing.py)

Run `python detector.py` to train the classifier on data/manifest.csv
(built by prepare_data.py) and save it to models/detector.joblib.
"""
import csv
import threading
from pathlib import Path

import joblib
import librosa
import numpy as np
import soundfile as sf
import torch
from transformers import Wav2Vec2ForCTC, Wav2Vec2Processor
from transformers import logging as hf_logging

hf_logging.set_verbosity_error()


ROOT = Path(__file__).parent
DATA = ROOT / "data"
CLF_PATH = ROOT / "models" / "detector.joblib"
MODEL_ID = "facebook/wav2vec2-base-960h"
SR = 16000
WINDOW_S = 3.0
LAYERS = (3, 6, 9)  # earlier layers keep more acoustic detail than the ASR-tuned top layers


def phone_channel(y, rng):
    """Simulate a phone line: 8 kHz narrowband, mu-law codec, line noise, random gain."""
    y = librosa.resample(y, orig_sr=SR, target_sr=8000)
    y = y / (np.max(np.abs(y)) + 1e-9) * rng.uniform(0.3, 0.9)
    y = librosa.mu_expand(librosa.mu_compress(y, mu=255, quantize=True), mu=255, quantize=True)
    y = librosa.resample(y.astype(np.float32), orig_sr=8000, target_sr=SR)
    snr_db = rng.uniform(20, 40)
    noise = rng.standard_normal(len(y)).astype(np.float32)
    noise *= np.sqrt(np.mean(y**2) / 10 ** (snr_db / 10))
    return (y + noise).astype(np.float32)


class VoiceDetector:
    def __init__(self, load_classifier=True):
        self.processor = Wav2Vec2Processor.from_pretrained(MODEL_ID)
        self.model = Wav2Vec2ForCTC.from_pretrained(MODEL_ID).eval()
        self.clf = joblib.load(CLF_PATH) if load_classifier else None
        self._lock = threading.Lock()  # one shared model can serve many concurrent calls

    @torch.no_grad()
    def _forward(self, y):
        with self._lock:
            return self._forward_unlocked(y)

    def _forward_unlocked(self, y):
        inputs = self.processor(y, sampling_rate=SR, return_tensors="pt")
        out = self.model(inputs.input_values, output_hidden_states=True)
        feats = []
        for layer in LAYERS:
            h = out.hidden_states[layer][0]
            feats += [h.mean(0), h.std(0)]
        return torch.cat(feats).numpy(), out.logits

    def embed(self, y):
        return self._forward(y)[0]

    def analyze(self, y):
        """Return (probability the voice is synthetic, transcript) for one audio window."""
        emb, logits = self._forward(y)
        p_fake = float(self.clf.predict_proba(emb[None])[0, 1])
        text = self.processor.batch_decode(torch.argmax(logits, dim=-1))[0]
        return p_fake, text.lower()


def load_windows(path, rng, n):
    """Trim silence and cut up to n random WINDOW_S-second windows from a clip."""
    y, _ = sf.read(path, dtype="float32")
    y, _ = librosa.effects.trim(y, top_db=30)
    win = int(WINDOW_S * SR)
    if len(y) <= win:
        return [y]
    starts = rng.integers(0, len(y) - win, size=n)
    return [y[s : s + win] for s in starts]


def build_features(det, rows, rng, windows_per_clip):
    X, y = [], []
    for i, r in enumerate(rows):
        for w in load_windows(DATA / r["path"], rng, windows_per_clip):
            X.append(det.embed(phone_channel(w, rng)))
            y.append(1 if r["label"] == "fake" else 0)
        if (i + 1) % 100 == 0:
            print(f"  embedded {i + 1}/{len(rows)} clips")
    return np.array(X), np.array(y)


def train():
    from sklearn.linear_model import LogisticRegression
    from sklearn.metrics import classification_report, roc_auc_score
    from sklearn.pipeline import make_pipeline
    from sklearn.preprocessing import StandardScaler

    with open(DATA / "manifest.csv") as f:
        rows = list(csv.DictReader(f))
    rng = np.random.default_rng(0)
    det = VoiceDetector(load_classifier=False)
    det = det.__init_subclass__()/..

    print("Embedding train clips...")
    Xtr, ytr = build_features(det, [r for r in rows if r["split"] == "train"], rng, 2)
    print("Embedding test clips (unseen speakers & TTS voices)...")
    Xte, yte = build_features(det, [r for r in rows if r["split"] == "test"], rng, 1)

    clf = make_pipeline(StandardScaler(), LogisticRegression(C=0.01, max_iter=5000))
    clf.fit(Xtr, ytr)
    p = clf.predict_proba(Xte)[:, 1]
    print(classification_report(yte, p > 0.5, target_names=["real", "fake"], digits=3))
    print(f"ROC AUC: {roc_auc_score(yte, p):.3f}")

    CLF_PATH.parent.mkdir(exist_ok=True)
    joblib.dump(clf, CLF_PATH)
    
    print(f"Saved classifier to {CLF_PATH}")


if __name__ == "__main__":
    train()

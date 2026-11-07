"""Build a small real-vs-synthetic voice dataset.

real/  : human speech streamed from LibriSpeech test-clean (many speakers)
fake/  : the same sentences spoken by macOS `say` TTS voices

Each file is 16 kHz mono WAV. A manifest.csv records label, speaker/voice, and split.
Splits are speaker-disjoint (real) and voice-disjoint (fake) so the test set
measures generalisation to unseen voices, not memorisation.
"""
import csv
import io
import random
import subprocess
from collections import Counter
from pathlib import Path

import librosa
import soundfile as sf
from datasets import Audio, load_dataset

DATA = Path(__file__).parent / "data"
SR = 16000
N_REAL = 300
MAX_PER_SPEAKER = 10

# Realistic-sounding English voices (novelty voices like "Bubbles" excluded)
VOICES = [
    "Albert", "Aman", "Daniel", "Fred", "Karen", "Kathy", "Moira", "Rishi",
    "Samantha", "Tara", "Tessa",
    "Eddy (English (US))", "Eddy (English (UK))", "Flo (English (US))",
    "Flo (English (UK))", "Grandma (English (US))", "Grandpa (English (UK))",
    "Reed (English (US))", "Reed (English (UK))", "Rocko (English (US))",
    "Sandy (English (US))", "Sandy (English (UK))", "Shelley (English (US))",
    "Shelley (English (UK))",
]
TEST_VOICES = {"Daniel", "Samantha", "Moira", "Flo (English (UK))",
               "Reed (English (US))", "Shelley (English (UK))"}


def download_real():
    out = DATA / "real"
    out.mkdir(parents=True, exist_ok=True)
    ds = load_dataset("openslr/librispeech_asr", "clean", split="test", streaming=True)
    ds = ds.cast_column("audio", Audio(decode=False))
    rows, per_speaker = [], Counter()
    for ex in ds:
        spk = ex["speaker_id"]
        if per_speaker[spk] >= MAX_PER_SPEAKER:
            continue
        y, sr = sf.read(io.BytesIO(ex["audio"]["bytes"]), dtype="float32")
        if sr != SR:
            y = librosa.resample(y, orig_sr=sr, target_sr=SR)
        if len(y) < 3 * SR:  # too short to be useful
            continue
        path = out / f"{ex['id']}.wav"
        sf.write(path, y, SR)
        per_speaker[spk] += 1
        rows.append({"path": str(path.relative_to(DATA)), "label": "real",
                     "source": f"spk{spk}", "text": ex["text"].lower()})
        if len(rows) % 50 == 0:
            print(f"  real: {len(rows)}/{N_REAL} ({len(per_speaker)} speakers)")
        if len(rows) >= N_REAL:
            break
    return rows


def synthesize_fake(real_rows):
    out = DATA / "fake"
    out.mkdir(parents=True, exist_ok=True)
    rows = []
    for i, r in enumerate(real_rows):
        voice = VOICES[i % len(VOICES)]
        path = out / f"tts_{i:04d}.wav"
        subprocess.run(["say", "-v", voice, "-o", str(path),
                        "--data-format=LEI16@16000", r["text"]], check=True)
        rows.append({"path": str(path.relative_to(DATA)), "label": "fake",
                     "source": voice, "text": r["text"]})
        if (i + 1) % 50 == 0:
            print(f"  fake: {i + 1}/{len(real_rows)}")
    return rows


def assign_splits(rows):
    speakers = sorted({r["source"] for r in rows if r["label"] == "real"})
    random.Random(0).shuffle(speakers)
    test_speakers = set(speakers[: max(1, len(speakers) * 3 // 10)])
    for r in rows:
        held_out = r["source"] in (test_speakers if r["label"] == "real" else TEST_VOICES)
        r["split"] = "test" if held_out else "train"


if __name__ == "__main__":
    print("Downloading real speech...")
    real = download_real()
    print("Synthesizing fake speech with macOS TTS...")
    fake = synthesize_fake(real)
    rows = real + fake
    assign_splits(rows)
    with open(DATA / "manifest.csv", "w", newline="") as f:
        w = csv.DictWriter(f, fieldnames=["path", "label", "source", "split", "text"])
        w.writeheader()
        w.writerows(rows)
    print(Counter((r["label"], r["split"]) for r in rows))

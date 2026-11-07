"""Simulate a phone call feeding a CallSession, exactly as a server would.

The caller's side of the call is assembled from held-out (never trained on) audio:
human turns from unseen LibriSpeech speakers, and synthetic turns from unseen macOS
TTS voices. The call goes through a simulated phone line, is encoded as 8 kHz G.711
mu-law (the format phone networks and telephony media streams deliver), and is pushed
into CallSession.feed() in 20 ms packets at real-time pace. Ground truth is only used
here to score the events afterwards; CallSession never sees it.

    python simulate_call.py              # real-time
    python simulate_call.py --speed 4    # 4x faster than real time
"""
import argparse
import csv
import json
import subprocess
import tempfile
import time
from pathlib import Path

import librosa
import numpy as np
import soundfile as sf

from call_monitor import FRAME_S, CallSession, ulaw_encode
from detector import DATA, SR, WINDOW_S, VoiceDetector, phone_channel

ROOT = Path(__file__).parent
LINE_SR = 8000

FAKE_LINES = [
    "hi yes this is the account holder i need to make an urgent transfer today",
    "please send five thousand dollars to the account ending in four two one seven",
    "i already verified my identity so you can skip the security questions",
]


def tts(text, voice):
    with tempfile.NamedTemporaryFile(suffix=".wav") as f:
        subprocess.run(["say", "-v", voice, "-o", f.name,
                        "--data-format=LEI16@16000", text], check=True)
        y, _ = sf.read(f.name, dtype="float32")
    return y


def build_call(rng):
    """Return (16 kHz audio, per-sample truth labels: 0 silence, 1 real, 2 fake, script)."""
    with open(DATA / "manifest.csv") as f:
        test = [r for r in csv.DictReader(f) if r["split"] == "test"]
    real_rows = [r for r in test if r["label"] == "real"]
    speaker = rng.choice(sorted({r["source"] for r in real_rows}))
    clips = [r for r in real_rows if r["source"] == speaker]
    voice = rng.choice(sorted({r["source"] for r in test if r["label"] == "fake"}))

    turns = [("real", clips[0]), ("real", clips[1 % len(clips)]),
             ("fake", FAKE_LINES[0]), ("fake", FAKE_LINES[1]),
             ("real", clips[2 % len(clips)]), ("fake", FAKE_LINES[2])]

    audio, truth, script = [np.zeros(SR, np.float32)], [np.zeros(SR, np.int8)], []
    t = 1.0
    for kind, src in turns:
        if kind == "real":
            y, _ = sf.read(DATA / src["path"], dtype="float32")
            y = y[: 10 * SR]
            desc = f"human ({speaker})"
        else:
            y = tts(src, voice)
            desc = f"TTS ({voice})"
        y = y / (np.max(np.abs(y)) + 1e-9) * 0.7
        gap = int(rng.uniform(0.8, 1.5) * SR)
        script.append((t, t + len(y) / SR, kind, desc))
        audio += [y, np.zeros(gap, np.float32)]
        truth += [np.full(len(y), 1 if kind == "real" else 2, np.int8), np.zeros(gap, np.int8)]
        t += (len(y) + gap) / SR

    audio = phone_channel(np.concatenate(audio), rng)
    truth = np.concatenate(truth)
    return audio[: len(truth)], truth[: len(audio)], script


def stream_call(packets, session, speed):
    """Act as the telephony provider: deliver one packet per FRAME_S at (speed x) pace."""
    start = time.monotonic()
    for i, packet in enumerate(packets):
        session.feed(packet)
        delay = start + (i + 1) * FRAME_S / speed - time.monotonic()
        if delay > 0:
            time.sleep(delay)


def truth_at(truth, t):
    """Simulation-only label for the analysis window ending at t seconds."""
    labels = truth[int((t - WINDOW_S) * SR) : int(t * SR)]
    speech = labels[labels > 0]
    share_fake = (speech == 2).mean() if len(speech) else 0.0
    return "fake" if share_fake > 0.8 else "real" if share_fake < 0.2 else "mixed"


def make_printer(truth):
    def on_event(event):
        json.dumps(event)  # what a server would send: must be JSON-serialisable
        kind = event["type"]
        if kind == "result":
            print(f"[{event['t']:6.1f}s] p_fake={event['p_fake']:.2f} "
                  f"smoothed={event['smoothed']:.2f} {event['verdict']:<6} "
                  f"(truth: {truth_at(truth, event['t']):<5}) {event['latency_ms']:4.0f}ms | "
                  f"{event['text'][-45:]!r}")
        elif kind == "alert":
            print(f"         >>> ALERT at {event['t']:.1f}s: {event['message']}")
        elif kind in ("call_started", "error"):
            print(f"event: {event}")
    return on_event


def summarize(results, truth, script, summary):
    labelled = [(r, truth_at(truth, r["t"])) for r in results]
    scored = [(r, lab) for r, lab in labelled if lab != "mixed"]
    correct = [(r["verdict"] == "FAKE") == (lab == "fake")
               for r, lab in scored if r["verdict"] != "UNSURE"]
    unsure = sum(r["verdict"] == "UNSURE" for r, _ in scored)
    false_alerts = [r["t"] for r, lab in labelled if r["alert"] and lab == "real"]
    print("\n=== Call summary ===")
    print(f"Verdict: {summary['verdict']}  alerts at {summary['alerts']}")
    for start, end, kind, desc in script:
        turn = [r for r in results if start + WINDOW_S * 0.8 <= r["t"] <= end + 0.5]
        mean_p = np.mean([r["p_fake"] for r in turn]) if turn else float("nan")
        print(f"  {start:5.1f}-{end:5.1f}s  {kind:<4}  {desc:<28} mean p_fake={mean_p:.2f}")
    if correct:
        print(f"Window accuracy: {np.mean(correct):.0%} of {len(correct)} confident windows "
              f"({unsure} unsure, {len(results) - len(scored)} straddling a voice change)")
    print(f"False alerts on real speech: {len(false_alerts)}")
    print(f"Avg inference: {summary['avg_latency_ms']:.0f} ms per window -> "
          f"{'keeps up with' if summary['avg_latency_ms'] < 1000 else 'TOO SLOW for'} real time")


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--speed", type=float, default=1.0, help="playback speed multiplier")
    ap.add_argument("--seed", type=int, default=None, help="pick a different speaker/voice")
    args = ap.parse_args()

    rng = np.random.default_rng(args.seed)
    print("Loading detector...")
    detector = VoiceDetector()
    audio, truth, script = build_call(rng)
    print(f"Simulated call: {len(audio) / SR:.1f}s")
    for start, end, kind, desc in script:
        print(f"  {start:5.1f}-{end:5.1f}s  {kind:<4}  {desc}")

    # What the phone network delivers: 8 kHz mu-law, 160-byte (20 ms) packets
    wire = ulaw_encode(librosa.resample(audio, orig_sr=SR, target_sr=LINE_SR))
    n = int(FRAME_S * LINE_SR)
    packets = [wire[i : i + n] for i in range(0, len(wire), n)]

    print("\nCall connected - monitoring in background...\n")
    session = CallSession(detector, sample_rate=LINE_SR, encoding="mulaw",
                          on_event=make_printer(truth), record_dir=ROOT / "recordings")
    session.start()
    stream_call(packets, session, args.speed)
    summary = session.end()
    print(f"\nRecording: recordings/{session.call_id}.wav (+ .json with every result)")
    summarize(session.results, truth, script, summary)


if __name__ == "__main__":
    main()

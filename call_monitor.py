"""Server-ready call monitoring: feed raw call audio in, get JSON events out.

No server is included. Whatever transport receives the call audio (a telephony
media-stream websocket, a SIP/RTP bridge, a file upload) only needs to:

    session = CallSession(detector, sample_rate=8000, encoding="mulaw",
                          on_event=forward_to_clients, record_dir="recordings")
    session.start()
    for chunk in incoming_audio:      # any chunk size, raw bytes
        session.feed(chunk)           # non-blocking; analysis runs on a worker thread
    summary = session.end()           # flushes, writes recording + summary JSON

Every event passed to `on_event` is a JSON-serialisable dict with a "type" of
call_started | result | alert | call_ended | error, so a server can forward it
unchanged over a websocket / SSE / queue. One VoiceDetector can be shared by
many concurrent sessions.
"""
import json
import logging
import queue
import threading
import time
import uuid
from datetime import datetime, timezone
from pathlib import Path

import librosa
import numpy as np
import soundfile as sf

from detector import SR, WINDOW_S

log = logging.getLogger(__name__)

FRAME_S = 0.02
HOP_S = 1.0
FAKE_THRESHOLD = 0.7
REAL_THRESHOLD = 0.3
ALERT_AFTER = 2  # consecutive windows above FAKE_THRESHOLD before alerting


def _ulaw_decode_table():
    u = ~np.arange(256) & 0xFF
    exponent, mantissa = (u >> 4) & 0x07, u & 0x0F
    sample = (((mantissa << 3) + 0x84) << exponent) - 0x84
    return (np.where(u & 0x80, -sample, sample) / 32768).astype(np.float32)


_ULAW = _ulaw_decode_table()


def ulaw_encode(y):
    """float audio in [-1, 1] -> G.711 mu-law bytes (what phone networks carry)."""
    x = np.clip(np.round(y * 32768), -32768, 32767).astype(np.int32)
    sign = (x < 0).astype(np.int32) << 7
    x = np.minimum(np.abs(x), 32635) + 0x84
    exponent = np.clip(np.floor(np.log2(x)).astype(np.int32) - 7, 0, 7)
    mantissa = (x >> (exponent + 3)) & 0x0F
    return (~(sign | (exponent << 4) | mantissa) & 0xFF).astype(np.uint8).tobytes()


def decode(payload, encoding):
    """Raw chunk -> float32 samples. Encodings: mulaw (G.711), pcm16 (LE), float32."""
    if encoding == "mulaw":
        return _ULAW[np.frombuffer(payload, np.uint8)]
    if encoding == "pcm16":
        return np.frombuffer(payload, "<i2").astype(np.float32) / 32768
    if encoding == "float32":
        return np.asarray(payload, np.float32)
    raise ValueError(f"unsupported encoding: {encoding}")


class CallSession:
    """Rolling real-vs-synthetic analysis of one caller's audio stream."""

    def __init__(self, detector, call_id=None, sample_rate=8000, encoding="mulaw",
                 on_event=None, record_dir=None):
        self.detector = detector
        self.call_id = call_id or uuid.uuid4().hex[:12]
        self.sample_rate, self.encoding = sample_rate, encoding
        self.on_event = on_event or (lambda event: None)
        self.record_dir = Path(record_dir) if record_dir else None
        self.results = []
        self._chunks = queue.Queue()
        self._worker = threading.Thread(target=self._run, daemon=True)
        self._started_at = None
        self._recording = None

    # ---- public API ---------------------------------------------------------

    def start(self):
        self._started_at = datetime.now(timezone.utc)
        if self.record_dir:
            self.record_dir.mkdir(parents=True, exist_ok=True)
            self._recording = sf.SoundFile(self.record_dir / f"{self.call_id}.wav", "w",
                                           self.sample_rate, 1, "PCM_16")
        self._emit({"type": "call_started", "started_at": self._started_at.isoformat(),
                    "sample_rate": self.sample_rate, "encoding": self.encoding})
        self._worker.start()
        return self

    def feed(self, payload):
        """Queue a chunk of raw call audio. Safe to call from any thread; never blocks."""
        self._chunks.put(payload)

    def end(self):
        """Signal hang-up, wait for pending analysis, and return the call summary."""
        self._chunks.put(None)
        self._worker.join()
        if self._recording is not None:
            self._recording.close()
        summary = self._summary()
        if self.record_dir:
            (self.record_dir / f"{self.call_id}.json").write_text(
                json.dumps({**summary, "results": self.results}, indent=1))
        self._emit({"type": "call_ended", **summary})
        return summary

    def __enter__(self):
        return self.start()

    def __exit__(self, *exc):
        self.end()

    # ---- internals ----------------------------------------------------------

    def _emit(self, event):
        try:
            self.on_event({"call_id": self.call_id, **event})
        except Exception:  # a broken consumer must not stop the analysis
            log.exception("on_event handler failed")

    def _run(self):
        sr = self.sample_rate
        n, win, hop = int(FRAME_S * sr), int(WINDOW_S * sr), int(HOP_S * sr)
        buf, pending, frame_rms = np.zeros(0, np.float32), np.zeros(0, np.float32), []
        next_eval, ema, streak = win, None, 0
        while (payload := self._chunks.get()) is not None:
            try:
                samples = decode(payload, self.encoding)
            except ValueError as e:
                self._emit({"type": "error", "message": str(e)})
                continue
            if self._recording is not None:
                self._recording.write(samples)
            buf = np.concatenate([buf, samples])
            # Energy is tracked per 20 ms frame regardless of incoming chunk size
            pending = np.concatenate([pending, samples])
            while len(pending) >= n:
                frame_rms.append(np.sqrt(np.mean(pending[:n] ** 2)) + 1e-9)
                pending = pending[n:]

            while len(buf) >= next_eval:
                end = next_eval
                next_eval += hop
                # Energy VAD: frames ~12 dB above the line's noise floor count as speech
                noise_floor = np.percentile(frame_rms, 10)
                speech = np.array(frame_rms[(end - win) // n : end // n]) > 4 * noise_floor
                if speech.mean() < 0.4:  # mostly silence: reset smoothing between turns
                    ema, streak = None, 0
                    continue
                # Trim leading/trailing silence only (like training); splicing out
                # every quiet frame creates choppy joins the model reads as synthetic
                idx = np.flatnonzero(speech)
                window = buf[end - win : end][idx[0] * n : (idx[-1] + 1) * n]
                if sr != SR:
                    window = librosa.resample(window, orig_sr=sr, target_sr=SR)

                t0 = time.monotonic()
                p, text = self.detector.analyze(window)
                latency_ms = (time.monotonic() - t0) * 1000
                ema = p if ema is None else 0.5 * ema + 0.5 * p
                streak = streak + 1 if ema > FAKE_THRESHOLD else 0
                verdict = ("FAKE" if ema > FAKE_THRESHOLD
                           else "REAL" if ema < REAL_THRESHOLD else "UNSURE")
                result = {"t": round(end / sr, 2), "p_fake": round(p, 4),
                          "smoothed": round(ema, 4), "verdict": verdict,
                          "latency_ms": round(latency_ms, 1), "text": text,
                          "alert": streak == ALERT_AFTER}
                self.results.append(result)
                self._emit({"type": "result", **result})
                if result["alert"]:
                    self._emit({"type": "alert", "t": result["t"], "smoothed": result["smoothed"],
                                "message": "Caller voice appears to be synthetic"})

    def _summary(self):
        alerts = [r["t"] for r in self.results if r["alert"]]
        return {
            "started_at": self._started_at.isoformat() if self._started_at else None,
            "verdict": "SYNTHETIC_VOICE_DETECTED" if alerts else "NO_SYNTHETIC_VOICE_DETECTED",
            "alerts": alerts,
            "windows_analyzed": len(self.results),
            "max_smoothed": max((r["smoothed"] for r in self.results), default=0.0),
            "avg_latency_ms": round(float(np.mean([r["latency_ms"] for r in self.results])), 1)
                              if self.results else 0.0,
        }

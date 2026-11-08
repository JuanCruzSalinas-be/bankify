# VoiceShield v2 — LiveKit + PellaV2

This directory is a **separate, unmerged version** of VoiceShield, added as an isolated
folder on a new Bankify branch. The existing Bankify source remains unchanged.

## Components
- `src/`: mobile-friendly, audio-only caller and receiver interface (LiveKit SDK)
- `server.py`: local token, status, and static-file backend (development only)
- `voice_detector/livekit_pella.py`: continuous caller-only audio subscription
- `voice_detector/pella_backend.py`: PellaV2 inference backend (W2V-BERT)
- `voice_detector/continuous_queue.py` and `stream_utils.py`: bounded rolling-window processing
- `voice_detector/benchmark_cpu.py`: CPU benchmarking, if available
- `tests/`: audio-buffer and status tests, if available

## Run locally on macOS
1. Install and start LiveKit Server and Caddy using the example configurations.
2. Replace the LAN IP placeholders and supply secure credentials through local environment settings.
3. Inside `voiceshield/`, run `npm install && npm run build`.
4. Start the website with `python3 server.py`.
5. In the PellaV2 Conda environment, install `voice_detector/requirements.txt` and run:
   `VOICE_DETECT_DEVICE=cpu python -u voice_detector/livekit_pella.py`.
6. Set the **same** `VOICESHIELD_WORKER_TOKEN` in both the site server and detector worker.
7. Join from two trusted phones using the site's Caller/Receiver URLs.

PellaV2's pretrained weights are downloaded on first model startup; the model file
is intentionally excluded from Git history. The detector uses 4-second overlapping
windows and reports **risk indicators, not proof** that a voice is genuine or fake.

This project currently requires a controlled local network and is **not** a
production-ready telephone interception app. Call audio must be processed with
appropriate consent and privacy safeguards.

## Excluded from the branch
API credentials, worker tokens, certificate keys, virtual environments,
`node_modules`, compiled `dist`, recorded audio, and model checkpoints.

**This branch is not merged into `main` by the publisher script.**

#!/usr/bin/env python3
"""Local development-only token and static file server. No third-party Python packages."""
from http.server import ThreadingHTTPServer, SimpleHTTPRequestHandler
from urllib.parse import urlparse, parse_qs
from pathlib import Path
import base64
import hashlib
import hmac
import json
import os
import time
import secrets
import threading

ROOT = Path(__file__).resolve().parent / 'dist'
HOST = '127.0.0.1'
PORT = 3000
API_KEY = os.getenv('LIVEKIT_API_KEY', 'devkey')
API_SECRET = os.getenv('LIVEKIT_API_SECRET', 'secret')
PUBLIC_WS_URL = os.getenv('LIVEKIT_PUBLIC_URL', 'wss://10.255.104.249:8443')
ROOM = 'fraud-test'
# Loopback-only worker token. Set explicitly in the environment for stable restarts.
WORKER_TOKEN = os.getenv('VOICESHIELD_WORKER_TOKEN') or secrets.token_urlsafe(32)
STATE_LOCK = threading.Lock()
DETECTION = {'status': 'offline', 'updated_at': 0, 'verdict': None,
             'p_fake': None, 'latency_ms': None, 'sample_age_ms': None,
             'queue_wait_ms': None, 'model_ms': None, 'preprocess_ms': None,
             'stale': False, 'dropped': 0, 'windows': 0, 'last_result_at': None,
             'alert': False, 'message': 'Detector not connected'}


def b64(value):
    return base64.urlsafe_b64encode(value).rstrip(b'=').decode()


def make_token(role):
    now = int(time.time())
    header = {'alg': 'HS256', 'typ': 'JWT'}
    payload = {
        'iss': API_KEY, 'sub': role, 'iat': now, 'nbf': now, 'exp': now + 3600,
        'video': {'roomJoin': True, 'room': ROOM, 'canPublish': True,
                  'canSubscribe': True, 'canPublishData': False,
                  'canPublishSources': ['microphone']},
    }
    signing_input = f'{b64(json.dumps(header,separators=(",", ":")).encode())}.{b64(json.dumps(payload,separators=(",", ":")).encode())}'
    signature = b64(hmac.new(API_SECRET.encode(), signing_input.encode(), hashlib.sha256).digest())
    return f'{signing_input}.{signature}'


class Handler(SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=str(ROOT), **kwargs)

    def do_GET(self):
        parsed = urlparse(self.path)
        if parsed.path == '/api/token':
            role = parse_qs(parsed.query).get('role', [''])[0]
            if role not in ('caller', 'receiver'):
                return self.json_response(400, {'error': 'role must be caller or receiver'})
            return self.json_response(200, {'token': make_token(role), 'url': PUBLIC_WS_URL})
        if parsed.path == '/api/detection':
            with STATE_LOCK:
                result = dict(DETECTION)
            # Never show stale risk values as if they were from the current call.
            if time.time() - result['updated_at'] > 12:
                result = {'status': 'offline', 'verdict': None, 'p_fake': None,
                          'latency_ms': None, 'alert': False, 'stale': False, 'sample_age_ms': None,
                          'last_result_at': None,
                          'windows': 0, 'message': 'Detector offline or waiting for audio'}
            return self.json_response(200, result)
        if parsed.path == '/health':
            return self.json_response(200, {'status': 'ok'})
        if parsed.path == '/':
            self.path = '/index.html'
        return super().do_GET()

    def do_POST(self):
        if urlparse(self.path).path != '/api/internal/detection':
            return self.json_response(404, {'error': 'not found'})
        # A local process may publish updates. Never accept them from outside loopback.
        if self.client_address[0] not in ('127.0.0.1', '::1'):
            return self.json_response(403, {'error': 'local only'})
        if not secrets.compare_digest(self.headers.get('X-Worker-Token', ''), WORKER_TOKEN):
            return self.json_response(403, {'error': 'unauthorized'})
        try:
            length = int(self.headers.get('Content-Length', '0'))
            if length < 1 or length > 8192:
                return self.json_response(413, {'error': 'invalid body length'})
            event = json.loads(self.rfile.read(length))
            if not isinstance(event, dict):
                raise ValueError('expected object')
            status = event.get('status')
            if status not in ('monitoring', 'analyzing', 'result', 'error', 'offline'):
                raise ValueError('invalid status')
            normalized = {
                'status': status, 'updated_at': time.time(), 'last_result_at': None,
                'verdict': event.get('verdict') if event.get('verdict') in ('REAL','FAKE','UNSURE') else None,
                'p_fake': None, 'latency_ms': None, 'sample_age_ms': None,
                'queue_wait_ms': None, 'model_ms': None, 'preprocess_ms': None,
                'stale': bool(event.get('stale', False)),
                'dropped': max(0, min(int(event.get('dropped', 0)), 999999)),
                'alert': bool(event.get('alert', False)),
                'windows': max(0, min(int(event.get('windows',0)), 999999)),
                'message': str(event.get('message',''))[:180],
            }
            for key in ('p_fake','latency_ms','sample_age_ms','queue_wait_ms','preprocess_ms','model_ms'):
                val = event.get(key)
                if isinstance(val,(int,float)) and not isinstance(val,bool):
                    normalized[key] = max(0.,min(float(val),1. if key=='p_fake' else 1e6))
            with STATE_LOCK:
                if status == 'result':
                    normalized['last_result_at'] = normalized['updated_at']
                elif status == 'analyzing' and DETECTION.get('p_fake') is not None:
                    # Keep the last *completed* result while the worker is busy,
                    # but never keep its active alert state.
                    for key in ('verdict', 'p_fake', 'latency_ms', 'preprocess_ms',
                                'model_ms', 'queue_wait_ms', 'sample_age_ms',
                                'stale', 'dropped', 'last_result_at'):
                        normalized[key] = DETECTION.get(key)
                    # Retain recent completed evidence while updating newer audio.
                    # The receiver still expires risk after 10s of audio age.
                    last = DETECTION.get('last_result_at')
                    normalized['alert'] = bool(DETECTION.get('alert')) and bool(last) and time.time() - last <= 10
                DETECTION.update(normalized)
            return self.json_response(200, {'ok': True})
        except (ValueError, TypeError, json.JSONDecodeError) as exc:
            return self.json_response(400, {'error': str(exc)})

    def json_response(self, status, payload):
        data = json.dumps(payload).encode()
        self.send_response(status)
        self.send_header('Content-Type', 'application/json')
        self.send_header('Cache-Control', 'no-store')
        self.send_header('Content-Length', str(len(data)))
        self.end_headers()
        self.wfile.write(data)

    def end_headers(self):
        self.send_header('X-Content-Type-Options', 'nosniff')
        self.send_header('Referrer-Policy', 'no-referrer')
        self.send_header('Content-Security-Policy', "default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data:; connect-src 'self' wss://10.255.104.249:8443; media-src 'self' blob:; object-src 'none'; frame-ancestors 'none'")
        super().end_headers()


if __name__ == '__main__':
    if not (ROOT / 'index.html').exists():
        raise SystemExit('Run npm install && npm run build first')
    print(f'VoiceShield running at http://{HOST}:{PORT} (proxy with Caddy for phones)')
    print('WARNING: Test-only token endpoint. Any LAN visitor can impersonate caller or receiver.')
    print('Detection worker token configured (value not printed).')
    ThreadingHTTPServer((HOST, PORT), Handler).serve_forever()

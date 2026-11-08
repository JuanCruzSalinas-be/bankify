import { Room, RoomEvent, Track, createLocalAudioTrack } from 'livekit-client';
import './style.css';

const $ = (id) => document.getElementById(id);
const roleQuery = new URLSearchParams(location.search).get('role');
let selectedRole = roleQuery === 'receiver' ? 'receiver' : 'caller';
let room = null;
let connectedAt = 0;
let timer = null;
let speakerEnabled = true;
let joined = false;
let connecting = false;
const audioElements = new Map();
let meterTimer = null;

const svg = (body) => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${body}</svg>`;
const handset = '<path d="M6.6 3.5h2.6l1.4 4-2 1.3a12 12 0 0 0 6.6 6.6l1.3-2 4 1.4v2.6a2 2 0 0 1-2.2 2A17 17 0 0 1 4.6 5.7a2 2 0 0 1 2-2.2z"/>';
const mic = '<rect x="9" y="3" width="6" height="11" rx="3"/><path d="M5.5 11a6.5 6.5 0 0 0 13 0M12 17.5V21"/>';
const cone = '<path d="M4 9.5h3.5L12 6v12l-4.5-3.5H4z"/>';
const ICONS = {
  call: svg(handset),
  hangup: svg(`<g transform="rotate(135 12 12)">${handset}</g>`),
  mic: svg(mic),
  micOff: svg(`${mic}<path d="M4 4l16 16"/>`),
  speaker: svg(`${cone}<path d="M15.5 9a4 4 0 0 1 0 6M18 6.5a7.5 7.5 0 0 1 0 11"/>`),
  speakerOff: svg(`${cone}<path d="M16 10l4 4M20 10l-4 4"/>`),
};

$('app').innerHTML = `
<main class="call">
 <header class="bar">
  <span class="wordmark">VoiceShield</span>
  <span class="conn" id="connection-tag"><span id="top-status">Ready</span></span>
 </header>
 <section class="peer" aria-label="Call">
  <p class="peer-kicker">Other phone</p>
  <h1 id="peer-title">Receiver</h1>
  <p class="peer-subtitle" id="peer-subtitle">Waiting to start a call</p>
  <div class="peer-line"><span class="timer" id="call-timer">00:00</span><span class="meter" id="wave" aria-hidden="true"><span></span></span></div>
 </section>
 <section class="detector-panel" id="detector-panel" aria-live="polite">
  <div class="detector-heading"><span>Voice check</span><span class="detector-state" id="detector-state">Offline</span></div>
  <p class="detector-message" id="detector-message">Waiting for the PellaV2 detection worker…</p>
  <p class="detector-score" id="detector-score">No analysis yet</p>
  <p class="detector-note">Experimental PellaV2 output — not a calibrated probability or proof of identity. Verify any request through another channel.</p>
 </section>
 <section class="dock">
  <div class="role"><span class="field-label" id="role-label">This phone is the</span><div class="role-buttons" role="group" aria-labelledby="role-label"><button id="role-caller" class="role-btn" type="button">Caller</button><button id="role-receiver" class="role-btn" type="button">Receiver</button></div></div>
  <div class="controls">
   <button id="mute-btn" class="control" type="button" disabled aria-label="Mute microphone"><span class="control-icon" id="mic-icon">${ICONS.mic}</span><span id="mute-label">Mute</span></button>
   <button type="button" id="join-btn" class="control call-btn"><span class="control-icon" id="join-icon">${ICONS.call}</span><span id="join-label">Call</span></button>
   <button id="speaker-btn" class="control active" type="button" disabled aria-label="Toggle speaker"><span class="control-icon" id="speaker-icon">${ICONS.speaker}</span><span id="speaker-label">Speaker</span></button>
  </div>
  <p class="info" id="info" role="status" aria-live="polite">Pick a role, then call. The other phone picks the opposite one.</p>
 </section>
 <footer>Local prototype over LiveKit — not a cellular call.</footer>
 <div id="audio-container" aria-hidden="true"></div>
</main>`;

function setInfo(message, isError = false) { $('info').textContent = message; $('info').classList.toggle('error', isError); }
function formatElapsed(seconds) { const m = Math.floor(seconds / 60); const s = seconds % 60; return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`; }
function updateTimer() { $('call-timer').textContent = connectedAt ? formatElapsed(Math.floor((Date.now() - connectedAt) / 1000)) : '00:00'; }
function updateRole() {
  $('role-caller').classList.toggle('selected', selectedRole === 'caller');
  $('role-receiver').classList.toggle('selected', selectedRole === 'receiver');
  $('peer-title').textContent = selectedRole === 'caller' ? 'Receiver' : 'Caller';
  $('role-caller').disabled = joined || connecting;
  $('role-receiver').disabled = joined || connecting;
  const url = new URL(location.href); url.searchParams.set('role', selectedRole); history.replaceState(null, '', url);
}
function setState(state) {
  const busy = state === 'connecting'; joined = state === 'connected'; connecting = busy;
  $('join-btn').disabled = busy;
  $('join-label').textContent = busy ? 'Connecting…' : joined ? 'End' : 'Call';
  $('join-icon').innerHTML = joined ? ICONS.hangup : ICONS.call;
  $('join-btn').setAttribute('aria-label', joined ? 'Hang up' : 'Start audio call');
  $('join-btn').classList.toggle('hangup', joined);
  $('mute-btn').disabled = !joined;
  $('speaker-btn').disabled = !joined;
  $('top-status').textContent = busy ? 'Connecting' : joined ? 'Connected' : 'Ready';
  $('connection-tag').classList.toggle('connected', joined);
  $('wave').classList.toggle('live', joined);
  updateRole();
  if (!joined) { clearInterval(timer); timer = null; clearInterval(meterTimer); meterTimer = null; $('wave').style.setProperty('--level', 0); connectedAt = 0; updateTimer(); }
}
function findPeer() { return room && [...room.remoteParticipants.values()].find(p => p.identity === (selectedRole === 'caller' ? 'receiver' : 'caller')); }
// Meter shows the other phone's real audio level, not a decorative animation.
function updateMeter() { const peer = findPeer(); $('wave').style.setProperty('--level', peer ? Math.min(1, peer.audioLevel * 3).toFixed(3) : 0); }
function refreshPeerStatus() {
  if (!room || !joined) return;
  const peer = findPeer();
  $('peer-subtitle').textContent = peer ? 'Audio call connected' : 'Waiting for other phone to join';
  if (peer) setInfo('Connected. You can hear and speak to the other phone.');
  else setInfo('Connected to LiveKit. Waiting for the other phone to join.');
}
function detachAll() { for (const [track, el] of audioElements) { try { track.detach(el); el.remove(); } catch {} } audioElements.clear(); }
function attachTrack(track, _publication, participant) {
  if (track.kind !== Track.Kind.Audio || !['caller','receiver'].includes(participant.identity)) return;
  if (audioElements.has(track)) return;
  const el = track.attach(); el.autoplay = true; el.playsInline = true; el.muted = !speakerEnabled;
  $('audio-container').appendChild(el); audioElements.set(track, el);
  el.play().catch(() => setInfo('Tap Speaker to turn sound on — mobile browsers need an extra tap.', true));
}
function detachTrack(track) { const el = audioElements.get(track); if (el) { track.detach(el); el.remove(); audioElements.delete(track); } }
async function startCall() {
  setState('connecting');
  setInfo('Requesting microphone permission…');
  let micTrack = null;
  let phase = 'microphone';
  try {
    // This call is invoked immediately in the button's click event, before
    // token-fetch and network awaits. Important for permission on iOS Safari.
    micTrack = await createLocalAudioTrack({
      echoCancellation: true, noiseSuppression: true, autoGainControl: true,
    });
    phase = 'token';
    setInfo('Microphone ready. Getting call credentials…');
    const response = await fetch(`/api/token?role=${encodeURIComponent(selectedRole)}`, { cache: 'no-store' });
    const payload = await response.json();
    if (!response.ok) throw Error(payload.error || `Token request failed (${response.status})`);
    phase = 'connection';
    const newRoom = new Room({
      adaptiveStream: false, dynacast: false,
      singlePeerConnection: false,
    });
    room = newRoom;
    newRoom.on(RoomEvent.TrackSubscribed, attachTrack);
    newRoom.on(RoomEvent.TrackUnsubscribed, detachTrack);
    newRoom.on(RoomEvent.ParticipantConnected, refreshPeerStatus);
    newRoom.on(RoomEvent.ParticipantDisconnected, refreshPeerStatus);
    newRoom.on(RoomEvent.Disconnected, () => {
      if (room === newRoom) { room = null; detachAll(); setState('idle'); $('peer-subtitle').textContent = 'Call ended'; setInfo('Call ended. You can start another call.'); }
    });
    await newRoom.connect(payload.url, payload.token);
    phase = 'publish microphone';
    await newRoom.localParticipant.publishTrack(micTrack, { source: Track.Source.Microphone });
    micTrack = null; // Owned by LiveKit until the room disconnects.
    connectedAt = Date.now();
    setState('connected');
    timer = setInterval(updateTimer, 1000);
    meterTimer = setInterval(updateMeter, 100);
    updateTimer(); refreshPeerStatus();
    $('mute-label').textContent = 'Mute'; $('mic-icon').innerHTML = ICONS.mic; $('mute-btn').classList.remove('off');
    if (!newRoom.canPlaybackAudio) setInfo('Connected. Tap Speaker to hear the other phone.');
  } catch (error) {
    if (micTrack) micTrack.stop();
    const failedRoom = room; room = null;
    if (failedRoom) await failedRoom.disconnect().catch(() => {});
    detachAll(); setState('idle');
    $('peer-subtitle').textContent = 'Unable to connect';
    const reason = error?.message || String(error);
    setInfo(`Failed during ${phase}: ${reason}`, true);
  }
}
async function hangUp() { const previous = room; room = null; if (previous) await previous.disconnect(); detachAll(); setState('idle'); $('peer-subtitle').textContent = 'Call ended'; setInfo('Call ended. The other phone remains connected until it hangs up.'); }
$('join-btn').addEventListener('click', async () => { if (joined) await hangUp(); else if (!connecting) await startCall(); });
$('role-caller').addEventListener('click', () => { if (!joined && !connecting) { selectedRole = 'caller'; updateRole(); } });
$('role-receiver').addEventListener('click', () => { if (!joined && !connecting) { selectedRole = 'receiver'; updateRole(); } });
$('mute-btn').addEventListener('click', async () => {
  if (!room) return;
  const enabled = !room.localParticipant.isMicrophoneEnabled;
  try { await room.localParticipant.setMicrophoneEnabled(enabled); $('mute-label').textContent = enabled ? 'Mute' : 'Unmute'; $('mic-icon').innerHTML = enabled ? ICONS.mic : ICONS.micOff; $('mute-btn').classList.toggle('off', !enabled); }
  catch (error) { setInfo(`Microphone error: ${error.message}`, true); }
});
$('speaker-btn').addEventListener('click', async () => {
  if (room && !room.canPlaybackAudio) {
    try { await room.startAudio(); } catch (error) { setInfo(`Audio playback blocked: ${error.message}`, true); }
  }
  speakerEnabled = !speakerEnabled;
  for (const el of audioElements.values()) { el.muted = !speakerEnabled; if (speakerEnabled) await el.play().catch(() => {}); }
  $('speaker-label').textContent = speakerEnabled ? 'Speaker' : 'Speaker off';
  $('speaker-icon').innerHTML = speakerEnabled ? ICONS.speaker : ICONS.speakerOff;
  $('speaker-btn').classList.toggle('off', !speakerEnabled);
  $('speaker-btn').classList.toggle('active', speakerEnabled);
});
window.addEventListener('pagehide', () => { if (room) room.disconnect(); });
updateRole(); setState('idle');

// Receiver-side risk display (read-only; no audio is sent from the browser).
// This local prototype does not authenticate users; the endpoint is LAN-visible.
async function updateDetection() {
  const panel = $('detector-panel');
  panel.hidden = selectedRole !== 'receiver';
  if (panel.hidden) return;
  try {
    const response = await fetch('/api/detection', {cache:'no-store'});
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const d = await response.json();
    const hasResult = !!d.verdict && typeof d.p_fake === 'number';
    const resultAgeMs = typeof d.last_result_at === 'number'
      ? Math.max(0, Date.now() - d.last_result_at * 1000) : Infinity;
    const audioAgeMs = (d.sample_age_ms || 0) + resultAgeMs;
    const delayed = !!d.stale || audioAgeMs > 10000;
    const working = d.status === 'analyzing';
    const valid = hasResult && !delayed && d.status !== 'offline' && d.status !== 'error';
    panel.classList.toggle('risk-high', valid && d.alert && d.verdict === 'FAKE');
    panel.classList.toggle('risk-low', valid && d.verdict === 'REAL');
    $('detector-state').textContent = d.status === 'offline' ? 'Offline'
      : d.status === 'error' ? 'Error'
      : hasResult && delayed ? 'Delayed result'
      : valid && d.alert ? 'Elevated risk'
      : valid ? 'Monitoring live'
      : working ? 'Analyzing…' : 'Listening';
    if (hasResult) {
      const labels = {
        FAKE:'Repeated synthetic-voice indicators — verify caller identity',
        REAL:'No strong synthetic indicators in recent audio',
        UNSURE:'Inconclusive — verify independently'
      };
      $('detector-message').textContent = delayed
        ? 'Previous result is too old for a live warning. Still listening.'
        : `${labels[d.verdict]}${working ? ' · Newer audio is being analyzed' : ''}`;
      $('detector-score').textContent = `Raw score: ${d.p_fake.toFixed(3)} · model ${Math.round(d.model_ms||0)} ms · audio age ${Math.round(audioAgeMs)} ms · dropped ${d.dropped||0}`;
    } else {
      $('detector-message').textContent = d.message || 'Listening for caller audio…';
      $('detector-score').textContent = 'First result after 4 seconds of caller audio';
    }
  } catch(e) {
    $('detector-state').textContent = 'Offline';
    $('detector-message').textContent = 'Cannot reach detection status service';
    $('detector-score').textContent = 'No current model result';
  }
}
updateDetection();
setInterval(updateDetection, 350);

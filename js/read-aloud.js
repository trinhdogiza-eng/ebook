// Đọc to bằng giọng có sẵn của máy (Web Speech API: speechSynthesis).
// - Đọc từng câu ngắn (tránh lỗi trình duyệt cắt câu dài), câu sau nối tiếp câu trước.
// - "Tạm dừng" = huỷ câu đang đọc và nhớ lại; "Tiếp tục" = đọc lại câu đó (ổn định hơn pause()/resume()
//   vốn hay lỗi trên Android).
// - Giữ màn hình sáng trong lúc đọc (Wake Lock) để máy không tắt màn hình làm dừng giọng đọc.

export const ttsSupported = typeof window !== 'undefined'
  && 'speechSynthesis' in window && 'SpeechSynthesisUtterance' in window;

export const voices = () => (ttsSupported ? speechSynthesis.getVoices() : []);
export const isVietnamese = (v) => /^vi([-_]|$)/i.test(v.lang || '');

// Giọng đã chọn → giọng tiếng Việt "tự nhiên" (Natural/Online/Neural) → giọng tiếng Việt bất kỳ
export function pickVoice(uri) {
  const vs = voices();
  return vs.find((v) => v.voiceURI === uri)
    || vs.find((v) => isVietnamese(v) && /natural|online|neural|premium|enhanced/i.test(v.name))
    || vs.find(isVietnamese)
    || null;
}

// iPhone/iPad chỉ cho phát giọng nếu lần đầu được gọi ngay trong thao tác chạm của người dùng
export function unlockSpeech() {
  if (!ttsSupported) return;
  try {
    const u = new SpeechSynthesisUtterance(' ');
    u.volume = 0;
    speechSynthesis.speak(u);
  } catch { /* bỏ qua */ }
}

// Tách đoạn văn thành câu ngắn: trả về [[đầu, cuối], ...] theo vị trí ký tự
// Chỉ ngắt câu khi dấu câu đứng trước khoảng trắng hoặc cuối đoạn → "com.vn", "3.5" không bị tách.
export function splitSentences(text, max = 220) {
  const out = [];
  const re = /[.!?…。]+["”’»)\]]*(?=\s|$)/g;
  const push = (s, e) => {
    while (s < e && /\s/.test(text[s])) s++;
    while (e - s > max) { // câu quá dài → cắt ở dấu phẩy / chấm phẩy / khoảng trắng gần nhất
      const chunk = text.slice(s, s + max);
      let cut = Math.max(chunk.lastIndexOf(', '), chunk.lastIndexOf('; '), chunk.lastIndexOf(': '));
      if (cut < max * 0.4) cut = chunk.lastIndexOf(' ');
      if (cut < max * 0.4) cut = max - 1;
      out.push([s, s + cut + 1]);
      s += cut + 1;
    }
    if (/[\p{L}\p{N}]/u.test(text.slice(s, e))) out.push([s, e]);
  };
  let start = 0;
  let m;
  while ((m = re.exec(text))) {
    const e = m.index + m[0].length;
    // "16." / "IV." (số chương) không phải hết câu → gộp với phần sau
    if (/^\s*([\d]+|[IVXLC]+)[.)]\s*$/.test(text.slice(start, e))) continue;
    push(start, e);
    start = e;
  }
  if (start < text.length) push(start, text.length);
  return out;
}

// Âm thanh "im lặng" phát lặp trong lúc đọc to: Android coi app như đang phát nhạc nên không đóng băng
// trang khi khoá màn hình / chuyển app → giọng đọc vẫn đọc tiếp các câu sau. Tín hiệu cực nhỏ (≈ -90 dB),
// tai người không nghe thấy, nhưng không phải số 0 tuyệt đối (để hệ thống tính là "đang phát âm thanh").
let keepAliveUrl = null;
function keepAliveSrc() {
  if (keepAliveUrl) return keepAliveUrl;
  const rate = 8000, n = rate * 2; // 2 giây
  const buf = new ArrayBuffer(44 + n * 2);
  const v = new DataView(buf);
  const str = (o, s) => { for (let i = 0; i < s.length; i++) v.setUint8(o + i, s.charCodeAt(i)); };
  str(0, 'RIFF'); v.setUint32(4, 36 + n * 2, true); str(8, 'WAVE'); str(12, 'fmt ');
  v.setUint32(16, 16, true); v.setUint16(20, 1, true); v.setUint16(22, 1, true);
  v.setUint32(24, rate, true); v.setUint32(28, rate * 2, true); v.setUint16(32, 2, true); v.setUint16(34, 16, true);
  str(36, 'data'); v.setUint32(40, n * 2, true);
  for (let i = 0; i < n; i++) v.setInt16(44 + i * 2, i % 2 ? 1 : -1, true);
  keepAliveUrl = URL.createObjectURL(new Blob([buf], { type: 'audio/wav' }));
  return keepAliveUrl;
}

// Một thẻ <audio> dùng chung cho mọi bộ đọc: được "mở khoá" khi người dùng bấm 🔊, nên về sau (kể cả khi
// đã khoá màn hình) vẫn phát tiếp được mà không cần chạm thêm.
let shared = null;
export function sharedPlayer() {
  if (!shared) {
    shared = new Audio();
    shared.preload = 'auto';
    shared.setAttribute('playsinline', '');
  }
  return shared;
}
function playSilence(owner) {
  const p = sharedPlayer();
  p.owner = owner;
  p.loop = true;
  if (p.src !== keepAliveSrc()) p.src = keepAliveSrc();
  p.play().catch(() => {});
}

export class Speaker {
  // opts: { getRate(), getVoiceURI(), onSegment(seg), onState(state, event), getMeta() → {title, artist, album, artwork} }
  constructor(opts) {
    Object.assign(this, opts);
    this.state = 'idle'; // idle | playing | paused
    this.gen = 0;
    this.current = null;
  }

  async start(provider) {
    this.stop(true);
    this.provider = provider;
    this.state = 'playing';
    this.keepAlive(true); // phải gọi ngay trong lúc người dùng bấm nút (trình duyệt mới cho phát âm thanh)
    this.setupMediaSession();
    this.lockScreen();
    this.emit();
    await this.advance(++this.gen);
  }

  keepAlive(on) {
    try {
      const p = sharedPlayer();
      if (!on) { if (p.owner === this) p.pause(); return; }
      playSilence(this);
    } catch { /* bỏ qua */ }
  }
  get audio() { return sharedPlayer(); }

  // Điều khiển trên màn hình khoá / thanh thông báo (Android): Phát, Tạm dừng, Dừng
  setupMediaSession() {
    const ms = navigator.mediaSession;
    if (!ms) return;
    try {
      const m = this.getMeta?.() || {};
      if (window.MediaMetadata) {
        ms.metadata = new MediaMetadata({
          title: m.title || 'Đọc EPUB', artist: m.artist || '', album: m.album || '',
          artwork: m.artwork ? [{ src: m.artwork, sizes: '512x512' }] : [{ src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png' }],
        });
      }
      // Gắn lại mỗi lần (có 2 bộ đọc: giọng máy và giọng Google — nút trên màn hình khoá điều khiển bộ đang dùng)
      const set = (a, fn) => { try { ms.setActionHandler(a, fn); } catch { /* không hỗ trợ */ } };
      set('play', () => this.resume());
      set('pause', () => this.pause());
      set('stop', () => this.stop());
      ms.playbackState = 'playing';
    } catch { /* bỏ qua */ }
  }
  updateMediaState() {
    try {
      if (navigator.mediaSession) navigator.mediaSession.playbackState = this.state === 'playing' ? 'playing' : this.state === 'paused' ? 'paused' : 'none';
    } catch { /* bỏ qua */ }
  }

  async advance(gen) {
    if (gen !== this.gen || this.state !== 'playing') return;
    let seg = null;
    try { seg = await this.provider.next(); } catch (e) { console.warn('Đọc to:', e); }
    if (gen !== this.gen || this.state !== 'playing') return;
    if (!seg) { this.finish(); return; }
    this.current = seg;
    this.speak(seg, gen);
  }

  speak(seg, gen) {
    const u = new SpeechSynthesisUtterance(seg.text);
    const v = pickVoice(this.getVoiceURI());
    if (v) { u.voice = v; u.lang = v.lang; } else u.lang = 'vi-VN';
    u.rate = this.getRate();
    let started = false;
    const markStart = () => { if (!started && gen === this.gen) { started = true; this.onSegment?.(seg); } };
    u.onstart = markStart;
    u.onend = () => { markStart(); if (gen === this.gen && this.state === 'playing') this.advance(gen); };
    u.onerror = (e) => {
      if (gen !== this.gen || e.error === 'interrupted' || e.error === 'canceled') return;
      console.warn('Đọc to lỗi:', e.error);
      if (this.state === 'playing') this.advance(gen); // bỏ qua câu lỗi, đọc tiếp
    };
    this.utter = u; // giữ tham chiếu (Chrome có lỗi tự huỷ câu đang đọc nếu bị dọn bộ nhớ)
    speechSynthesis.speak(u);
    setTimeout(markStart, 250); // vài máy không phát sự kiện onstart
  }

  pause() {
    if (this.state !== 'playing') return;
    this.state = 'paused';
    this.gen++;
    speechSynthesis.cancel();
    this.keepAlive(false);
    this.unlockScreen();
    this.emit();
  }

  resume() {
    if (this.state !== 'paused') return;
    this.state = 'playing';
    const gen = ++this.gen;
    this.keepAlive(true);
    this.lockScreen();
    this.emit();
    if (this.current) this.speak(this.current, gen); else this.advance(gen);
  }

  // Đổi tốc độ / giọng: đọc lại câu hiện tại với cài đặt mới
  refresh() {
    if (this.state !== 'playing' || !this.current) return;
    const gen = ++this.gen;
    speechSynthesis.cancel();
    this.speak(this.current, gen);
  }

  stop(silent) {
    this.gen++;
    const was = this.state;
    this.state = 'idle';
    this.current = null;
    if (ttsSupported) speechSynthesis.cancel();
    this.keepAlive(false);
    this.unlockScreen();
    if (!silent && was !== 'idle') this.emit('stop');
    else this.updateMediaState();
  }

  finish() {
    this.state = 'idle';
    this.current = null;
    this.keepAlive(false);
    this.unlockScreen();
    this.emit('end');
  }

  emit(ev) { this.updateMediaState(); this.onState?.(this.state, ev); }

  async lockScreen() {
    try { if (!this.wake && navigator.wakeLock) this.wake = await navigator.wakeLock.request('screen'); } catch { /* không hỗ trợ */ }
  }
  unlockScreen() {
    const w = this.wake;
    this.wake = null;
    w?.release?.().catch(() => {});
  }
}

/* ================= Giọng Google Cloud (đọc được khi khoá màn hình) ================= */
// Giọng có sẵn của Chrome Android bị dừng khi khoá màn hình. Giọng Google Cloud trả về tệp âm thanh MP3,
// phát bằng thẻ <audio> như một bài nhạc → Android/iOS cho phát tiếp ở nền, có điều khiển trên màn hình khoá.
const GTTS = 'https://texttospeech.googleapis.com/v1';
const AHEAD = 3; // số câu chuẩn bị trước để không bị ngắt quãng

export const GOOGLE_DEFAULT_VOICE = 'vi-VN-Wavenet-A';

// Danh sách giọng tiếng Việt (gọi API): [{ name, gender, tier }]
export async function googleVoices(key) {
  const r = await fetch(`${GTTS}/voices?languageCode=vi-VN&key=${encodeURIComponent(key)}`);
  const j = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(googleError(r.status, j));
  const tier = (n) => (/Chirp3|Chirp-HD/i.test(n) ? 'Chirp HD' : /Neural2/i.test(n) ? 'Neural2' : /Wavenet/i.test(n) ? 'WaveNet' : /Standard/i.test(n) ? 'Standard' : 'Khác');
  const rank = { 'WaveNet': 0, 'Neural2': 1, 'Chirp HD': 2, 'Standard': 3, 'Khác': 4 };
  return (j.voices || [])
    .filter((v) => (v.languageCodes || []).some((c) => /^vi/i.test(c)))
    .map((v) => ({ name: v.name, gender: v.ssmlGender === 'FEMALE' ? 'nữ' : v.ssmlGender === 'MALE' ? 'nam' : '', tier: tier(v.name) }))
    .sort((a, b) => rank[a.tier] - rank[b.tier] || a.name.localeCompare(b.name));
}

function googleError(status, j) {
  const msg = j?.error?.message || '';
  if (status === 400 && /API key not valid/i.test(msg)) return 'Khoá Google không hợp lệ';
  if (status === 403 && /billing/i.test(msg)) return 'Project Google Cloud chưa bật thanh toán';
  if (status === 403 && /(not been used|disabled)/i.test(msg)) return 'Chưa bật Cloud Text-to-Speech API';
  if (status === 403) return 'Khoá Google không được phép dùng ở trang này';
  if (status === 429) return 'Đã hết hạn mức giọng Google (thử lại sau)';
  return msg || `Lỗi Google ${status}`;
}

async function googleSynth(key, voice, text) {
  const r = await fetch(`${GTTS}/text:synthesize?key=${encodeURIComponent(key)}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      input: { text },
      voice: { languageCode: 'vi-VN', name: voice },
      audioConfig: { audioEncoding: 'MP3' },
    }),
  });
  const j = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(googleError(r.status, j));
  const bin = atob(j.audioContent || '');
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return URL.createObjectURL(new Blob([bytes], { type: 'audio/mpeg' }));
}

export class CloudSpeaker extends Speaker {
  // opts thêm: getKey(), getGoogleVoice(), onError(message)
  constructor(opts) {
    super(opts);
    this.ahead = [];
    this.player = sharedPlayer();
    this.player.addEventListener('ended', () => {
      if (this.player.owner === this && !this.player.loop && this.state === 'playing') this.playNext(this.gen);
    });
  }

  // Tạo âm thanh cho 1 câu → Promise<blob URL>. Lớp con (giọng AI) thay bằng cách tạo khác.
  synth(text) { return googleSynth(this.getKey(), this.getGoogleVoice(), text); }

  async start(provider) {
    this.stop(true);
    this.provider = provider;
    this.done = false;
    this.errors = 0;
    this.state = 'playing';
    // Phát âm thanh im lặng trong lúc chuẩn bị câu đầu: giữ app "đang phát" và giữ quyền phát âm thanh
    playSilence(this);
    this.setupMediaSession();
    this.lockScreen();
    this.emit();
    await this.playNext(++this.gen);
  }

  // Chuẩn bị trước vài câu: lấy câu từ sách và gửi Google tạo âm thanh song song
  async fill() {
    if (this.filling) return this.filling;
    const gen = this.gen;
    this.filling = (async () => {
      while (gen === this.gen && !this.done && this.ahead.length < AHEAD) {
        let seg = null;
        try { seg = await this.provider.next(); } catch (e) { console.warn('Đọc to:', e); }
        if (gen !== this.gen) return;
        if (!seg) { this.done = true; break; }
        const item = { seg };
        item.url = this.synth(seg.text).catch((e) => { item.err = e; return null; });
        this.ahead.push(item);
      }
    })();
    try { await this.filling; } finally { this.filling = null; }
  }

  async playNext(gen) {
    if (gen !== this.gen || this.state !== 'playing') return;
    if (!this.ahead.length) await this.fill();
    if (gen !== this.gen || this.state !== 'playing') return;
    const item = this.ahead.shift();
    if (!item) { this.finish(); return; }
    this.fill();
    const url = await item.url;
    if (gen !== this.gen) { if (url) URL.revokeObjectURL(url); return; }
    if (!url) {
      this.onError?.(item.err?.message || 'Không tạo được giọng Google');
      if (++this.errors >= 2) { this.stop(); return; }
      this.playNext(gen);
      return;
    }
    this.errors = 0;
    if (this.curUrl) URL.revokeObjectURL(this.curUrl);
    this.curUrl = url;
    this.current = item.seg;
    const p = this.player;
    p.owner = this;
    p.loop = false;
    p.src = url;
    p.defaultPlaybackRate = this.getRate();
    p.playbackRate = this.getRate();
    try { await p.play(); } catch (e) { console.warn('Không phát được', e); }
    this.onSegment?.(item.seg);
  }

  pause() {
    if (this.state !== 'playing') return;
    this.state = 'paused';
    if (this.player.owner === this) this.player.pause();
    this.unlockScreen();
    this.emit();
  }

  resume() {
    if (this.state !== 'paused') return;
    this.state = 'playing';
    this.lockScreen();
    this.emit();
    if (this.current && this.player.owner === this && !this.player.loop) this.player.play().catch(() => {});
    else this.playNext(this.gen);
  }

  // Đổi tốc độ: áp dụng ngay; đổi giọng: tạo lại âm thanh cho các câu đã chuẩn bị
  refresh(voiceChanged) {
    this.player.defaultPlaybackRate = this.getRate();
    this.player.playbackRate = this.getRate();
    if (voiceChanged) {
      this.ahead.forEach((it) => it.url.then((u) => u && URL.revokeObjectURL(u)));
      this.ahead = this.ahead.map(({ seg }) => {
        const item = { seg };
        item.url = this.synth(seg.text).catch((e) => { item.err = e; return null; });
        return item;
      });
    }
  }

  clearAhead() {
    this.ahead.forEach((it) => it.url.then((u) => u && URL.revokeObjectURL(u)));
    this.ahead = [];
  }

  stop(silent) {
    this.gen++;
    const was = this.state;
    this.state = 'idle';
    this.current = null;
    if (this.player.owner === this) this.player.pause();
    this.clearAhead();
    if (this.curUrl) { URL.revokeObjectURL(this.curUrl); this.curUrl = null; }
    this.unlockScreen();
    if (!silent && was !== 'idle') this.emit('stop');
    else this.updateMediaState();
  }

  finish() {
    this.state = 'idle';
    this.current = null;
    if (this.player.owner === this) this.player.pause();
    this.unlockScreen();
    this.emit('end');
  }
}

/* ================= Giọng AI chạy trong máy (Piper) — dùng khi khoá màn hình / chuyển app ================= */
// Piper (mã nguồn mở) chạy ngay trong trình duyệt bằng WebAssembly; giọng tiếng Việt tải 1 lần từ Hugging Face
// rồi lưu trong máy (OPFS), sau đó dùng được cả khi không có mạng.
const PIPER = 'https://cdn.jsdelivr.net/npm/@mintplex-labs/piper-tts-web@1.0.5/+esm';
const PIPER_WASM = 'https://cdn.jsdelivr.net/npm/@diffusionstudio/piper-wasm@1.0.0/build/piper_phonemize';
const ORT_WASM = 'https://cdn.jsdelivr.net/npm/onnxruntime-web@1.27.0/dist/'; // khớp phiên bản onnxruntime mà gói +esm dùng

export const AI_VOICES = {
  'vi_VN-vais1000-medium': { label: 'Giọng AI rõ, tự nhiên', size: '63 MB' },
  'vi_VN-vivos-x_low': { label: 'Giọng AI nhẹ, nhanh (máy yếu)', size: '28 MB' },
};
export const AI_DEFAULT_VOICE = 'vi_VN-vais1000-medium';

let piper = null;
let piperSession = null;
let piperVoice = null;
let piperChain = Promise.resolve();
const loadPiper = async () => (piper ||= await import(PIPER));

// Đã tải giọng về máy chưa
export async function aiVoiceStored(voiceId) {
  try { return (await (await loadPiper()).stored()).includes(voiceId); } catch { return false; }
}
// Tải trước giọng (chỉ tải tệp, chưa khởi động) — gọi khi đang mở app để lúc khoá màn hình dùng được ngay
export async function aiDownload(voiceId, onProgress) {
  const P = await loadPiper();
  if ((await P.stored()).includes(voiceId)) return;
  await P.download(voiceId, (p) => onProgress?.(p.loaded, p.total));
}
async function aiSession(voiceId) {
  if (piperSession && piperVoice === voiceId) return piperSession;
  const P = await loadPiper();
  P.TtsSession._instance = null; // gói chỉ giữ 1 phiên → tạo phiên mới khi đổi giọng
  piperSession = await P.TtsSession.create({
    voiceId,
    wasmPaths: { onnxWasm: ORT_WASM, piperData: `${PIPER_WASM}.data`, piperWasm: `${PIPER_WASM}.wasm` },
  });
  piperVoice = voiceId;
  return piperSession;
}
// Tạo từng câu một (mô hình không chạy song song được)
function aiSynth(voiceId, text) {
  const run = piperChain.then(async () => {
    const s = await aiSession(voiceId);
    const blob = await s.predict(text);
    return URL.createObjectURL(blob);
  });
  piperChain = run.catch(() => {});
  return run;
}

export class AiSpeaker extends CloudSpeaker {
  // opts thêm: getAiVoice()
  synth(text) { return aiSynth(this.getAiVoice(), text); }
}
